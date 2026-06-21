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
