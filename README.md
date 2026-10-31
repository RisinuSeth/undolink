# UndoLink

Temporary links that stop redirecting when their time is up.

## Stack
- Cloudflare Pages (advanced-mode Worker)
- Cloudflare D1
- Plain HTML, CSS and JavaScript

## Current functionality
- Create short redirects with a fixed expiry: 15 minutes, 1 hour, 24 hours, 7 days or 30 days.
- Optional click limits, including one-time links.
- Disable a link using its private management key saved in the browser that created it.
- Only HTTP and HTTPS destinations are accepted.
- Basic per-IP creation rate limiting (hashed IP identifier; 30 creations per hour).

## Important
Expiry disables the UndoLink redirect. It does not delete, revoke or modify the original destination URL. Anyone who already knows the destination can still visit it directly.

## Database
The D1 binding is named `DB` and is configured in `wrangler.toml` and the Cloudflare Pages production/preview environments. The initial schema is in `migrations/0001_init.sql`.

## Local development
1. Install Node.js and Wrangler.
2. Apply the schema to local D1 with `npx wrangler d1 execute undolink-db --local --file=migrations/0001_init.sql`.
3. Run `npx wrangler pages dev .`.
