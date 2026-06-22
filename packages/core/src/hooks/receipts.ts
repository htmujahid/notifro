// Receipts are webhook-only (SMS delivery callbacks via Twilio) — no frontend query/mutation hooks needed.
export const receiptKeys = { all: ["receipts"] as const };
