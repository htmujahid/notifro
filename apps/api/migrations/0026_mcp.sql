CREATE TABLE "mcp_approval_gate" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "tool" text not null,
  "requiresApproval" integer not null default 1,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE UNIQUE INDEX "mcp_approval_gate_user_tool" ON "mcp_approval_gate" ("userId", "tool");

CREATE TABLE "mcp_pending_action" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "tool" text not null,
  "payload" text not null,
  "status" text not null default 'pending',
  "expiresAt" text not null,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "mcp_pending_action_user_status_idx" ON "mcp_pending_action" ("userId", "status");
