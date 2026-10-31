# UndoLink

Temporary links that stop redirecting when their time is up.

## Stack
- Cloudflare Pages with an advanced-mode Worker in `_worker.js`
- Cloudflare D1
- Plain HTML, CSS and JavaScript

## Current functionality
- Create short redirects with fixed expiry options: 15 minutes, 1 hour, 24 hours, 7 days or 30 days.
- Optional custom slugs using 4–24 lowercase letters, numbers and hyphens.
- Optional password protection using PBKDF2-SHA-256 password hashes and per-link password-attempt limits.
- Optional click limits, including one-time links.
- Disable or permanently delete a link using its private management key.
- Private click analytics: total clicks, click-limit status and the 10 most recent click timestamps.
- Only HTTP and HTTPS destinations are accepted; embedded URL credentials are rejected.
- Basic per-IP creation rate limiting (hashed IP identifier; 30 creations per hour).
- Browser-side recent-link list with copy, disable, delete and stats actions.

## Security and privacy notes
- Management keys are generated randomly; only their SHA-256 hashes are stored in D1. The browser stores the management key locally so it can manage links. Anyone with access to that browser profile may be able to manage those links.
- Click analytics store timestamps only. UndoLink does not currently store visitor IP addresses or user-agent strings for click analytics.
- Link passwords are never stored in plain text. Password verification uses PBKDF2-SHA-256 with a unique random salt and 120,000 iterations. Unlock attempts are rate-limited per IP hash and link.
- Expiry disables the UndoLink redirect. It does not delete, revoke or modify the original destination URL. Anyone who already knows the destination can still visit it directly.
- Rate-limit identifiers are hashed, and old rate-limit windows are periodically cleaned up.

## Database
The D1 binding is named `DB`. The initial schema is in `migrations/0001_init.sql`; click analytics are in `migrations/0002_click_analytics.sql`; password protection is in `migrations/0003_password_protection.sql`.

## Local development
1. Install Node.js and Wrangler.
2. Apply the schema to local D1:
   `npx wrangler d1 execute undolink-db --local --file=migrations/0001_init.sql`
   `npx wrangler d1 execute undolink-db --local --file=migrations/0002_click_analytics.sql`
   `npx wrangler d1 execute undolink-db --local --file=migrations/0003_password_protection.sql`
3. Run `npx wrangler pages dev .`.
