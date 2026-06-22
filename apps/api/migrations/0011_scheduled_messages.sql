CREATE TABLE IF NOT EXISTS scheduled_message (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  payload TEXT NOT NULL,
  channels TEXT NOT NULL,
  sendAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  timezone TEXT,
  quietHoursStart TEXT,
  quietHoursEnd TEXT,
  deliveryWindowStart TEXT,
  deliveryWindowEnd TEXT,
  respectQuietHours INTEGER NOT NULL DEFAULT 1,
  notificationId TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sched_msg_status_sendAt ON scheduled_message (status, sendAt);
CREATE INDEX IF NOT EXISTS idx_sched_msg_userId_sendAt_id ON scheduled_message (userId, sendAt, id);
CREATE INDEX IF NOT EXISTS idx_sched_msg_userId_createdAt ON scheduled_message (userId, createdAt);

CREATE TABLE IF NOT EXISTS recipient_profile (
  userId TEXT PRIMARY KEY,
  timezone TEXT,
  quietHoursStart TEXT,
  quietHoursEnd TEXT,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);
