CREATE TABLE "connection" (
  "id" text not null primary key,
  "organizationId" text not null references "organization"("id") on delete cascade,
  "type" text not null,
  "name" text not null,
  "status" text not null default 'disabled',
  "config" text not null default '{}',
  "credentials" text,
  "scopes" text not null default '[]',
  "health" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "connection_org_type_idx" ON "connection" ("organizationId", "type");
