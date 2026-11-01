const DAY = 24 * 60 * 60;
const BATCH_SIZE = 1000;
const MAX_BATCHES_PER_TABLE = 10;

async function deleteInBatches(db, sql, cutoff) {
  let deleted = 0;

  for (let batch = 0; batch < MAX_BATCHES_PER_TABLE; batch += 1) {
    const result = await db.prepare(sql).bind(cutoff).run();
    const changes = Number(result?.meta?.changes || 0);
    deleted += changes;
    if (changes < BATCH_SIZE) break;
  }

  return deleted;
}

export async function cleanupDatabase(db, now = Math.floor(Date.now() / 1000)) {
  const cutoffs = {
    expiredSessions: now,
    rateLimits: now - 7 * DAY,
    unlockAttempts: now - 2 * DAY,
    emailTokens: now - 30 * DAY,
    clickHistory: now - 90 * DAY
  };

  const tasks = [
    ["expiredSessions", "DELETE FROM sessions WHERE rowid IN (SELECT rowid FROM sessions WHERE expires_at <= ? LIMIT 1000)", cutoffs.expiredSessions],
    ["rateLimits", "DELETE FROM rate_limits WHERE rowid IN (SELECT rowid FROM rate_limits WHERE window_start < ? LIMIT 1000)", cutoffs.rateLimits],
    ["authRateLimits", "DELETE FROM auth_rate_limits WHERE rowid IN (SELECT rowid FROM auth_rate_limits WHERE window_start < ? LIMIT 1000)", cutoffs.rateLimits],
    ["unlockRateLimits", "DELETE FROM unlock_rate_limits WHERE rowid IN (SELECT rowid FROM unlock_rate_limits WHERE window_start < ? LIMIT 1000)", cutoffs.unlockAttempts],
    ["emailActionTokens", "DELETE FROM email_action_tokens WHERE rowid IN (SELECT rowid FROM email_action_tokens WHERE (expires_at < ? AND created_at < ?) OR (used_at IS NOT NULL AND used_at < ?) LIMIT 1000)", cutoffs.emailTokens],
    ["clickHistory", "DELETE FROM link_clicks WHERE rowid IN (SELECT rowid FROM link_clicks WHERE clicked_at < ? LIMIT 1000)", cutoffs.clickHistory]
  ];

  const deleted = {};
  for (const [name, sql, cutoff] of tasks) {
    if (name === "emailActionTokens") {
      let total = 0;
      for (let batch = 0; batch < MAX_BATCHES_PER_TABLE; batch += 1) {
        const result = await db.prepare(sql).bind(cutoff, cutoff, cutoff).run();
        const changes = Number(result?.meta?.changes || 0);
        total += changes;
        if (changes < BATCH_SIZE) break;
      }
      deleted[name] = total;
    } else {
      deleted[name] = await deleteInBatches(db, sql, cutoff);
    }
  }

  return { deleted, cutoffs };
}

export default {
  async scheduled(_controller, env) {
    const result = await cleanupDatabase(env.DB);
    console.log("UndoLink database cleanup completed", result);
  }
};
