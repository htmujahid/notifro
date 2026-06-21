CREATE TABLE "recipient" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "externalId" text,
  "email" text,
  "phone" text,
  "locale" text,
  "timezone" text,
  "attributes" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "recipient_user_external_idx" ON "recipient" ("userId", "externalId") WHERE "externalId" IS NOT NULL;
CREATE INDEX "recipient_user_email_idx" ON "recipient" ("userId", "email");
CREATE INDEX "recipient_user_updated_idx" ON "recipient" ("userId", "updatedAt");

CREATE TABLE "segment" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "name" text not null,
  "filter" text not null,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "segment_user_updated_idx" ON "segment" ("userId", "updatedAt");
CREATE INDEX "segment_user_name_idx" ON "segment" ("userId", "name");

CREATE TABLE "message_variant" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "notificationId" text not null references "notification"("id") on delete cascade,
  "label" text not null,
  "weight" integer not null default 50,
  "payload" text not null,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "message_variant_notification_idx" ON "message_variant" ("notificationId");
CREATE INDEX "message_variant_user_idx" ON "message_variant" ("userId");

ALTER TABLE "delivery" ADD COLUMN "recipientId" text;
ALTER TABLE "delivery" ADD COLUMN "variantId" text;
