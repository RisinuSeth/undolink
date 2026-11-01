# UndoLink

Temporary links that stop redirecting when their time is up.

## Stack
- Cloudflare Pages with an advanced-mode Worker in `_worker.js`
- Cloudflare D1
- Plain HTML, CSS and JavaScript

## Current functionality
- Create short redirects with fixed expiry options: 15 minutes, 1 hour, 24 hours, 7 days or 30 days, or choose a custom expiry date and time within 30 days.
- Schedule a future activation time and pause or resume a link after creation.
- Optional custom slugs using 4–24 lowercase letters, numbers and hyphens.
- Optional password protection using PBKDF2-SHA-256 password hashes and per-link password-attempt limits.
- Optional click limits, including one-time links.
- Disable, permanently delete, pause, resume or extend a link by 24 hours using its private management key.
- Private click analytics: total clicks, click-limit status and the 10 most recent click timestamps.
- QR code generation and PNG download for created links.
- Only HTTP and HTTPS destinations are accepted; embedded URL credentials are rejected.
- Basic per-IP creation rate limiting (hashed IP identifier; 30 creations per hour).
- Browser-side guest dashboard with search, status filters, expiry sorting, summary counts and management actions.
- Email/password accounts with secure, HttpOnly session cookies and PBKDF2-SHA-256 password hashing.
- Email verification using single-use, expiring verification tokens.
- Password reset emails using single-use, expiring reset tokens.
- Account settings with password changes and active-session review/revocation.
- Account-owned links are stored in D1 and can be loaded from another device after login; existing guest links can be claimed using their private management keys.
- Bulk creation of up to 10 links per batch, with one expiry setting and individual management keys.

## Security and privacy notes
- Management keys are generated randomly; only their SHA-256 hashes are stored in D1. The browser stores the management key locally so it can manage links. Anyone with access to that browser profile may be able to manage those links.
- Click analytics store timestamps only. UndoLink does not currently store visitor IP addresses or user-agent strings for click analytics.
- Link passwords are never stored in plain text. Password verification uses PBKDF2-SHA-256 with a unique random salt and 120,000 iterations. Unlock attempts are rate-limited per IP hash and link.
- Expiry disables the UndoLink redirect. It does not delete, revoke or modify the original destination URL. Anyone who already knows the destination can still visit it directly.
- Rate-limit identifiers are hashed, and old rate-limit windows are periodically cleaned up.
- Account passwords are salted and hashed with PBKDF2-SHA-256 (210,000 iterations); sessions use random bearer tokens stored only as SHA-256 hashes and are delivered in Secure, HttpOnly, SameSite=Lax cookies.
- Account emails are sent through Resend. Verification links expire after 24 hours; password reset links expire after one hour. Tokens are single-use and only their SHA-256 hashes are stored.
- Password changes require the current password and revoke other sessions. Users can review active sessions and sign out individual sessions.
- Email verification and recovery require the Resend environment variables described below. Do not claim signup or recovery email delivery is working until a verified sender and API key are configured and tested.

## Database
The D1 binding is named `DB`. The schema migrations are `0001_init.sql` (links), `0002_click_analytics.sql` (click analytics), `0003_password_protection.sql` (password-protected links), `0004_scheduling_and_pause.sql` (scheduled and paused links), `0005_accounts.sql` (users, sessions and link ownership), `0006_email_verification_and_recovery.sql` (email verification and password recovery), `0007_terms_acceptances.sql` (Terms acceptance records), and `0008_retention_indexes.sql` (indexes used by scheduled cleanup).

## Email delivery setup

Transactional email uses the Resend API. Before enabling account signup, verify a sending domain in Resend and configure these Cloudflare Pages production variables under Settings → Variables and Secrets:
- `RESEND_API_KEY` — secret containing the Resend API key.
- `EMAIL_FROM` — verified sender, for example `UndoLink <accounts@your-verified-domain.example>` (replace with an address on your verified domain).
- `APP_ORIGIN` — optional canonical public origin, for example `https://undolink.pages.dev`; set this to the production hostname so verification and reset links do not point to preview deployments.

Redeploy after configuring variables. Until email delivery is configured, new registrations are saved as unverified and login is blocked; users can request another verification email after the provider is configured. Existing accounts created before this migration are marked verified to avoid locking them out.

## Local development
1. Install Node.js and Wrangler.
2. Apply the schema to local D1:
   `npx wrangler d1 execute undolink-db --local --file=migrations/0001_init.sql`
   `npx wrangler d1 execute undolink-db --local --file=migrations/0002_click_analytics.sql`
   `npx wrangler d1 execute undolink-db --local --file=migrations/0003_password_protection.sql`
   `npx wrangler d1 execute undolink-db --local --file=migrations/0004_scheduling_and_pause.sql`
   `npx wrangler d1 execute undolink-db --local --file=migrations/0005_accounts.sql`
   `npx wrangler d1 execute undolink-db --local --file=migrations/0006_email_verification_and_recovery.sql`
   `npx wrangler d1 execute undolink-db --local --file=migrations/0007_terms_acceptances.sql`
   `npx wrangler d1 execute undolink-db --local --file=migrations/0008_retention_indexes.sql`
3. Run `npx wrangler pages dev .`.

## Scheduled database maintenance
A separate Worker uses `maintenance/cleanup.js` and `wrangler.cleanup.toml` to run daily at 03:00 UTC. Deploy or update it with `npx wrangler deploy --config wrangler.cleanup.toml`. It removes expired sessions immediately; rate-limit records older than 7 days; password-unlock attempt records older than 2 days; expired/used email-action tokens and signup diagnostics older than 30 days; and click-history records older than 90 days. Deletions are processed in batches of up to 1,000 rows per table per run. Links, user accounts, and Terms acceptance records are not removed by this job.
