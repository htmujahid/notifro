CREATE TABLE "notification" (
  "id" text not null primary key,
  "organizationId" text not null references "organization"("id") on delete cascade,
  "createdByUserId" text references "user"("id"),
  "payload" text not null,
  "subject" text,
  "channels" text not null,
  "mode" text not null default 'transactional',
  "status" text not null default 'processing',
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "notification_org_createdAt_idx" ON "notification" ("organizationId", "createdAt", "id");
CREATE INDEX "notification_org_status_idx" ON "notification" ("organizationId", "status");

CREATE TABLE "delivery" (
  "id" text not null primary key,
  "organizationId" text not null references "organization"("id") on delete cascade,
  "notificationId" text not null references "notification"("id") on delete cascade,
  "channel" text not null,
  "recipient" text not null,
  "status" text not null default 'queued',
  "providerMessageId" text,
  "error" text,
  "attempts" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "delivery_notificationId_idx" ON "delivery" ("notificationId");
CREATE INDEX "delivery_org_status_idx" ON "delivery" ("organizationId", "status");
