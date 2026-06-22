CREATE TABLE "template" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "name" text not null,
  "slug" text not null,
  "description" text,
  "defaultLocale" text not null default 'en',
  "content" text not null,
  "variables" text,
  "localeStrings" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE UNIQUE INDEX "template_user_slug_idx" ON "template" ("userId", "slug");
CREATE INDEX "template_user_updatedAt_id_idx" ON "template" ("userId", "updatedAt" desc, "id");
CREATE INDEX "template_user_name_idx" ON "template" ("userId", "name");
CREATE INDEX "template_user_createdAt_idx" ON "template" ("userId", "createdAt" desc);

ALTER TABLE "notification" ADD COLUMN "templateId" text;
ALTER TABLE "notification" ADD COLUMN "templateData" text;
