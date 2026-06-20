-- M17: delivery queue — retries, backoff, DLQ, idempotency

ALTER TABLE delivery ADD COLUMN nextRetryAt TEXT;
ALTER TABLE delivery ADD COLUMN lastError TEXT;

CREATE TABLE idempotency_key (
  userId      TEXT NOT NULL,
  key         TEXT NOT NULL,
  notificationId TEXT NOT NULL,
  expiresAt   TEXT NOT NULL,
  createdAt   TEXT NOT NULL,
  PRIMARY KEY (userId, key)
);

CREATE TABLE dead_letter (
  id             TEXT PRIMARY KEY,
  userId         TEXT NOT NULL,
  deliveryId     TEXT NOT NULL,
  notificationId TEXT NOT NULL,
  channel        TEXT NOT NULL,
  reason         TEXT NOT NULL,
  errorCode      TEXT,
  payload        TEXT NOT NULL,
  error          TEXT NOT NULL,
  attempts       INTEGER NOT NULL DEFAULT 0,
  failedAt       TEXT NOT NULL,
  createdAt      TEXT NOT NULL
);

CREATE INDEX idx_dead_letter_user_failed  ON dead_letter (userId, failedAt, id);
CREATE INDEX idx_dead_letter_user_channel ON dead_letter (userId, channel);
CREATE INDEX idx_dead_letter_user_notif   ON dead_letter (userId, notificationId);
