# UndoLink

Temporary links that stop redirecting when their time is up.

## Stack
- Cloudflare Pages + Pages Functions
- Cloudflare D1
- Plain HTML, CSS and JavaScript

## Local development
1. Install Node.js and Wrangler.
2. Run `npx wrangler pages dev .`.
3. Apply the database schema to your local D1 database before testing API routes.

## Current functionality
- Create short redirects with a fixed expiry (15 minutes, 1 hour, 24 hours, 7 days or 30 days).
- Optional click limits.
- Disable a link using its private management key saved in the browser that created it.
- Only HTTP and HTTPS destinations are accepted.

## Important
Expiry disables the UndoLink redirect. It does not delete, revoke or modify the original destination URL. Anyone who already knows the destination can still visit it directly.

## Database
The D1 database binding is configured in `wrangler.toml` as `DB`. The production database schema is managed separately in Cloudflare D1.
