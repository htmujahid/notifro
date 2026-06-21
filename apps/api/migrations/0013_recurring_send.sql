CREATE TABLE IF NOT EXISTS recurring_send (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  payload TEXT NOT NULL,
  channels TEXT NOT NULL,
  cron TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  nextRunAt TEXT NOT NULL,
  lastRunAt TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recurring_send_user ON recurring_send (userId);
CREATE INDEX IF NOT EXISTS idx_recurring_send_due ON recurring_send (enabled, nextRunAt);
CREATE INDEX IF NOT EXISTS idx_recurring_send_list ON recurring_send (userId, createdAt, id);

CREATE TABLE IF NOT EXISTS recipient_send_time (
  userId TEXT PRIMARY KEY,
  bestHourLocal INTEGER NOT NULL DEFAULT 9,
  confidence REAL NOT NULL DEFAULT 0.0,
  computedAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

ALTER TABLE scheduled_message ADD COLUMN recurringSendId TEXT;

CREATE INDEX IF NOT EXISTS idx_sched_msg_recurring ON scheduled_message (recurringSendId, sendAt, id);
