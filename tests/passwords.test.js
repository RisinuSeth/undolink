import test from "node:test";
import assert from "node:assert/strict";
import {
  hashAuthPassword,
  verifyAuthPassword,
  passwordHashIterations
} from "../auth/passwords.js";

const salt = "0123456789abcdef0123456789abcdef";
const pepper = "a".repeat(64);
const password = "a-long-test-password-123";

async function legacyHash(value = password) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(value), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt: Uint8Array.from(salt.match(/.{2}/g), part => parseInt(part, 16)),
    iterations: 100000,
    hash: "SHA-256"
  }, key, 256);
  return [...new Uint8Array(bits)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

test("new account password hashes use a versioned HMAC pepper", async () => {
  const stored = await hashAuthPassword(password, salt, pepper);
  assert.match(stored, /^v2\$[a-f0-9]{64}$/);
  const verified = await verifyAuthPassword(password, salt, stored, pepper);
  assert.deepEqual(verified, { valid: true, needsUpgrade: false, unavailable: false });
});

test("peppered password hashes reject wrong passwords and the wrong pepper", async () => {
  const stored = await hashAuthPassword(password, salt, pepper);
  assert.equal((await verifyAuthPassword("wrong-password", salt, stored, pepper)).valid, false);
  assert.equal((await verifyAuthPassword(password, salt, stored, "b".repeat(64))).valid, false);
});

test("legacy password hashes remain valid and are flagged for transparent upgrade", async () => {
  const stored = await legacyHash();
  const verified = await verifyAuthPassword(password, salt, stored, pepper);
  assert.deepEqual(verified, { valid: true, needsUpgrade: true, unavailable: false });
  const upgraded = await hashAuthPassword(password, salt, pepper);
  assert.match(upgraded, /^v2\$/);
  assert.equal((await verifyAuthPassword(password, salt, upgraded, pepper)).valid, true);
});

test("legacy accounts remain compatible before the pepper is configured", async () => {
  const stored = await legacyHash();
  const verified = await verifyAuthPassword(password, salt, stored);
  assert.deepEqual(verified, { valid: true, needsUpgrade: false, unavailable: false });
});

test("versioned hashes fail closed if their pepper is missing", async () => {
  const stored = await hashAuthPassword(password, salt, pepper);
  assert.deepEqual(await verifyAuthPassword(password, salt, stored), {
    valid: false, needsUpgrade: false, unavailable: true
  });
});

test("pepper must be a long secret", async () => {
  await assert.rejects(() => hashAuthPassword(password, salt, "too-short"), /at least 64 characters/);
});

test("password KDF iteration count is explicit and stable", () => {
  assert.equal(passwordHashIterations, 100000);
});
