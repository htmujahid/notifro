CREATE TABLE "frequency_cap" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "channel" text not null,
  "topicId" text,
  "maxCount" integer not null,
  "windowSeconds" integer not null,
  "overflowPolicy" text not null default 'drop',
  "digestKey" text,
  "digestSchedule" text,
  "digestTemplateId" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "frequency_cap_user_idx" ON "frequency_cap" ("userId");

CREATE TABLE "delivery_counter" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "recipientId" text not null,
  "channel" text not null,
  "windowStart" text not null,
  "count" integer not null default 0
);
CREATE UNIQUE INDEX "delivery_counter_idx" ON "delivery_counter" ("userId", "recipientId", "channel", "windowStart");

CREATE TABLE "digest_rule" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "channel" text not null,
  "topicId" text,
  "digestKey" text not null,
  "schedule" text not null,
  "templateId" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "digest_rule_user_channel_topic_idx" ON "digest_rule" ("userId", "channel", COALESCE("topicId", ''));

CREATE TABLE "digest_bucket" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "recipientId" text not null,
  "channel" text not null,
  "digestKey" text not null,
  "schedule" text not null,
  "templateId" text,
  "status" text not null default 'open',
  "nextFlushAt" text not null,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "digest_bucket_flush_idx" ON "digest_bucket" ("status", "nextFlushAt");
CREATE INDEX "digest_bucket_open_idx" ON "digest_bucket" ("userId", "recipientId", "channel", "digestKey", "status");

CREATE TABLE "digest_item" (
  "id" text not null primary key,
  "bucketId" text not null references "digest_bucket"("id") on delete cascade,
  "notificationId" text not null,
  "payload" text not null,
  "createdAt" text not null
);
CREATE INDEX "digest_item_bucket_idx" ON "digest_item" ("bucketId");

CREATE TABLE "throttle_state" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "recipientId" text not null,
  "eventKey" text not null,
  "windowSeconds" integer not null,
  "lastSentAt" text,
  "debounceWindowSeconds" integer,
  "pendingUntil" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "throttle_state_idx" ON "throttle_state" ("userId", "recipientId", "eventKey");
