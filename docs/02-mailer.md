# Milestone 02 — Mailer: Cloudflare Email binding & transactional templates

**Phase:** 00 (Foundation) · **Depends on:** M01 · **Status:** Done

## Goal
Provide `@renderical/mailer`: a thin sender over the Cloudflare `send_email` binding with a console fallback
for local dev, plus the transactional email templates the auth flows need.

## Why it matters
Auth (M03/M04) can't function without verification, reset, and 2FA emails. Centralizing send + templates in
one package keeps the `from`/binding logic in a single place and lets local dev run without actually sending.

## Current state
- M01 bound `EMAIL` (Cloudflare `send_email`) on the Worker.
- No sending layer or templates exist.

## Scope (in)
- **Binding wrapper** (`packages/mailer/src/binding.ts`): resolves the live `env.EMAIL` binding, or a
  `consoleMock` that logs to stdout when `EMAIL_LOG_ONLY=true`. Accepts `string` or `{email, name}` senders.
- **Transactional templates** (`packages/mailer/src/emails/`), each with text + HTML variants:
  - `verify-email.ts` — account verification link
  - `reset-password.ts` — password reset link
  - `two-factor-otp.ts` — 2FA OTP code (monospace, ~3 min expiry)
  - `invitation.ts` — invitation email
  - `notification.ts` — generic notification email (later reused by the email channel, M10)
- **Public API** (`packages/mailer/src/index.ts`): `sendVerificationEmail`, `sendResetPasswordEmail`,
  `sendTwoFactorOTPEmail`, `sendInvitationEmail`, `sendNotificationEmail`, plus `EmailFrom` / `EmailUser` types.

## Implementation steps
1. `binding.ts` with the live-vs-console resolution keyed on `EMAIL_LOG_ONLY`.
2. The five templates (text + HTML).
3. Export the typed `send*` functions from `index.ts`.
4. Document `EMAIL_LOG_ONLY=true` in `apps/api/.dev.vars.example`.

## Acceptance criteria
- [x] `send*` helpers send via the Cloudflare Email binding in production.
- [x] With `EMAIL_LOG_ONLY=true`, emails are logged to the console instead of sent (local dev).
- [x] All five templates render text + HTML; the OTP template displays the code prominently.
- [x] Auth (M03/M04) sends verification / reset / 2FA emails through this package.

## Risks & notes
- The `notification.ts` template is the seed for the M10 email channel's delivery rendering.
- Sending-domain verification (DKIM/SPF/DMARC) is out of scope — relies on the Cloudflare Email binding.
