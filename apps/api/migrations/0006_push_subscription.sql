CREATE TABLE "push_subscription" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "endpoint" text not null unique,
  "p256dh" text not null,
  "auth" text not null,
  "userAgent" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "push_sub_user_idx" ON "push_subscription" ("userId");
