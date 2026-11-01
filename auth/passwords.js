const ITERATIONS = 100000;
const encoder = new TextEncoder();

function toHex(bytes) {
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, "0")).join("");
}

function fromHex(value) {
  if (typeof value !== "string" || !/^(?:[a-f0-9]{2})+$/i.test(value)) {
    throw new Error("Invalid password salt.");
  }
  return Uint8Array.from(value.match(/.{2}/g), part => parseInt(part, 16));
}

function equalConstantTime(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

async function deriveLegacyHash(password, saltHex) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt: fromHex(saltHex),
    iterations: ITERATIONS,
    hash: "SHA-256"
  }, key, 256);
  return toHex(bits);
}

function validatePepper(pepper) {
  if (pepper === undefined || pepper === null || pepper === "") return null;
  if (typeof pepper !== "string" || pepper.length < 64) {
    throw new Error("PASSWORD_PEPPER must be a randomly generated secret of at least 64 characters.");
  }
  return pepper;
}

export async function hashAuthPassword(password, saltHex, pepper) {
  const legacyHash = await deriveLegacyHash(password, saltHex);
  const secret = validatePepper(pepper);
  if (!secret) return legacyHash;

  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {
    name: "HMAC",
    hash: "SHA-256"
  }, false, ["sign"]);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode("undolink-auth-password-v2:" + legacyHash)
  );
  return "v2$" + toHex(signature);
}

export async function verifyAuthPassword(password, saltHex, storedHash, pepper) {
  if (typeof storedHash !== "string") return { valid: false, needsUpgrade: false, unavailable: false };

  if (storedHash.startsWith("v2$")) {
    const secret = validatePepper(pepper);
    if (!secret) return { valid: false, needsUpgrade: false, unavailable: true };
    const expected = await hashAuthPassword(password, saltHex, secret);
    return {
      valid: equalConstantTime(expected, storedHash),
      needsUpgrade: false,
      unavailable: false
    };
  }

  if (!/^[a-f0-9]{64}$/i.test(storedHash)) {
    return { valid: false, needsUpgrade: false, unavailable: false };
  }

  const expected = await deriveLegacyHash(password, saltHex);
  const valid = equalConstantTime(expected, storedHash);
  return {
    valid,
    needsUpgrade: valid && Boolean(validatePepper(pepper)),
    unavailable: false
  };
}

export const passwordHashIterations = ITERATIONS;
