create table "organization" ("id" text not null primary key, "name" text not null, "slug" text unique, "logo" text, "metadata" text, "createdAt" date not null);

create table "member" ("id" text not null primary key, "organizationId" text not null references "organization" ("id") on delete cascade, "userId" text not null references "user" ("id") on delete cascade, "role" text not null, "createdAt" date not null);

create table "invitation" ("id" text not null primary key, "organizationId" text not null references "organization" ("id") on delete cascade, "email" text not null, "role" text, "status" text not null, "expiresAt" date not null, "inviterId" text not null references "user" ("id") on delete cascade, "createdAt" date not null);

ALTER TABLE "session" ADD COLUMN "activeOrganizationId" text REFERENCES "organization" ("id");

create index "member_organizationId_idx" on "member" ("organizationId");
create index "member_userId_idx" on "member" ("userId");
create index "invitation_organizationId_idx" on "invitation" ("organizationId");
