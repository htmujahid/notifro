CREATE TABLE "topic" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "key" text not null,
  "name" text not null,
  "description" text,
  "defaultOptIn" integer not null default 1,
  "transactional" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "topic_user_key_idx" ON "topic" ("userId", "key");
CREATE INDEX "topic_user_created_idx" ON "topic" ("userId", "createdAt", "id");

CREATE TABLE "preference" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "recipientId" text not null references "recipient"("id") on delete cascade,
  "channel" text not null,
  "topicId" text references "topic"("id") on delete cascade,
  "optedIn" integer not null,
  "source" text not null,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "preference_idx" ON "preference" ("recipientId", "channel", COALESCE("topicId", ''));
CREATE INDEX "preference_recipient_idx" ON "preference" ("recipientId", "userId");

CREATE TABLE "channel_priority" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "recipientId" text not null references "recipient"("id") on delete cascade,
  "order" text not null,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "channel_priority_recipient_idx" ON "channel_priority" ("recipientId");
