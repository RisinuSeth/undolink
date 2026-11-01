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
