CREATE TABLE "template_version" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "templateId" text not null references "template"("id") on delete cascade,
  "version" integer not null,
  "content" text not null,
  "localeStrings" text,
  "variables" text,
  "createdAt" text not null
);

CREATE UNIQUE INDEX "template_version_unique_idx" ON "template_version" ("templateId", "version");
CREATE INDEX "template_version_user_createdAt_idx" ON "template_version" ("userId", "createdAt" desc, "id");
CREATE INDEX "template_version_templateId_version_idx" ON "template_version" ("templateId", "version" desc, "id");

CREATE TABLE "snippet" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "name" text not null,
  "content" text not null,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX "snippet_user_updatedAt_idx" ON "snippet" ("userId", "updatedAt" desc, "id");
CREATE INDEX "snippet_user_name_idx" ON "snippet" ("userId", "name");

CREATE TABLE "brand_kit" (
  "id" text not null primary key,
  "userId" text not null unique references "user"("id") on delete cascade,
  "logoUrl" text,
  "colors" text,
  "fontStack" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
