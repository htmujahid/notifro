-- Add phone number fields to user table for Better Auth phoneNumber plugin
ALTER TABLE "user" ADD COLUMN "phoneNumber" TEXT;
ALTER TABLE "user" ADD COLUMN "phoneNumberVerified" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "user_phone_number_idx" ON "user" ("phoneNumber") WHERE "phoneNumber" IS NOT NULL;
