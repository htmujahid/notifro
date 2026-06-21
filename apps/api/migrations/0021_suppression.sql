CREATE TABLE "suppression" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "channel" text not null,
  "address" text not null,
  "reason" text not null,
  "createdAt" text not null
);
CREATE UNIQUE INDEX "suppression_user_channel_addr" ON "suppression" ("userId", "channel", "address");

CREATE TABLE "consent_event" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "recipientId" text,
  "channel" text not null,
  "topicId" text,
  "event" text not null,
  "source" text not null,
  "actorNote" text,
  "createdAt" text not null
);
CREATE INDEX "consent_event_user_idx" ON "consent_event" ("userId", "createdAt" desc);
