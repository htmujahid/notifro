CREATE TABLE "api_key" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "name" text not null,
  "keyHash" text not null,
  "prefix" text not null,
  "mode" text not null default 'live',
  "lastUsedAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "api_key_user_createdAt_idx" ON "api_key" ("userId", "createdAt" desc);
CREATE UNIQUE INDEX "api_key_hash_idx" ON "api_key" ("keyHash");

CREATE TABLE "api_request_log" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "apiKeyId" text,
  "method" text not null,
  "path" text not null,
  "status" integer not null,
  "latencyMs" integer,
  "createdAt" text not null
);
CREATE INDEX "api_request_log_user_createdAt_idx" ON "api_request_log" ("userId", "createdAt" desc);
