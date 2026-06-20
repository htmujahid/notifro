CREATE TABLE "onboarding_state" (
  "userId" text not null primary key references "user"("id") on delete cascade,
  "completedSteps" text not null default '[]',
  "dismissed" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);
