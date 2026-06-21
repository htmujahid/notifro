CREATE TABLE "rate_limit_rule" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "channel" text not null,
  "maxCount" integer not null,
  "windowSeconds" integer not null,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "rate_limit_rule_user_channel" ON "rate_limit_rule" ("userId", "channel");
