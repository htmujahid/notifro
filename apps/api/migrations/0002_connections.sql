CREATE TABLE "connection" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "type" text not null,
  "name" text not null,
  "status" text not null default 'active',
  "config" text not null default '{}',
  "credentials" text,
  "scopes" text not null default '[]',
  "health" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "connection_user_type_idx" ON "connection" ("userId", "type");
CREATE INDEX "connection_user_createdAt_idx" ON "connection" ("userId", "createdAt", "id");
