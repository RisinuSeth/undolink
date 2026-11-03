import { hashAuthPassword, verifyAuthPassword } from "./auth/passwords.js";

const securityHeaders = {
  "strict-transport-security": "max-age=31536000",
  "content-security-policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self'; upgrade-insecure-requests",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=()"
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...securityHeaders, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const passwordPage = (slug, incorrect = false) => new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Password required — UndoLink</title><style>*{box-sizing:border-box}body{margin:0;padding:40px 22px;background:#fff;color:#262321;font:15px/1.65 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.wrap{max-width:440px;margin:14vh auto}.brand{font-weight:800;font-size:20px;letter-spacing:-1px}.mark{display:inline-block;width:29px;height:29px;margin-right:8px;vertical-align:middle}h1{font-size:32px;line-height:1.1;letter-spacing:-1.2px;margin:48px 0 10px}p{color:#77716c;margin:0 0 22px}input{width:100%;height:50px;border:1px solid #d9d0c8;padding:0 13px;font:inherit}button{width:100%;height:50px;margin-top:12px;border:0;background:#f07832;color:#fff;font-weight:700;cursor:pointer}.error{color:#b33d24;font-size:13px;margin:0 0 12px}</style><main class="wrap"><div class="brand"><svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="bg-worker-error" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFAA68"/><stop offset=".46" stop-color="#F07832"/><stop offset="1" stop-color="#D95B20"/></linearGradient><radialGradient id="glow-worker-error" cx="18%" cy="12%" r="92%"><stop offset="0" stop-color="#FFF1DF" stop-opacity=".55"/><stop offset=".58" stop-color="#FFF1DF" stop-opacity="0"/></radialGradient></defs><rect width="32" height="32" fill="url(#bg-worker-error)"/><rect width="32" height="32" fill="url(#glow-worker-error)"/><path d="M0 0h32v7.5c-9 3.1-20 2.6-32-.7z" fill="#fff" opacity=".11"/><path d="M-3 24 10 11M8 35 35 8" stroke="#fff" stroke-width=".45" opacity=".055"/><g transform="translate(4 4)" fill="none" stroke="#fff" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></g></svg>UndoLink</div><h1>This link is protected.</h1><p>Enter the password shared by the person who sent you this link.</p>${incorrect ? '<p class="error">That password did not match. Try again.</p>' : ''}<form id="unlock-form" method="post" action="/api/links/${slug}/unlock"><input type="password" name="password" minlength="6" maxlength="64" placeholder="Link password" autocomplete="current-password" required><button id="unlock-submit" type="submit">Continue</button></form><p id="unlock-message" class="error" role="status" aria-live="polite" hidden></p></main><script src="/unlock.js" defer></script></html>`, {
  status: incorrect ? 401 : 200,
  headers: { ...securityHeaders, "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
});
const page = (title, message, status = 404) => new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} — UndoLink</title><style>*{box-sizing:border-box}body{margin:0;padding:40px 22px;background:#fff;color:#262321;font:15px/1.65 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.wrap{max-width:520px;margin:14vh auto}.brand{font-weight:800;font-size:20px;letter-spacing:-1px}.mark{display:inline-block;width:29px;height:29px;margin-right:8px;vertical-align:middle}.line{height:3px;width:42px;background:#f07832;margin:38px 0 20px}h1{font-size:34px;line-height:1.1;letter-spacing:-1.5px;margin:0 0 12px}p{color:#77716c;margin:0}</style><main class="wrap"><div class="brand"><svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="bg-worker-error" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFAA68"/><stop offset=".46" stop-color="#F07832"/><stop offset="1" stop-color="#D95B20"/></linearGradient><radialGradient id="glow-worker-error" cx="18%" cy="12%" r="92%"><stop offset="0" stop-color="#FFF1DF" stop-opacity=".55"/><stop offset=".58" stop-color="#FFF1DF" stop-opacity="0"/></radialGradient></defs><rect width="32" height="32" fill="url(#bg-worker-error)"/><rect width="32" height="32" fill="url(#glow-worker-error)"/><path d="M0 0h32v7.5c-9 3.1-20 2.6-32-.7z" fill="#fff" opacity=".11"/><path d="M-3 24 10 11M8 35 35 8" stroke="#fff" stroke-width=".45" opacity=".055"/><g transform="translate(4 4)" fill="none" stroke="#fff" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></g></svg>UndoLink</div><div class="line"></div><h1>${title}</h1><p>${message}</p></main></html>`, {
  status,
  headers: { ...securityHeaders, "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
});
const token = (bytes = 32) => {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return [...data].map(value => value.toString(16).padStart(2, "0")).join("");
};
const fromHex = value => Uint8Array.from(value.match(/.{2}/g).map(part => parseInt(part, 16)));
const hashPassword = async (password, saltHex) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromHex(saltHex), iterations: 100000, hash: "SHA-256" }, key, 256);
  return [...new Uint8Array(bits)].map(value => value.toString(16).padStart(2, "0")).join("");
};
const digest = async value => {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, "0")).join("");
};
const expiryChoices = new Set([900, 3600, 86400, 604800, 2592000]);
const clickChoices = new Set([1, 5, 10, 25, 100]);
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{2,22}[a-z0-9])$/;
const reservedSlugs = new Set(["api","admin","assets","favicon","robots","privacy","terms","help","support","create","login","signup"]);


const authCookieName = "undolink_session";
const sessionLifetime = 30 * 24 * 60 * 60;
const cookieValue = (request, name) => {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > -1 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
};
async function getSession(request, env) {
  const raw = cookieValue(request, authCookieName);
  if (!/^[a-f0-9]{64}$/.test(raw)) return null;
  const row = await env.DB.prepare(
    "SELECT users.id, users.email, sessions.id AS session_id FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?"
  ).bind(await digest(raw), Math.floor(Date.now() / 1000)).first();
  return row ? { userId: row.id, email: row.email, sessionId: row.session_id } : null;
}
async function createSession(userId, env) {
  const now = Math.floor(Date.now() / 1000);
  const raw = token(32);
  await env.DB.prepare("INSERT INTO sessions (id,user_id,token_hash,created_at,expires_at) VALUES (?,?,?,?,?)")
    .bind(crypto.randomUUID(), userId, await digest(raw), now, now + sessionLifetime).run();
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(now).run();
  return "undolink_session=" + raw + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + sessionLifetime;
}
function publicUser(user) {
  return { id: user.id, email: user.email };
}
async function authRateLimited(request, env, action, maxCount = 15) {
  const now = Math.floor(Date.now() / 1000);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await digest(ip);
  const windowStart = Math.floor(now / 3600) * 3600;
  const row = await env.DB.prepare(
    "INSERT INTO auth_rate_limits (ip_hash,action,window_start,count) VALUES (?,?,?,1) " +
    "ON CONFLICT(ip_hash,action,window_start) DO UPDATE SET count=count+1 RETURNING count"
  ).bind(ipHash, action, windowStart).first();
  return Number(row?.count || 0) > maxCount;
}


async function submitSupportRequest(request, env) {
  if (await authRateLimited(request, env, "support", 5)) {
    return json({ error: "Too many messages. Please try again later." }, 429);
  }

  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Invalid request origin." }, 403);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 7000) return json({ error: "That message is too large." }, 413);

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 7000) return json({ error: "That message is too large." }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Please complete the form and try again." }, 400);
  }

  if (typeof body.company === "string" && body.company.trim()) {
    return json({ ok: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (name.length > 100 || email.length > 254 || subject.length < 3 || subject.length > 150 ||
      message.length < 10 || message.length > 5000 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Check your email, subject and message, then try again." }, 400);
  }

  if (!env.SUPPORT_WEBHOOK_URL || !env.SUPPORT_WEBHOOK_SECRET) {
    return json({ error: "Support messages are temporarily unavailable. Please try again later." }, 503);
  }

  try {
    const response = await fetch(env.SUPPORT_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: env.SUPPORT_WEBHOOK_SECRET,
        name: name || "Not provided",
        email,
        subject,
        message
      }),
      redirect: "follow"
    });
    const result = await response.json();
    if (!response.ok || result?.ok !== true) {
      return json({ error: "We couldn't send your message. Please try again later." }, 502);
    }
    return json({ ok: true, message: "Your message has been sent. We'll reply by email." });
  } catch {
    return json({ error: "We couldn't send your message. Please try again later." }, 502);
  }
}

function escapeEmailHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
async function sendAccountEmail(env, to, subject, heading, message, actionUrl, actionLabel) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error("Email delivery is not configured.");
  const safeEmail = escapeEmailHtml(to);
  const safeHeading = escapeEmailHtml(heading);
  const safeMessage = escapeEmailHtml(message);
  const safeUrl = escapeEmailHtml(actionUrl);
  const safeLabel = escapeEmailHtml(actionLabel);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject,
      html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:40px auto;color:#262321;line-height:1.6">' +
        '<div style="font-weight:800;font-size:22px;margin-bottom:30px">UndoLink</div><h1 style="font-size:28px;line-height:1.2">' + safeHeading + '</h1>' +
        '<p>' + safeMessage + '</p><p style="margin:28px 0"><a href="' + safeUrl + '" style="display:inline-block;padding:13px 20px;background:#f07832;color:#fff;text-decoration:none;font-weight:700">' + safeLabel + '</a></p>' +
        '<p style="font-size:12px;color:#77716c">If you did not request this, you can ignore this email.</p><p style="font-size:11px;color:#999">Sent to ' + safeEmail + ' by UndoLink.</p></div>'
    })
  });
  if (!response.ok) throw new Error("Email provider rejected the message.");
}
async function issueEmailAction(env, userId, email, purpose, request) {
  const raw = token(32);
  const now = Math.floor(Date.now() / 1000);
  const lifetime = purpose === "verify_email" ? 86400 : 3600;
  await env.DB.prepare("UPDATE email_action_tokens SET used_at=? WHERE user_id=? AND purpose=? AND used_at IS NULL")
    .bind(now, userId, purpose).run();
  await env.DB.prepare("INSERT INTO email_action_tokens (token_hash,user_id,purpose,created_at,expires_at) VALUES (?,?,?,?,?)")
    .bind(await digest(raw), userId, purpose, now, now + lifetime).run();
  const origin = env.APP_ORIGIN || new URL(request.url).origin;
  const actionUrl = origin + (purpose === "verify_email" ? "/?verify=" : "/?reset=") + raw;
  if (purpose === "verify_email") {
    await sendAccountEmail(env, email, "Verify your UndoLink email", "Verify your email address", "Confirm your email address to activate your UndoLink account. This link expires in 24 hours.", actionUrl, "Verify email");
  } else {
    await sendAccountEmail(env, email, "Reset your UndoLink password", "Reset your password", "We received a request to reset your UndoLink password. This link expires in one hour.", actionUrl, "Reset password");
  }
}
async function auth(request, env, action) {
  if (action === "me") {
    const session = await getSession(request, env);
    if (!session) return json({ user: null });
    const row = await env.DB.prepare("SELECT email_verified_at FROM users WHERE id=?").bind(session.userId).first();
    return json({ user: { id: session.userId, email: session.email, emailVerified: !!row?.email_verified_at } });
  }
  if (action === "logout") {
    const session = await getSession(request, env);
    if (session) await env.DB.prepare("DELETE FROM sessions WHERE id=?").bind(session.sessionId).run();
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...securityHeaders, "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
        "set-cookie": authCookieName + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" }
    });
  }
  if (action === "verify") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "That verification link is invalid." }, 400); }
    const raw = typeof body.token === "string" ? body.token : "";
    if (!/^[a-f0-9]{64}$/.test(raw)) return json({ error: "That verification link is invalid or expired." }, 400);
    const now = Math.floor(Date.now() / 1000);
    const consumed = await env.DB.prepare(
      "UPDATE email_action_tokens SET used_at=? WHERE token_hash=? AND purpose='verify_email' AND used_at IS NULL AND expires_at>? RETURNING user_id"
    ).bind(now, await digest(raw), now).first();
    if (!consumed) return json({ error: "That verification link is invalid or expired. Request a new one." }, 400);
    await env.DB.prepare("UPDATE users SET email_verified_at=? WHERE id=?").bind(now, consumed.user_id).run();
    return json({ ok: true });
  }
  if (action === "reset") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "That reset link is invalid." }, 400); }
    const raw = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-f0-9]{64}$/.test(raw) || password.length < 10 || password.length > 128) {
      return json({ error: "Use a valid reset link and a password between 10 and 128 characters." }, 400);
    }
    const now = Math.floor(Date.now() / 1000);
    const consumed = await env.DB.prepare(
      "UPDATE email_action_tokens SET used_at=? WHERE token_hash=? AND purpose='reset_password' AND used_at IS NULL AND expires_at>? RETURNING user_id"
    ).bind(now, await digest(raw), now).first();
    if (!consumed) return json({ error: "That reset link is invalid or expired. Request another one." }, 400);
    const salt = token(16);
    const passwordHash = await hashAuthPassword(password, salt, env.PASSWORD_PEPPER);
    await env.DB.prepare("UPDATE users SET password_salt=?,password_hash=? WHERE id=?").bind(salt, passwordHash, consumed.user_id).run();
    await env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(consumed.user_id).run();
    return json({ ok: true });
  }
  if (action === "resend") {
    if (await authRateLimited(request, env, action)) return json({ error: "Too many requests. Try again later." }, 429);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Enter your email and password." }, 400); }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const user = await env.DB.prepare("SELECT id,email,password_salt,password_hash,email_verified_at FROM users WHERE email=? COLLATE NOCASE").bind(email).first();
    if (!user) return json({ error: "Email or password is incorrect." }, 401);
    const passwordCheck = await verifyAuthPassword(password, user.password_salt, user.password_hash, env.PASSWORD_PEPPER);
    if (passwordCheck.unavailable) return json({ error: "Authentication is temporarily unavailable. Please try again later." }, 503);
    if (!passwordCheck.valid) return json({ error: "Email or password is incorrect." }, 401);
    if (passwordCheck.needsUpgrade) {
      const upgradedHash = await hashAuthPassword(password, user.password_salt, env.PASSWORD_PEPPER);
      await env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(upgradedHash, user.id).run();
    }
    if (user.email_verified_at) return json({ ok: true, message: "Your email is already verified. You can log in." });
    try {
      await issueEmailAction(env, user.id, user.email, "verify_email", request);
      return json({ ok: true, message: "Verification email sent. Check your inbox." });
    } catch {
      return json({ error: "Email delivery is not configured yet. Please try again later." }, 503);
    }
  }
  if (action === "forgot") {
    if (await authRateLimited(request, env, action)) return json({ error: "Too many requests. Try again later." }, 429);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Enter a valid email address." }, 400); }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]{1,64}@[a-z0-9-]{1,190}(?:\.[a-z0-9-]{2,30})+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
    const user = await env.DB.prepare("SELECT id,email FROM users WHERE email=? COLLATE NOCASE").bind(email).first();
    if (user) {
      try { await issueEmailAction(env, user.id, user.email, "reset_password", request); }
      catch { /* Keep the response identical to avoid revealing whether an account exists. */ }
    }
    return json({ ok: true, message: "If an account exists for that address, a password reset email is on its way." });
  }
  if (action === "change") {
    const session = await getSession(request, env);
    if (!session) return json({ error: "Please log in again." }, 401);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
    const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const next = typeof body.newPassword === "string" ? body.newPassword : "";
    if (next.length < 10 || next.length > 128) return json({ error: "Your new password must be between 10 and 128 characters." }, 400);
    const user = await env.DB.prepare("SELECT password_salt,password_hash FROM users WHERE id=?").bind(session.userId).first();
    if (!user) return json({ error: "Your current password is incorrect." }, 401);
    const currentCheck = await verifyAuthPassword(current, user.password_salt, user.password_hash, env.PASSWORD_PEPPER);
    if (currentCheck.unavailable) return json({ error: "Authentication is temporarily unavailable. Please try again later." }, 503);
    if (!currentCheck.valid) return json({ error: "Your current password is incorrect." }, 401);
    const salt = token(16);
    const passwordHash = await hashAuthPassword(next, salt, env.PASSWORD_PEPPER);
    await env.DB.prepare("UPDATE users SET password_salt=?,password_hash=? WHERE id=?").bind(salt, passwordHash, session.userId).run();
    await env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND id<>?").bind(session.userId, session.sessionId).run();
    return json({ ok: true, message: "Password updated. Other sessions were signed out." });
  }
  if (action !== "signup" && action !== "login") return json({ error: "Not found." }, 404);
  if (await authRateLimited(request, env, action)) return json({ error: "Too many attempts. Please try again in an hour." }, 429);
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ error: "Request too large." }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: "Enter a valid email and password." }, 400); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[^\s@]{1,64}@[a-z0-9-]{1,190}(?:\.[a-z0-9-]{2,30})+$/.test(email) || password.length < 10 || password.length > 128) {
    return json({ error: "Use a valid email and a password between 10 and 128 characters." }, 400);
  }
  let user;
  if (action === "signup") {
    if (body.acceptedTerms !== true || body.termsVersion !== "2026-10-31") {
      return json({ error: "Please accept the current Terms of Service before creating an account." }, 400);
    }
    const salt = token(16);
    const passwordHash = await hashAuthPassword(password, salt, env.PASSWORD_PEPPER);
    user = { id: crypto.randomUUID(), email };
    const createdAt = Math.floor(Date.now() / 1000);
    try {
      // D1 batch runs these statements as one transaction: either both records
      // are committed, or neither record is saved.
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users (id,email,password_salt,password_hash,created_at,email_verified_at) VALUES (?,?,?,?,?,NULL)")
          .bind(user.id, email, salt, passwordHash, createdAt),
        env.DB.prepare("INSERT INTO terms_acceptances (id,user_id,terms_version,accepted_at) VALUES (?,?,?,?)")
          .bind(crypto.randomUUID(), user.id, "2026-10-31", createdAt)
      ]);
    } catch (error) {
      if (/UNIQUE constraint failed:\s*users\.email/i.test(String(error?.message || error))) {
        return json({ error: "An account with that email may already exist. Try logging in instead." }, 409);
      }
      throw new Error("Account registration transaction failed.", { cause: error });
    }
    try {
      await issueEmailAction(env, user.id, email, "verify_email", request);
      return json({ ok: true, verificationRequired: true, message: "Check your inbox for a verification link. It expires in 24 hours." }, 201);
    } catch {
      return json({ error: "Your account was created, but email delivery is not configured yet. Configure the email service, then use Log in to request verification." }, 503);
    }
  }
  const row = await env.DB.prepare("SELECT id,email,password_salt,password_hash,email_verified_at FROM users WHERE email=? COLLATE NOCASE").bind(email).first();
  if (!row) return json({ error: "Email or password is incorrect." }, 401);
  const passwordCheck = await verifyAuthPassword(password, row.password_salt, row.password_hash, env.PASSWORD_PEPPER);
  if (passwordCheck.unavailable) return json({ error: "Authentication is temporarily unavailable. Please try again later." }, 503);
  if (!passwordCheck.valid) return json({ error: "Email or password is incorrect." }, 401);
  if (passwordCheck.needsUpgrade) {
    const upgradedHash = await hashAuthPassword(password, row.password_salt, env.PASSWORD_PEPPER);
    await env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(upgradedHash, row.id).run();
  }
  if (!row.email_verified_at) return json({ error: "Verify your email first. Enter your password and use the resend verification option below." }, 403);
  user = { id: row.id, email: row.email };
  const cookie = await createSession(user.id, env);
  return new Response(JSON.stringify({ user: publicUser(user) }), {
    headers: { ...securityHeaders, "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "set-cookie": cookie }
  });
}
async function accountSessions(request, env, method, sessionId) {
  const session = await getSession(request, env);
  if (!session) return json({ error: "Please log in again." }, 401);
  if (method === "GET") {
    const rows = await env.DB.prepare("SELECT id,created_at,expires_at FROM sessions WHERE user_id=? AND expires_at>? ORDER BY created_at DESC")
      .bind(session.userId, Math.floor(Date.now() / 1000)).all();
    return json({ sessions: (rows.results || []).map(row => ({ id: row.id, createdAt: row.created_at * 1000, expiresAt: row.expires_at * 1000, current: row.id === session.sessionId })) });
  }
  if (method === "DELETE") {
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return json({ error: "Invalid session." }, 400);
    await env.DB.prepare("DELETE FROM sessions WHERE id=? AND user_id=? AND id<>?")
      .bind(sessionId, session.userId, session.sessionId).run();
    return json({ ok: true });
  }
  return json({ error: "Method not allowed." }, 405);
}

async function claimAccountLink(request, env) {
  const session = await getSession(request, env);
  if (!session) return json({ error: "Please log in first." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const slug = typeof body.slug === "string" ? body.slug : "";
  const manageKey = typeof body.manageKey === "string" ? body.manageKey : "";
  if (!slugPattern.test(slug) || !/^[a-f0-9]{64}$/.test(manageKey)) return json({ error: "Invalid link details." }, 400);
  const result = await env.DB.prepare(
    "UPDATE links SET user_id=? WHERE slug=? AND manage_token_hash=? AND (user_id IS NULL OR user_id=?)"
  ).bind(session.userId, slug, await digest(manageKey), session.userId).run();
  if (!result.meta?.changes) return json({ error: "This link could not be added to your account." }, 409);
  return json({ ok: true });
}

async function accountLinks(request, env) {
  const session = await getSession(request, env);
  if (!session) return json({ error: "Please log in to view your links." }, 401);
  const rows = await env.DB.prepare(
    "SELECT slug,destination_url,created_at,expires_at,max_clicks,clicks,disabled_at,starts_at,paused_at,password_hash FROM links WHERE user_id=? ORDER BY created_at DESC LIMIT 200"
  ).bind(session.userId).all();
  return json({ links: (rows.results || []).map(row => ({
    slug: row.slug, url: new URL("/" + row.slug, request.url).href,
    createdAt: row.created_at * 1000, expiresAt: row.expires_at * 1000,
    maxClicks: row.max_clicks, clicks: row.clicks, disabled: row.disabled_at !== null,
    scheduledAt: row.starts_at ? row.starts_at * 1000 : null, paused: row.paused_at !== null,
    passwordProtected: !!row.password_hash
  })) });
}

async function createLink(request, env) {
  const ownerSession = await getSession(request, env);
  let rawBody;
  try { rawBody = await request.text(); }
  catch { return json({ error: "Please send a valid link request." }, 400); }
  if (rawBody.length > 4096) return json({ error: "That request is too large." }, 413);

  let body;
  try { body = JSON.parse(rawBody); }
  catch { return json({ error: "Please send a valid link request." }, 400); }

  if (!body || typeof body.destination !== "string" || body.destination.length > 2048) {
    return json({ error: "Enter a valid destination URL." }, 400);
  }

  let destination;
  try {
    destination = new URL(body.destination.trim());
  } catch {
    return json({ error: "Enter a valid destination URL." }, 400);
  }
  if (!["http:", "https:"].includes(destination.protocol) || !destination.hostname ||
      destination.username || destination.password) {
    return json({ error: "Use a public HTTP or HTTPS URL without embedded login details." }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  const startsAtValue = body.startsAt == null ? null : Number(body.startsAt);
  const startsAt = startsAtValue == null ? null : Math.floor(startsAtValue / 1000);
  if (startsAt !== null && (!Number.isFinite(startsAt) || startsAt <= now || startsAt > now + 2592000)) {
    return json({ error: "Choose a future start time within the next 30 days." }, 400);
  }
  const duration = Number(body.expiresIn);
  let expiresAt;
  if (body.expiresAt != null) {
    const customExpiry = Number(body.expiresAt);
    if (!Number.isFinite(customExpiry) || customExpiry <= now * 1000 || customExpiry > (now + 2592000) * 1000) {
      return json({ error: "Choose an expiry date within the next 30 days." }, 400);
    }
    expiresAt = Math.floor(customExpiry / 1000);
  } else {
    if (!expiryChoices.has(duration)) return json({ error: "Choose one of the available expiry times." }, 400);
    expiresAt = (startsAt ?? now) + duration;
  }
  if (startsAt !== null && startsAt >= expiresAt) {
    return json({ error: "The link must expire after its scheduled start time." }, 400);
  }
  if (expiresAt > now + 2592000) {
    return json({ error: "Links can only be scheduled and kept active within a 30-day window." }, 400);
  }
  const maxClicks = body.maxClicks == null ? null : Number(body.maxClicks);
  if (maxClicks !== null && !clickChoices.has(maxClicks)) {
    return json({ error: "Choose a valid click limit." }, 400);
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (password && (password.length < 6 || password.length > 64)) {
    return json({ error: "A link password must be between 6 and 64 characters." }, 400);
  }
  const passwordSalt = password ? token(16) : null;

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await digest(ip);
  const windowStart = Math.floor(now / 3600) * 3600;

  const rate = await env.DB.prepare(
    "INSERT INTO rate_limits (ip_hash,window_start,count) VALUES (?,?,1) " +
    "ON CONFLICT(ip_hash,window_start) DO UPDATE SET count=count+1 RETURNING count"
  ).bind(ipHash, windowStart).first();

  if (rate?.count > 30) {
    return json({ error: "Too many links created from this connection. Try again later." }, 429);
  }
  if (rate?.count === 1 || rate?.count % 50 === 0) {
    await env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(now - 172800).run();
  }

  const customSlug = typeof body.customSlug === "string" ? body.customSlug.trim().toLowerCase() : "";
  if (customSlug && (!slugPattern.test(customSlug) || reservedSlugs.has(customSlug))) {
    return json({ error: "Choose a custom slug with 4–24 lowercase letters, numbers or hyphens. Avoid reserved words." }, 400);
  }

  const passwordHash = password ? await hashPassword(password, passwordSalt) : null;
  const manageKey = token(32);
  const manageHash = await digest(manageKey);
  let slug = null;
  const candidates = customSlug ? [customSlug] : [token(6).slice(0, 10), token(6).slice(0, 10), token(6).slice(0, 10)];

  for (const candidate of candidates) {
    try {
      await env.DB.prepare(
        "INSERT INTO links (id,slug,destination_url,created_at,expires_at,max_clicks,manage_token_hash,password_salt,password_hash,starts_at,user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(crypto.randomUUID(), candidate, destination.href, now, expiresAt, maxClicks, manageHash, passwordSalt, passwordHash, startsAt, ownerSession?.userId || null).run();
      slug = candidate;
      break;
    } catch (error) {
      if (customSlug) return json({ error: "That custom slug is already taken. Try another one." }, 409);
    }
  }
  if (!slug) throw new Error("Could not allocate a unique link slug.");

  return json({ slug, url: new URL("/" + slug, request.url).href, expiresAt: expiresAt * 1000, manageKey });
}

async function manage(request, env, slug) {
  const authorization = request.headers.get("Authorization") || "";
  const session = await getSession(request, env);
  const row = await env.DB.prepare("SELECT id,manage_token_hash,user_id FROM links WHERE slug=?").bind(slug).first();
  const hasManageKey = authorization.startsWith("Bearer ") && authorization.length <= 256 &&
    row && row.manage_token_hash === await digest(authorization.slice(7));
  const ownsLink = !!(row && session && row.user_id && row.user_id === session.userId);
  if (!row || (!hasManageKey && !ownsLink)) return json({ error: "This management key is invalid." }, 401);

  if (request.method === "GET") {
    const link = await env.DB.prepare(
      "SELECT id, clicks, max_clicks, expires_at, disabled_at, password_hash, starts_at, paused_at FROM links WHERE slug=?"
    ).bind(slug).first();
    if (!link) return json({ error: "Link not found." }, 404);
    const recent = await env.DB.prepare(
      "SELECT clicked_at FROM link_clicks WHERE link_id=? ORDER BY clicked_at DESC LIMIT 10"
    ).bind(link.id).all();
    return json({
      clicks: link.clicks,
      maxClicks: link.max_clicks,
      expiresAt: link.expires_at * 1000,
      disabled: link.disabled_at !== null,
      passwordProtected: !!link.password_hash,
      scheduledAt: link.starts_at ? link.starts_at * 1000 : null,
      paused: link.paused_at !== null,
      recentClicks: (recent.results || []).map(item => item.clicked_at * 1000)
    });
  }

  if (request.method === "PATCH") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }

    if (body.disabled === true) {
      await env.DB.prepare("UPDATE links SET disabled_at=? WHERE slug=? AND disabled_at IS NULL")
        .bind(Math.floor(Date.now() / 1000), slug).run();
      return json({ ok: true });
    }

    if (typeof body.paused === "boolean") {
      const pausedAt = body.paused ? Math.floor(Date.now() / 1000) : null;
      await env.DB.prepare("UPDATE links SET paused_at=? WHERE slug=? AND disabled_at IS NULL")
        .bind(pausedAt, slug).run();
      return json({ ok: true, paused: body.paused });
    }

    const extendBy = Number(body.extendBy);
    if ([3600, 86400, 604800].includes(extendBy)) {
      const now = Math.floor(Date.now() / 1000);
      const current = await env.DB.prepare("SELECT expires_at, disabled_at FROM links WHERE slug=?").bind(slug).first();
      if (!current || current.disabled_at !== null) return json({ error: "This link cannot be extended." }, 409);
      const nextExpiry = Math.max(current.expires_at, now) + extendBy;
      if (nextExpiry > now + 2592000) return json({ error: "Links can only be extended up to 30 days ahead." }, 400);
      await env.DB.prepare("UPDATE links SET expires_at=? WHERE slug=? AND disabled_at IS NULL")
        .bind(nextExpiry, slug).run();
      return json({ ok: true, expiresAt: nextExpiry * 1000 });
    }

    return json({ error: "Unsupported action." }, 400);
  }

  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM links WHERE slug=?").bind(slug).run();
    return json({ ok: true });
  }
  return json({ error: "Method not allowed." }, 405);
}

async function unlock(request, env, slug) {
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");
  const fail = (message, status = 401) => wantsJson ? json({ error: message }, status) : passwordPage(slug, true);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) return fail("That password request is too large.", 413);
  let form;
  try { form = await request.formData(); } catch { return fail("Please enter the link password."); }
  const password = form.get("password");
  if (typeof password !== "string" || password.length < 1 || password.length > 64) {
    return fail("Please enter the link password.");
  }

  const now = Math.floor(Date.now() / 1000);
  const link = await env.DB.prepare(
    "SELECT id, password_salt, password_hash, starts_at, paused_at FROM links WHERE slug=? AND disabled_at IS NULL AND expires_at>? AND (max_clicks IS NULL OR clicks<max_clicks)"
  ).bind(slug, now).first();
  if (!link || !link.password_hash || !link.password_salt) {
    return page("This link has expired", "The UndoLink redirect is no longer active. The original destination hasn't been changed.");
  }
  if (link.paused_at !== null) return page("This link is paused", "The person who created this link has temporarily paused it.", 200);
  if (link.starts_at && link.starts_at > now) return page("This link isn't active yet", "Come back when its scheduled start time has arrived.", 200);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await digest(ip);
  const windowStart = Math.floor(now / 3600) * 3600;
  const rate = await env.DB.prepare(
    "INSERT INTO unlock_rate_limits (ip_hash,slug,window_start,count) VALUES (?,?,?,1) " +
    "ON CONFLICT(ip_hash,slug,window_start) DO UPDATE SET count=count+1 RETURNING count"
  ).bind(ipHash, slug, windowStart).first();
  if (rate?.count > 20) {
    return wantsJson ? json({ error: "Too many password attempts. Please try again later." }, 429) : new Response("Too many password attempts. Please try again later.", {
      status: 429,
      headers: { ...securityHeaders, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
    });
  }
  if (rate?.count === 1) {
    await env.DB.prepare("DELETE FROM unlock_rate_limits WHERE window_start < ?").bind(now - 172800).run();
  }

  const candidateHash = await hashPassword(password, link.password_salt);
  if (candidateHash !== link.password_hash) return fail("That password did not match. Try again.");

  const active = await env.DB.prepare(
    "UPDATE links SET clicks=clicks+1 WHERE id=? AND disabled_at IS NULL AND paused_at IS NULL AND (starts_at IS NULL OR starts_at<=?) AND expires_at>? AND (max_clicks IS NULL OR clicks<max_clicks) RETURNING id, destination_url"
  ).bind(link.id, now, now).first();
  if (!active) return page("This link has expired", "The UndoLink redirect is no longer active. The original destination hasn't been changed.");
  try {
    await env.DB.prepare("INSERT INTO link_clicks (link_id, clicked_at) VALUES (?,?)").bind(active.id, now).run();
  } catch {
    // Keep the redirect available if analytics logging is temporarily unavailable.
  }
  if (wantsJson) return json({ ok: true, redirectTo: active.destination_url });
  return new Response(null, {
    // Explicit POST-Redirect-GET after a successful password submission.
    status: 303,
    headers: { ...securityHeaders, "location": active.destination_url, "cache-control": "no-store" }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/favicon.png") {
      const data = atob("iVBORw0KGgoAAAANSUhEUgAAAGAAAABgAQMAAADYVuV7AAAABlBMVEXweDL///8jyx3gAAAA1ElEQVR42u2SwY0CMQxFX5KROFLCUAIdZLYTOiGlUEpKoAToYI4cMvl7cCYI7QohIW78k+0ffzu24YsPIGZXV9vptlVuzkY1am7OKEkF8MCOZnhgAnBAACzXZbzFjPfguSYGdpbD6bQsa5lKrMTZmApwMelSmBzzGTwsXQ1gj5SG1sEZEmtvHf7PT12NmafPPuDITS8U3UNiaIEbR7E1JljI5ropxMo434dvq4CgNBZ0wUQOCqGvVJKUwYO6WujD/DGlDMb7tgDqf3fwcCEPt/PFm/gFb01Nk496VaUAAAAASUVORK5CYII=");
      const bytes = Uint8Array.from(data, c => c.charCodeAt(0));
      return new Response(bytes, { headers: { ...securityHeaders, "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable" } });
    }

    if (url.pathname === "/support" && request.method === "GET") {
      return env.ASSETS.fetch(new Request(new URL("/support.html", request.url), {
        method: "GET",
        headers: request.headers
      }));
    }

    if (request.method === "GET" && (url.pathname === "/terms" || url.pathname === "/terms.html")) {
      return env.ASSETS.fetch(new Request(new URL("/terms.html", request.url), {
        method: "GET",
        headers: request.headers
      }));
    }

    if (request.method === "GET" && (url.pathname === "/privacy" || url.pathname === "/privacy.html")) {
      return env.ASSETS.fetch(new Request(new URL("/privacy.html", request.url), {
        method: "GET",
        headers: request.headers
      }));
    }

    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      try { return await auth(request, env, "me"); }
      catch { return json({ error: "Authentication is temporarily unavailable." }, 503); }
    }
    if (url.pathname === "/api/auth/signup" && request.method === "POST") {
      try { return await auth(request, env, "signup"); }
      catch (error) {
        try {
          await env.DB.prepare("INSERT INTO signup_diagnostics (id,created_at,error_name,error_message) VALUES (?,?,?,?)")
            .bind(crypto.randomUUID(), Math.floor(Date.now() / 1000),
              String(error?.name || "Error").slice(0, 100),
              String(error?.message || error || "Unknown signup error").slice(0, 500)).run();
        } catch (logError) { console.error("UndoLink signup diagnostic write failed", logError); }
        console.error("UndoLink signup failed", error);
        return json({ error: "We couldn't create your account right now." }, 503);
      }
    }
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      try { return await auth(request, env, "login"); }
      catch { return json({ error: "We couldn't log you in right now." }, 503); }
    }

    if (url.pathname === "/api/auth/verify" && request.method === "POST") {
      try { return await auth(request, env, "verify"); }
      catch { return json({ error: "We couldn't verify that email right now." }, 503); }
    }
    if (url.pathname === "/api/auth/forgot" && request.method === "POST") {
      try { return await auth(request, env, "forgot"); }
      catch { return json({ error: "Password recovery is temporarily unavailable." }, 503); }
    }
    if (url.pathname === "/api/auth/reset" && request.method === "POST") {
      try { return await auth(request, env, "reset"); }
      catch { return json({ error: "We couldn't reset your password right now." }, 503); }
    }
    if (url.pathname === "/api/auth/resend-verification" && request.method === "POST") {
      try { return await auth(request, env, "resend"); }
      catch { return json({ error: "We couldn't send a verification email right now." }, 503); }
    }
    if (url.pathname === "/api/account/change-password" && request.method === "POST") {
      try { return await auth(request, env, "change"); }
      catch { return json({ error: "We couldn't update your password right now." }, 503); }
    }
    if (url.pathname === "/api/account/sessions" && (request.method === "GET" || request.method === "DELETE")) {
      try { return await accountSessions(request, env, request.method, ""); }
      catch { return json({ error: "We couldn't manage your sessions right now." }, 503); }
    }
    const sessionDeleteMatch = url.pathname.match(/^\/api\/account\/sessions\/([0-9a-f-]{36})$/i);
    if (sessionDeleteMatch && request.method === "DELETE") {
      try { return await accountSessions(request, env, "DELETE", sessionDeleteMatch[1]); }
      catch { return json({ error: "We couldn't sign out that session." }, 503); }
    }
    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      try { return await auth(request, env, "logout"); }
      catch { return json({ error: "We couldn't log you out right now." }, 503); }
    }
    if (url.pathname === "/api/account/claim" && request.method === "POST") {
      try { return await claimAccountLink(request, env); }
      catch { return json({ error: "We couldn't add that link to your account." }, 503); }
    }
    if (url.pathname === "/api/account/links" && request.method === "GET") {
      try { return await accountLinks(request, env); }
      catch { return json({ error: "We couldn't load your account links." }, 503); }
    }

    if (url.pathname === "/api/support" && request.method === "POST") {
      try { return await submitSupportRequest(request, env); }
      catch { return json({ error: "Support is temporarily unavailable. Please try again later." }, 503); }
    }

    if (url.pathname === "/api/links" && request.method === "POST") {
      try { return await createLink(request, env); }
      catch { return json({ error: "We couldn't create that link. Please try again." }, 500); }
    }

    const unlockMatch = url.pathname.match(/^\/api\/links\/([a-z0-9](?:[a-z0-9-]{2,22}[a-z0-9]))\/unlock$/);
    if (unlockMatch && request.method === "POST") {
      try { return await unlock(request, env, unlockMatch[1]); }
      catch {
        if ((request.headers.get("Accept") || "").includes("application/json")) return json({ error: "We couldn't verify this password right now. Please try again shortly." }, 503);
        return page("Temporarily unavailable", "We couldn't verify this password right now. Please try again shortly.", 503);
      }
    }

    const managementMatch = url.pathname.match(/^\/api\/links\/([a-z0-9](?:[a-z0-9-]{2,22}[a-z0-9]))$/);
    if (managementMatch && (request.method === "GET" || request.method === "PATCH" || request.method === "DELETE")) {
      try { return await manage(request, env, managementMatch[1]); }
      catch { return json({ error: "We couldn't update that link. Please try again." }, 500); }
    }

    if (request.method === "GET" && slugPattern.test(url.pathname.slice(1)) && url.pathname.length > 1 && !url.pathname.slice(1).includes("/")) {
      const slug = url.pathname.slice(1);
      const now = Math.floor(Date.now() / 1000);
      try {
        const candidate = await env.DB.prepare(
          "SELECT id, password_hash, starts_at, paused_at FROM links WHERE slug=? AND disabled_at IS NULL AND expires_at>? AND (max_clicks IS NULL OR clicks<max_clicks)"
        ).bind(slug, now).first();
        if (!candidate) return page("This link has expired", "The UndoLink redirect is no longer active. The original destination hasn't been changed.");
        if (candidate.paused_at !== null) return page("This link is paused", "The person who created this link has temporarily paused it.", 200);
        if (candidate.starts_at && candidate.starts_at > now) return page("This link isn't active yet", "Come back when its scheduled start time has arrived.", 200);
        if (candidate.password_hash) return passwordPage(slug);
        const row = await env.DB.prepare(
          "UPDATE links SET clicks=clicks+1 WHERE slug=? AND disabled_at IS NULL AND paused_at IS NULL AND (starts_at IS NULL OR starts_at<=?) AND expires_at>? AND (max_clicks IS NULL OR clicks<max_clicks) RETURNING id, destination_url"
        ).bind(slug, now, now).first();
        if (!row) return page("This link has expired", "The UndoLink redirect is no longer active. The original destination hasn't been changed.");
        try {
          await env.DB.prepare("INSERT INTO link_clicks (link_id, clicked_at) VALUES (?,?)")
            .bind(row.id, now).run();
        } catch {
          // A click should still reach its destination if analytics logging is temporarily unavailable.
        }
        return new Response(null, {
          status: 302,
          headers: { ...securityHeaders, "location": row.destination_url, "cache-control": "no-store" }
        });
      } catch {
        return page("Temporarily unavailable", "We couldn't check this link right now. Please try again shortly.", 503);
      }
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const headers = new Headers(assetResponse.headers);
    for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers
    });
  }
};
