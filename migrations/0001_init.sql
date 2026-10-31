CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  max_clicks INTEGER,
  clicks INTEGER NOT NULL DEFAULT 0,
  disabled_at INTEGER,
  manage_token_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS links_expires_at_idx ON links(expires_at);
CREATE INDEX IF NOT EXISTS links_created_at_idx ON links(created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, window_start)
);
CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits(window_start);
