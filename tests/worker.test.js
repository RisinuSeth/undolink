import test from "node:test";
import assert from "node:assert/strict";
import worker from "../_worker.js";

function createEnv() {
  const operations = [];
  return {
    operations,
    DB: {
      prepare(sql) {
        return {
          bind(...values) {
            return {
              async first() {
                if (sql.includes("INSERT INTO rate_limits")) return { count: 1 };
                return null;
              },
              async run() {
                operations.push({ sql, values });
                return { meta: { changes: 1 } };
              },
              async all() {
                return { results: [] };
              }
            };
          }
        };
      }
    },
    ASSETS: {
      async fetch() {
        return new Response("asset not found", { status: 404 });
      }
    }
  };
}

function createRequest(body, options = {}) {
  return new Request("https://undolink.test/api/links", {
    method: "POST",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

async function postLink(body, env = createEnv()) {
  const response = await worker.fetch(createRequest(body), env);
  return { response, data: await response.json(), env };
}

test("rejects malformed JSON without touching the database", async () => {
  const env = createEnv();
  const { response, data } = await postLink("{", env);
  assert.equal(response.status, 400);
  assert.match(data.error, /valid link request/i);
  assert.equal(env.operations.length, 0);
});

test("rejects non-HTTP destination protocols", async () => {
  for (const destination of ["javascript:alert(1)", "file:///etc/passwd", "ftp://example.com/file"]) {
    const { response } = await postLink({ destination, expiresIn: 3600 });
    assert.equal(response.status, 400, destination);
  }
});

test("rejects destination URLs containing embedded credentials", async () => {
  const { response, data } = await postLink({
    destination: "https://user:password@example.com/private",
    expiresIn: 3600
  });
  assert.equal(response.status, 400);
  assert.match(data.error, /embedded login details/i);
});

test("rejects unsupported expiry durations and click limits", async () => {
  const invalidExpiry = await postLink({
    destination: "https://example.com",
    expiresIn: 123
  });
  assert.equal(invalidExpiry.response.status, 400);

  const invalidClicks = await postLink({
    destination: "https://example.com",
    expiresIn: 3600,
    maxClicks: 3
  });
  assert.equal(invalidClicks.response.status, 400);
});

test("rejects invalid custom slugs and reserved paths", async () => {
  for (const customSlug of ["ab", "bad_slug", "admin", "support"]) {
    const { response } = await postLink({
      destination: "https://example.com",
      expiresIn: 3600,
      customSlug
    });
    assert.equal(response.status, 400, customSlug);
  }
});

test("normalizes custom slugs to lowercase", async () => {
  const { response, data, env } = await postLink({
    destination: "https://example.com",
    expiresIn: 3600,
    customSlug: "My-Link"
  });
  assert.equal(response.status, 200);
  assert.equal(data.slug, "my-link");
  const insert = env.operations.find(({ sql }) => sql.includes("INSERT INTO links"));
  assert.equal(insert.values[1], "my-link");
});

test("creates a valid link and returns a private management key", async () => {
  const { response, data, env } = await postLink({
    destination: "https://example.com/a?b=1",
    expiresIn: 3600,
    maxClicks: 5
  });

  assert.equal(response.status, 200);
  assert.match(data.slug, /^[a-z0-9-]{4,24}$/);
  assert.equal(data.url, `https://undolink.test/${data.slug}`);
  assert.match(data.manageKey, /^[a-f0-9]{64}$/);
  assert.ok(data.expiresAt > Date.now());
  assert.ok(env.operations.some(({ sql }) => sql.includes("INSERT INTO links")));
});

test("rejects link passwords outside the supported length", async () => {
  const { response, data } = await postLink({
    destination: "https://example.com",
    expiresIn: 3600,
    password: "short"
  });
  assert.equal(response.status, 400);
  assert.match(data.error, /password must be between 6 and 64/i);
});

async function sha256Hex(value) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
async function passwordHash(password, saltHex) {
  const salt = Uint8Array.from(saltHex.match(/.{2}/g), part => parseInt(part, 16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return [...new Uint8Array(bits)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
function createStatefulEnv({ links = [], sessions = [] } = {}) {
  const state = {
    links: new Map(links.map(link => [link.slug, { clicks: 0, max_clicks: null, disabled_at: null, paused_at: null, starts_at: null, password_hash: null, password_salt: null, ...link }])),
    sessions: new Map(sessions.map(session => [session.token_hash, session])), clicks: []
  };
  return {
    state,
    ASSETS: { async fetch() { return new Response("asset not found", { status: 404 }); } },
    DB: {
      prepare(sql) {
        return {
          values: [],
          bind(...values) { this.values = values; return this; },
          async first() {
            const v = this.values;
            if (sql.includes("FROM sessions JOIN users")) {
              const s = state.sessions.get(v[0]);
              return s && s.expires_at > v[1] ? { id: s.user_id, email: s.email, session_id: s.id } : null;
            }
            if (sql.includes("SELECT id,manage_token_hash,user_id FROM links")) {
              const l = state.links.get(v[0]);
              return l ? { id: l.id, manage_token_hash: l.manage_token_hash, user_id: l.user_id } : null;
            }
            if (sql.includes("SELECT id, password_salt, password_hash, starts_at, paused_at FROM links")) {
              const l = state.links.get(v[0]);
              if (!l || l.disabled_at !== null || l.expires_at <= v[1] || (l.max_clicks !== null && l.clicks >= l.max_clicks)) return null;
              return { id: l.id, password_salt: l.password_salt, password_hash: l.password_hash, starts_at: l.starts_at, paused_at: l.paused_at };
            }
            if (sql.includes("SELECT id, password_hash, starts_at, paused_at FROM links")) {
              const l = state.links.get(v[0]);
              if (!l || l.disabled_at !== null || l.expires_at <= v[1] || (l.max_clicks !== null && l.clicks >= l.max_clicks)) return null;
              return { id: l.id, password_hash: l.password_hash, starts_at: l.starts_at, paused_at: l.paused_at };
            }
            if (sql.includes("UPDATE links SET clicks=clicks+1")) {
              const l = sql.includes("WHERE slug=?") ? state.links.get(v[0]) : [...state.links.values()].find(item => item.id === v[0]);
              if (!l || l.disabled_at !== null || l.paused_at !== null || (l.starts_at !== null && l.starts_at > v[1]) ||
                  l.expires_at <= v[2] || (l.max_clicks !== null && l.clicks >= l.max_clicks)) return null;
              l.clicks += 1;
              return { id: l.id, destination_url: l.destination_url };
            }
            if (sql.includes("SELECT id, clicks, max_clicks, expires_at, disabled_at, password_hash, starts_at, paused_at FROM links")) {
              const l = state.links.get(v[0]);
              return l ? { id: l.id, clicks: l.clicks, max_clicks: l.max_clicks, expires_at: l.expires_at, disabled_at: l.disabled_at, password_hash: l.password_hash, starts_at: l.starts_at, paused_at: l.paused_at } : null;
            }
            return null;
          },
          async run() {
            const v = this.values;
            if (sql.includes("INSERT INTO link_clicks")) state.clicks.push({ link_id: v[0], clicked_at: v[1] });
            if (sql.includes("UPDATE links SET disabled_at")) { const l = state.links.get(v[1]); if (l && l.disabled_at === null) l.disabled_at = v[0]; }
            if (sql.includes("UPDATE links SET paused_at")) { const l = state.links.get(v[1]); if (l && l.disabled_at === null) l.paused_at = v[0]; }
            return { meta: { changes: 1 } };
          },
          async all() { return { results: [] }; }
        };
      }
    }
  };
}
function linkRecord(overrides = {}) {
  return {
    id: "link-1", slug: "test-link", destination_url: "https://destination.example/path",
    expires_at: Math.floor(Date.now() / 1000) + 3600, max_clicks: null, clicks: 0,
    disabled_at: null, paused_at: null, starts_at: null, password_hash: null,
    password_salt: null, manage_token_hash: null, user_id: null, ...overrides
  };
}

test("expired links never redirect or increment clicks", async () => {
  const env = createStatefulEnv({ links: [linkRecord({ expires_at: Math.floor(Date.now() / 1000) - 10 })] });
  const response = await worker.fetch(new Request("https://undolink.test/test-link"), env);
  assert.equal(response.status, 404);
  assert.equal(env.state.links.get("test-link").clicks, 0);
});
test("click limit allows only the configured number of redirects", async () => {
  const env = createStatefulEnv({ links: [linkRecord({ max_clicks: 1 })] });
  const first = await worker.fetch(new Request("https://undolink.test/test-link"), env);
  assert.equal(first.status, 302);
  assert.equal(first.headers.get("location"), "https://destination.example/path");
  assert.equal(env.state.links.get("test-link").clicks, 1);
  const second = await worker.fetch(new Request("https://undolink.test/test-link"), env);
  assert.equal(second.status, 404);
  assert.equal(env.state.links.get("test-link").clicks, 1);
});
test("password-protected links reject incorrect passwords and unlock correctly", async () => {
  const salt = "0123456789abcdef0123456789abcdef";
  const hash = await passwordHash("correct-horse", salt);
  const env = createStatefulEnv({ links: [linkRecord({ password_salt: salt, password_hash: hash })] });
  const landing = await worker.fetch(new Request("https://undolink.test/test-link"), env);
  assert.equal(landing.status, 200);
  assert.match(await landing.text(), /This link is protected/);
  assert.equal(env.state.links.get("test-link").clicks, 0);
  const wrongForm = new FormData(); wrongForm.set("password", "not-the-password");
  const wrong = await worker.fetch(new Request("https://undolink.test/api/links/test-link/unlock", { method: "POST", body: wrongForm }), env);
  assert.equal(wrong.status, 401);
  assert.equal(env.state.links.get("test-link").clicks, 0);
  const correctForm = new FormData(); correctForm.set("password", "correct-horse");
  const unlocked = await worker.fetch(new Request("https://undolink.test/api/links/test-link/unlock", { method: "POST", body: correctForm }), env);
  assert.equal(unlocked.status, 302);
  assert.equal(unlocked.headers.get("location"), "https://destination.example/path");
  assert.equal(env.state.links.get("test-link").clicks, 1);
});
test("only the owning account or valid management key can view link controls", async () => {
  const ownerToken = "a".repeat(64), otherToken = "b".repeat(64), manageKey = "c".repeat(64);
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const sessions = [
    { id: "session-owner", user_id: "user-owner", email: "owner@example.com", token_hash: await sha256Hex(ownerToken), expires_at: expires },
    { id: "session-other", user_id: "user-other", email: "other@example.com", token_hash: await sha256Hex(otherToken), expires_at: expires }
  ];
  const env = createStatefulEnv({ links: [linkRecord({ user_id: "user-owner", manage_token_hash: await sha256Hex(manageKey) })], sessions });
  const owner = await worker.fetch(new Request("https://undolink.test/api/links/test-link", { headers: { Cookie: `undolink_session=${ownerToken}` } }), env);
  assert.equal(owner.status, 200);
  const other = await worker.fetch(new Request("https://undolink.test/api/links/test-link", { headers: { Cookie: `undolink_session=${otherToken}` } }), env);
  assert.equal(other.status, 401);
  const guestKey = await worker.fetch(new Request("https://undolink.test/api/links/test-link", { headers: { Authorization: `Bearer ${manageKey}` } }), env);
  assert.equal(guestKey.status, 200);
  const noCredentials = await worker.fetch(new Request("https://undolink.test/api/links/test-link"), env);
  assert.equal(noCredentials.status, 401);
});
test("expired login sessions cannot authorize link management", async () => {
  const sessionToken = "d".repeat(64);
  const env = createStatefulEnv({
    links: [linkRecord({ user_id: "user-owner" })],
    sessions: [{ id: "expired-session", user_id: "user-owner", email: "owner@example.com", token_hash: await sha256Hex(sessionToken), expires_at: Math.floor(Date.now() / 1000) - 1 }]
  });
  const response = await worker.fetch(new Request("https://undolink.test/api/links/test-link", { headers: { Cookie: `undolink_session=${sessionToken}` } }), env);
  assert.equal(response.status, 401);
});
