const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=()"
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...securityHeaders, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const passwordPage = (slug, incorrect = false) => new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Password required — UndoLink</title><style>*{box-sizing:border-box}body{margin:0;padding:40px 22px;background:#fff;color:#252525;font:15px/1.6 Arial,sans-serif}.wrap{max-width:440px;margin:14vh auto}.brand{font-weight:800;font-size:20px;letter-spacing:-1px}.mark{display:inline-grid;place-items:center;background:#f07832;color:white;width:27px;height:27px;margin-right:8px}h1{font-size:32px;line-height:1.1;letter-spacing:-1.2px;margin:48px 0 10px}p{color:#777;margin:0 0 22px}input{width:100%;height:50px;border:1px solid #ccc;padding:0 13px;font:inherit}button{width:100%;height:50px;margin-top:12px;border:0;background:#f07832;color:#fff;font-weight:700;cursor:pointer}.error{color:#b33d24;font-size:13px;margin:0 0 12px}</style><main class="wrap"><div class="brand"><span class="mark">u</span>UndoLink</div><h1>This link is protected.</h1><p>Enter the password shared by the person who sent you this link.</p>${incorrect ? '<p class="error">That password did not match. Try again.</p>' : ''}<form method="post" action="/api/links/${slug}/unlock"><input type="password" name="password" minlength="6" maxlength="64" placeholder="Link password" autocomplete="current-password" required><button type="submit">Continue</button></form></main></html>`, {
  status: incorrect ? 401 : 200,
  headers: { ...securityHeaders, "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
});
const page = (title, message, status = 404) => new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} — UndoLink</title><style>*{box-sizing:border-box}body{margin:0;padding:40px 22px;background:#fff;color:#252525;font:15px/1.6 Arial,sans-serif}.wrap{max-width:520px;margin:14vh auto}.brand{font-weight:800;font-size:20px;letter-spacing:-1px}.mark{display:inline-grid;place-items:center;background:#f07832;color:white;width:27px;height:27px;margin-right:8px}.line{height:3px;width:42px;background:#f07832;margin:38px 0 20px}h1{font-size:34px;line-height:1.1;letter-spacing:-1.5px;margin:0 0 12px}p{color:#777;margin:0}</style><main class="wrap"><div class="brand"><span class="mark">u</span>UndoLink</div><div class="line"></div><h1>${title}</h1><p>${message}</p></main></html>`, {
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
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromHex(saltHex), iterations: 120000, hash: "SHA-256" }, key, 256);
  return [...new Uint8Array(bits)].map(value => value.toString(16).padStart(2, "0")).join("");
};
const digest = async value => {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, "0")).join("");
};
const expiryChoices = new Set([900, 3600, 86400, 604800, 2592000]);
const clickChoices = new Set([1, 5, 10, 25, 100]);
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{2,22}[a-z0-9])$/;
const reservedSlugs = new Set(["api","admin","assets","favicon","robots","privacy","terms","help","create","login","signup"]);

async function createLink(request, env) {
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
  const maxClicks = body.maxClicks == null ? null : Number(body.maxClicks);
  if (maxClicks !== null && !clickChoices.has(maxClicks)) {
    return json({ error: "Choose a valid click limit." }, 400);
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (password && (password.length < 6 || password.length > 64)) {
    return json({ error: "A link password must be between 6 and 64 characters." }, 400);
  }
  const passwordSalt = password ? token(16) : null;
  const passwordHash = password ? await hashPassword(password, passwordSalt) : null;

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

  const manageKey = token(32);
  const manageHash = await digest(manageKey);
  let slug = null;
  const candidates = customSlug ? [customSlug] : [token(6).slice(0, 10), token(6).slice(0, 10), token(6).slice(0, 10)];

  for (const candidate of candidates) {
    try {
      await env.DB.prepare(
        "INSERT INTO links (id,slug,destination_url,created_at,expires_at,max_clicks,manage_token_hash,password_salt,password_hash,starts_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
      ).bind(crypto.randomUUID(), candidate, destination.href, now, expiresAt, maxClicks, manageHash, passwordSalt, passwordHash, startsAt).run();
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
  if (!authorization.startsWith("Bearer ") || authorization.length > 256) {
    return json({ error: "This management key is invalid." }, 401);
  }
  const row = await env.DB.prepare("SELECT manage_token_hash FROM links WHERE slug=?").bind(slug).first();
  if (!row || row.manage_token_hash !== await digest(authorization.slice(7))) {
    return json({ error: "This management key is invalid." }, 401);
  }

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
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) return passwordPage(slug, true);
  let form;
  try { form = await request.formData(); } catch { return passwordPage(slug, true); }
  const password = form.get("password");
  if (typeof password !== "string" || password.length < 1 || password.length > 64) {
    return passwordPage(slug, true);
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
    return new Response("Too many password attempts. Please try again later.", {
      status: 429,
      headers: { ...securityHeaders, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
    });
  }
  if (rate?.count === 1) {
    await env.DB.prepare("DELETE FROM unlock_rate_limits WHERE window_start < ?").bind(now - 172800).run();
  }

  const candidateHash = await hashPassword(password, link.password_salt);
  if (candidateHash !== link.password_hash) return passwordPage(slug, true);

  const active = await env.DB.prepare(
    "UPDATE links SET clicks=clicks+1 WHERE id=? AND disabled_at IS NULL AND paused_at IS NULL AND (starts_at IS NULL OR starts_at<=?) AND expires_at>? AND (max_clicks IS NULL OR clicks<max_clicks) RETURNING id, destination_url"
  ).bind(link.id, now, now).first();
  if (!active) return page("This link has expired", "The UndoLink redirect is no longer active. The original destination hasn't been changed.");
  try {
    await env.DB.prepare("INSERT INTO link_clicks (link_id, clicked_at) VALUES (?,?)").bind(active.id, now).run();
  } catch {
    // Keep the redirect available if analytics logging is temporarily unavailable.
  }
  return new Response(null, {
    status: 302,
    headers: { ...securityHeaders, "location": active.destination_url, "cache-control": "no-store" }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/links" && request.method === "POST") {
      try { return await createLink(request, env); }
      catch { return json({ error: "We couldn't create that link. Please try again." }, 500); }
    }

    const unlockMatch = url.pathname.match(/^\/api\/links\/([a-z0-9](?:[a-z0-9-]{2,22}[a-z0-9]))\/unlock$/);
    if (unlockMatch && request.method === "POST") {
      try { return await unlock(request, env, unlockMatch[1]); }
      catch { return page("Temporarily unavailable", "We couldn't verify this password right now. Please try again shortly.", 503); }
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

    return env.ASSETS.fetch(request);
  }
};
