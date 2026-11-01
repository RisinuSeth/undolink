CREATE INDEX IF NOT EXISTS link_clicks_clicked_at_idx ON link_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS email_action_tokens_expiry_idx ON email_action_tokens(expires_at);
CREATE INDEX IF NOT EXISTS email_action_tokens_used_idx ON email_action_tokens(used_at);
CREATE INDEX IF NOT EXISTS signup_diagnostics_created_at_idx ON signup_diagnostics(created_at);
