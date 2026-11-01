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


function createSignupEnv({ failTerms = false } = {}) {
  const state = { users: [], acceptances: [], operations: [] };
  const DB = {
    prepare(sql) {
      const statement = {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.includes("INSERT INTO auth_rate_limits")) return { count: 1 };
          return null;
        },
        async run() {
          state.operations.push({ sql, values: this.values });
          return { meta: { changes: 1 } };
        }
      };
      return statement;
    },
    async batch(statements) {
      const userStatement = statements.find(statement => statement.sql.includes("INSERT INTO users"));
      const termsStatement = statements.find(statement => statement.sql.includes("INSERT INTO terms_acceptances"));
      assert.ok(userStatement, "user insert is part of the transaction");
      assert.ok(termsStatement, "Terms acceptance insert is part of the transaction");
      if (failTerms) throw new Error("Simulated Terms acceptance insert failure");
      state.users.push({ id: userStatement.values[0], email: userStatement.values[1], passwordHash: userStatement.values[3] });
      state.acceptances.push({ id: termsStatement.values[0], userId: termsStatement.values[1], version: termsStatement.values[2] });
      return [{ success: true }, { success: true }];
    }
  };
  return {
    state, DB,
    RESEND_API_KEY: "test-key",
    EMAIL_FROM: "UndoLink <no-reply@example.test>",
    APP_ORIGIN: "https://undolink.test",
    PASSWORD_PEPPER: "a".repeat(64),
    ASSETS: { async fetch() { return new Response("asset not found", { status: 404 }); } }
  };
}

function signupRequest(email = "new-user@example.com") {
  return new Request("https://undolink.test/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": "192.0.2.10" },
    body: JSON.stringify({
      email, password: "correct-horse-battery",
      acceptedTerms: true, termsVersion: "2026-10-31"
    })
  });
}

test("signup commits the user and Terms acceptance together before sending verification email", async () => {
  const env = createSignupEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("{}", { status: 200 });
  try {
    const response = await worker.fetch(signupRequest(), env);
    const data = await response.json();
    assert.equal(response.status, 201);
    assert.equal(data.verificationRequired, true);
    assert.equal(env.state.users.length, 1);
    assert.ok(env.state.users[0].passwordHash.startsWith("v2"));
    assert.equal(env.state.acceptances.length, 1);
    assert.equal(env.state.acceptances[0].userId, env.state.users[0].id);
    assert.equal(env.state.acceptances[0].version, "2026-10-31");
    assert.ok(env.state.operations.some(operation => operation.sql.includes("INSERT INTO email_action_tokens")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("signup rolls back the user when the Terms acceptance insert fails", async () => {
  const env = createSignupEnv({ failTerms: true });
  const response = await worker.fetch(signupRequest("rollback@example.com"), env);
  const data = await response.json();
  assert.equal(response.status, 503);
  assert.match(data.error, /couldn't create your account/i);
  assert.equal(env.state.users.length, 0);
  assert.equal(env.state.acceptances.length, 0);
  assert.ok(env.state.operations.some(operation => operation.sql.includes("INSERT INTO signup_diagnostics")));
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
  assert.equal(unlocked.status, 303);
  assert.equal(unlocked.headers.get("location"), "https://destination.example/path");
  assert.equal(env.state.links.get("test-link").clicks, 1);
});
test("password unlock page uses JSON submission with visible feedback and redirect target", async () => {
  const salt = "0123456789abcdef0123456789abcdef";
  const hash = await passwordHash("correct-horse", salt);
  const env = createStatefulEnv({ links: [linkRecord({ password_salt: salt, password_hash: hash })] });

  const landing = await worker.fetch(new Request("https://undolink.test/test-link"), env);
  const html = await landing.text();
  assert.match(html, /id="unlock-form"/);
  assert.ok(html.includes('src="/unlock.js"'));
  assert.match(html, /id="unlock-message"/);

  const wrongForm = new FormData();
  wrongForm.set("password", "wrong-password");
  const wrong = await worker.fetch(new Request("https://undolink.test/api/links/test-link/unlock", {
    method: "POST", body: wrongForm, headers: { Accept: "application/json" }
  }), env);
  assert.equal(wrong.status, 401);
  assert.deepEqual(await wrong.json(), { error: "That password did not match. Try again." });
  assert.equal(env.state.links.get("test-link").clicks, 0);

  const correctForm = new FormData();
  correctForm.set("password", "correct-horse");
  const correct = await worker.fetch(new Request("https://undolink.test/api/links/test-link/unlock", {
    method: "POST", body: correctForm, headers: { Accept: "application/json" }
  }), env);
  assert.equal(correct.status, 200);
  assert.deepEqual(await correct.json(), { ok: true, redirectTo: "https://destination.example/path" });
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


test("static asset responses receive security headers", async () => {
  const env = createEnv();
  const response = await worker.fetch(new Request("https://undolink.test/styles.css"), env);
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  assert.match(response.headers.get("content-security-policy") || "", /default-src 'self'/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});


import { cleanupDatabase } from "../maintenance/cleanup.js";

test("database cleanup applies conservative retention windows without deleting links or users", async () => {
  const calls = [];
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              calls.push({ sql, values });
              return { meta: { changes: 0 } };
            }
          };
        }
      };
    }
  };
  const now = 2_000_000_000;
  const result = await cleanupDatabase(db, now);
  const day = 86400;

  assert.deepEqual(result.cutoffs, {
    expiredSessions: now,
    rateLimits: now - 7 * day,
    unlockAttempts: now - 2 * day,
    emailTokens: now - 30 * day,
    clickHistory: now - 90 * day
  });
  assert.equal(calls.length, 7);
  assert.ok(calls.some(call => call.sql.includes("DELETE FROM link_clicks") && call.values[0] === now - 90 * day));
  assert.ok(calls.some(call => call.sql.includes("DELETE FROM sessions") && call.values[0] === now));
  assert.ok(calls.some(call => call.sql.includes("DELETE FROM email_action_tokens") && call.values.every(value => value === now - 30 * day)));
  assert.ok(calls.some(call => call.sql.includes("DELETE FROM signup_diagnostics") && call.values[0] === now - 30 * day));
  assert.ok(calls.every(call => !/DELETE FROM (links|users|terms_acceptances)/i.test(call.sql)));
});

function createLegacyLoginEnv(user, pepper = "a".repeat(64)) {
  const state = { user: { ...user }, sessions: [] };
  const DB = {
    prepare(sql) {
      const statement = {
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.includes("INSERT INTO auth_rate_limits")) return { count: 1 };
          if (sql.includes("FROM users WHERE email=? COLLATE NOCASE")) return { ...state.user };
          return null;
        },
        async run() {
          if (sql.includes("UPDATE users SET password_hash=? WHERE id=?")) {
            state.user.password_hash = this.values[0];
          }
          if (sql.includes("INSERT INTO sessions")) state.sessions.push(this.values);
          return { meta: { changes: 1 } };
        }
      };
      return statement;
    }
  };
  return {
    state, DB, PASSWORD_PEPPER: pepper,
    ASSETS: { async fetch() { return new Response("asset not found", { status: 404 }); } }
  };
}

function loginRequest(password) {
  return new Request("https://undolink.test/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": "192.0.2.20" },
    body: JSON.stringify({ email: "legacy@example.com", password })
  });
}

test("successful legacy account login upgrades its stored hash without changing the password", async () => {
  const salt = "0123456789abcdef0123456789abcdef";
  const oldHash = await passwordHash("legacy-password-123", salt);
  const env = createLegacyLoginEnv({
    id: "legacy-user", email: "legacy@example.com", password_salt: salt,
    password_hash: oldHash, email_verified_at: 1
  });
  const response = await worker.fetch(loginRequest("legacy-password-123"), env);
  assert.equal(response.status, 200);
  assert.match(env.state.user.password_hash, /^v2/);
  assert.notEqual(env.state.user.password_hash, oldHash);
  assert.equal(env.state.sessions.length, 1);
  assert.ok(response.headers.get("set-cookie"));
});

test("incorrect legacy account password does not upgrade or replace the stored hash", async () => {
  const salt = "0123456789abcdef0123456789abcdef";
  const oldHash = await passwordHash("legacy-password-123", salt);
  const env = createLegacyLoginEnv({
    id: "legacy-user", email: "legacy@example.com", password_salt: salt,
    password_hash: oldHash, email_verified_at: 1
  });
  const response = await worker.fetch(loginRequest("wrong-password"), env);
  assert.equal(response.status, 401);
  assert.equal(env.state.user.password_hash, oldHash);
  assert.equal(env.state.sessions.length, 0);
});

