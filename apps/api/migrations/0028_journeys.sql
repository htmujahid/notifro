CREATE TABLE "journey" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "name" text not null,
  "status" text not null default 'draft',
  "trigger" text,
  "steps" text not null,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "journey_user_idx" ON "journey" ("userId");

CREATE TABLE "journey_run" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "journeyId" text not null references "journey"("id") on delete cascade,
  "recipientId" text not null references "recipient"("id") on delete cascade,
  "status" text not null default 'active',
  "currentStepId" text not null,
  "nextResumeAt" text,
  "context" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "journey_run_resume_idx" ON "journey_run" ("status", "nextResumeAt");
CREATE UNIQUE INDEX "journey_run_unique" ON "journey_run" ("journeyId", "recipientId");

CREATE TABLE "journey_event" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "name" text not null,
  "recipientId" text,
  "payload" text not null default '{}',
  "createdAt" text not null
);
CREATE INDEX "journey_event_user_name_idx" ON "journey_event" ("userId", "name", "createdAt");
