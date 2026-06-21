# Milestone 04 — Two-factor, phone OTP & API-key auth

**Phase:** 00 (Foundation) · **Depends on:** M03 · **Status:** Done

## Goal
Harden authentication with the better-auth plugins: **two-factor** (TOTP authenticator + email OTP + backup
codes), **phone number** verification via Twilio SMS OTP, and **API keys** (`rk_*`) so requests can
authenticate without a session — including the full 2FA setup/verify UI.

## Why it matters
2FA protects the single owner account that controls all sends. API-key auth is what lets the SDK/CLI (M31)
and MCP server (M32) call the platform programmatically. Both are better-auth plugins layered on the M03 core.

## Current state
- M03 established the better-auth core (email/password, Google, sessions) + the auth/account UI shell.

## Scope (in)
- **twoFactor plugin** (`auth.ts`): TOTP + email OTP (6-digit, ~5 min) via `sendTwoFactorOTPEmail`
  (`@workspace/mailer`); backup codes.
- **phoneNumber plugin**: SMS OTP via Twilio (6-digit, 300s) — `sendOTP` POSTs the Twilio Messages API with
  `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER`.
- **apiKey plugin**: `defaultPrefix: 'rk_'`, `enableMetadata: true` (stores `{mode: 'live'|'test'}`).
  Verified per request via `authInstance.api.verifyApiKey()`.
- **Session/API-key middleware** (`index.ts`): accepts `Authorization: Bearer rk_*` or `X-API-Key`, verifies
  the key, sets `c.var.user` from the key's `referenceId`, plus `c.var.sandboxMode` (from key metadata or
  `X-Renderical-Sandbox`) and `c.var.apiKeyId` for audit logging; falls back to the session cookie. CORS
  allows `X-API-Key` + `X-Renderical-Sandbox`.
- **Client plugins** (`packages/app/src/auth/client.ts`): `twoFactorClient()`, `phoneNumberClient()`.
- **2FA verify UI** (`packages/core/src/components/auth/two-factor-form.tsx`): three modes — TOTP, email OTP
  (`sendOtp`), backup code — with a trust-device flag; page at `packages/views/src/pages/auth/two-factor.tsx`.
- **2FA management UI** (`packages/core/src/components/account/`): `two-factor-settings`, `enable-flow`
  (QR + secret + backup codes), `disable-flow` (password confirm), `regenerate-backup-codes-flow`,
  `backup-code-grid`; page at `packages/views/src/pages/account/two-factor.tsx`.

## Data model
- `0001_two_factor.sql`: adds `user.twoFactorEnabled`; `twoFactor` table (userId FK, secret, backupCodes JSON,
  verified) + `twoFactor_userId_idx`.
- `0009_phone_number.sql`: adds `user.phoneNumber` (UNIQUE) + `user.phoneNumberVerified`; partial index
  `user_phone_number_idx`.
- `0025_apikey_plugin.sql`: better-auth `apikey` table (id, name, start, `referenceId` → user, `prefix`,
  `key` UNIQUE, enabled, rate-limit fields, `requestCount`, `lastRequest`, `expiresAt`, `permissions`,
  `metadata` JSON) + `apikey_referenceId_idx` / `apikey_key_idx`.

## API surface
- 2FA / phone / API-key endpoints are served under `/api/auth/*` by the better-auth plugins (enable/disable
  2FA, send/verify OTP, verify TOTP/backup code, phone verify, key verify).
- Developer-facing API-key **management** (`GET/POST/DELETE /api/keys`) is built on the apiKey plugin in M31.

## Implementation steps
1. Add `twoFactor`, `phoneNumber`, `apiKey` plugins to `createAuth` in `auth.ts`.
2. Migrations `0001_two_factor.sql`, `0009_phone_number.sql`, `0025_apikey_plugin.sql`; apply locally.
3. Extend the `index.ts` middleware to accept API keys (Bearer `rk_*` / `X-API-Key`) and set
   `sandboxMode` / `apiKeyId`; add CORS headers.
4. Add `twoFactorClient` / `phoneNumberClient` to the client.
5. Build the 2FA verify form (3 modes) + the account 2FA management flows.

## Acceptance criteria
- [x] A user can enable TOTP (QR + secret), and sign-in then requires a second factor.
- [x] Email OTP and backup codes both satisfy the 2FA challenge; backup codes can be regenerated.
- [x] Phone verification sends a Twilio SMS OTP and marks `phoneNumberVerified`.
- [x] A request with `Authorization: Bearer rk_*` (or `X-API-Key`) resolves to the key's owner.
- [x] A `test`-mode key sets `sandboxMode`; `apiKeyId` is recorded for audit logging.

## Risks & notes
- The `apikey` table is the better-auth plugin's own schema (migration 0025) — M31's developer tooling builds
  on it (an earlier custom `api_key` table from migration 0024 was superseded by the plugin).
- Twilio SMS OTP silently no-ops if the `TWILIO_*` env vars are unset (dev-friendly).
- API-key + session auth both populate the same `c.var.user`, so `requireAuth` (M06) treats them uniformly.
