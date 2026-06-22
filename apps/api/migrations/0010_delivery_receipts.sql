ALTER TABLE delivery ADD COLUMN deliveredAt TEXT;
ALTER TABLE delivery ADD COLUMN openedAt TEXT;
ALTER TABLE delivery ADD COLUMN clickedAt TEXT;
ALTER TABLE delivery ADD COLUMN bouncedAt TEXT;

CREATE INDEX IF NOT EXISTS idx_delivery_user_deliveredAt ON delivery (userId, deliveredAt);
CREATE INDEX IF NOT EXISTS idx_delivery_user_openedAt ON delivery (userId, openedAt);
CREATE INDEX IF NOT EXISTS idx_delivery_user_clickedAt ON delivery (userId, clickedAt);
CREATE INDEX IF NOT EXISTS idx_delivery_user_bouncedAt ON delivery (userId, bouncedAt);

CREATE TABLE IF NOT EXISTS delivery_event (
  id TEXT PRIMARY KEY,
  deliveryId TEXT NOT NULL,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  at TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (deliveryId) REFERENCES delivery(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_delivery_event_delivery_type ON delivery_event (deliveryId, type);
CREATE INDEX IF NOT EXISTS idx_delivery_event_user_at ON delivery_event (userId, at);
