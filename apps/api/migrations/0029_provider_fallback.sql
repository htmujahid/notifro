CREATE TABLE "provider_fallback" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "channel" text not null,
  "primaryConnectionId" text not null,
  "fallbackConnectionId" text not null,
  "createdAt" text not null
);
CREATE UNIQUE INDEX "provider_fallback_user_channel" ON "provider_fallback" ("userId", "channel");
