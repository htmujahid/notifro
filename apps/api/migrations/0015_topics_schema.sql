CREATE TABLE "topic" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "key" text not null,
  "name" text not null,
  "description" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "topic_user_key_idx" ON "topic" ("userId", "key");
CREATE INDEX "topic_user_created_idx" ON "topic" ("userId", "createdAt", "id");
