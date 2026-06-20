alter table "user" add column "twoFactorEnabled" integer;

create table "twoFactor" (
  "id" text not null primary key,
  "userId" text not null references "user" ("id") on delete cascade,
  "secret" text not null,
  "backupCodes" text not null,
  "verified" integer
);

create index "twoFactor_userId_idx" on "twoFactor" ("userId");
