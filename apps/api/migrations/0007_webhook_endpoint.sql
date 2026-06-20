CREATE TABLE "webhook_endpoint" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "url" text not null,
  "secret" text not null,
  "secretLast4" text not null,
  "headers" text,
  "description" text,
  "enabled" integer not null default 1,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "webhook_user_idx" ON "webhook_endpoint" ("userId");
CREATE INDEX "webhook_user_enabled_idx" ON "webhook_endpoint" ("userId", "enabled");
