CREATE TABLE "fallback_chain" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "name" text not null,
  "steps" text not null,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "fallback_chain_user_idx" ON "fallback_chain" ("userId");

CREATE TABLE "routing_rule" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "priority" integer not null,
  "enabled" integer not null default 1,
  "match" text not null,
  "targetChainId" text references "fallback_chain"("id"),
  "targetChannel" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "routing_rule_user_priority_idx" ON "routing_rule" ("userId", "priority");

ALTER TABLE "delivery" ADD COLUMN "chainId" text;
ALTER TABLE "delivery" ADD COLUMN "chainStepIndex" integer;
ALTER TABLE "delivery" ADD COLUMN "escalatedFromDeliveryId" text;
CREATE INDEX "delivery_chain_idx" ON "delivery" ("chainId", "chainStepIndex");
