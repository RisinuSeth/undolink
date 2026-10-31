ALTER TABLE links ADD COLUMN password_salt TEXT;
ALTER TABLE links ADD COLUMN password_hash TEXT;

CREATE TABLE IF NOT EXISTS unlock_rate_limits (
  ip_hash TEXT NOT NULL,
  slug TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, slug, window_start)
);
CREATE INDEX IF NOT EXISTS unlock_rate_limits_window_idx ON unlock_rate_limits(window_start);
