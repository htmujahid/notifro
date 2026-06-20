CREATE TABLE "inbox_message" (
  "id" text not null primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "notificationId" text references "notification"("id") on delete set null,
  "deliveryId" text references "delivery"("id") on delete set null,
  "title" text not null,
  "body" text,
  "icon" text,
  "url" text,
  "seenAt" text,
  "readAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);
CREATE INDEX "inbox_user_unread_idx" ON "inbox_message" ("userId", "readAt");
CREATE INDEX "inbox_user_createdAt_idx" ON "inbox_message" ("userId", "createdAt", "id");
