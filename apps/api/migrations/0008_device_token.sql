CREATE TABLE "device_token" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "platform" text not null,
  "token" text not null unique,
  "active" integer not null default 1,
  "lastSeenAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "device_token_user_idx" ON "device_token" ("userId");
CREATE INDEX "device_token_user_active_idx" ON "device_token" ("userId", "active");
