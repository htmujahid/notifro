# Milestone 03 — Authentication (better-auth: email/password, verification, Google OAuth, sessions)

**Phase:** 00 (Foundation) · **Depends on:** M01, M02 · **Status:** Done

## Goal
Stand up authentication with **better-auth**: email/password with required email verification, Google OAuth,
KV-backed sessions with edge rate limiting, the session middleware that populates `c.var.user`/`c.var.session`,
and the sign-in / sign-up / verify / reset UI shared across all clients.

## Why it matters
Every product route is gated on a logged-in user (the platform is single-user, scoped by `userId`). Auth is
the gate; better-auth owns it so milestones never hand-roll sessions or password hashing.

## Current state
- M01 mounts the Worker + `KV` binding; M02 sends transactional emails.
- The product is **single-user** — no `organization` plugin, no multi-tenancy, no RBAC roles.

## Scope (in)
- **better-auth config** (`apps/api/src/lib/auth.ts`): `createAuth(db)` with
  - `emailAndPassword` (`requireEmailVerification: true`) → verification + reset emails via `@renderical/mailer`
  - `emailVerification` (`sendOnSignIn`, `autoSignInAfterVerification`)
  - `socialProviders.google` (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`)
  - `secondaryStorage: kvSecondaryStorage(env.KV)` — sessions + rate-limit counters in KV (min 60s TTL)
  - `rateLimit` (secondary storage, 100 req / 60s)
  - `trustedOrigins` including `renderical://` deep-link schemes for desktop/mobile
- **Helpers**: `mock-db.ts` (no-op D1 for build/codegen), `kv-storage.ts` (KV `secondaryStorage` adapter).
- **Route mounting** (`apps/api/src/index.ts`): `app.on(['POST','GET'], '/api/auth/*', …)` → `authInstance.handler`.
- **Session middleware**: resolves the session via `authInstance.api.getSession()` and sets
  `c.var.user` / `c.var.session` (extended in M04 for API keys); CORS allows credentials.
- **Client** (`packages/app/src/auth/`): `createBaseAuthClient` (`client.ts`) + web (`client.web.ts`,
  `credentials: 'include'`) and mobile (`client.mobile.ts`, Capacitor cookie handling) variants;
  `AuthProvider`/`useAuth` context; `useSession()` React Query hook; `deep-link.ts` for OAuth callbacks.
- **UI**: auth pages (`packages/views/src/pages/auth/`) + form components
  (`packages/core/src/components/auth/`): sign-in (with Google button), sign-up, verify-email,
  forgot-password, reset-password. Validation schemas in `packages/core/src/schemas/auth.ts`.
- **Account management** (`packages/views/src/pages/account/` + `packages/core/src/components/account/`):
  profile (name/avatar), security (change email, change password → revokes other sessions, delete account).

## Data model
Migration `apps/api/migrations/0000_auth_schema.sql` (better-auth core):
- `user` (id, name, email UNIQUE, emailVerified, image, timestamps)
- `account` (OAuth/social + password: providerId, accountId, userId FK, tokens, password, scope) + `account_userId_idx`
- `session` (id, expiresAt, token UNIQUE, ipAddress, userAgent, userId FK) + `session_token_idx`
- `verification` (identifier, value, expiresAt) + `verification_identifier_idx`

## API surface
- `POST|GET /api/auth/*` — all better-auth endpoints (sign-up/in/out, OAuth callback, email verification,
  password reset). Owned by better-auth — not hand-rolled.

## Implementation steps
1. `kv-storage.ts` (KV secondaryStorage) + `mock-db.ts`.
2. `auth.ts`: `createAuth(db)` with email/password + verification + Google + KV storage + rate limiting.
3. Mount `/api/auth/*` + the session middleware in `index.ts`.
4. Migration `0000_auth_schema.sql`; apply locally.
5. Client auth package (base + web + mobile variants, context, `useSession`).
6. Auth + account UI pages/components + validation schemas.

## Acceptance criteria
- [x] Sign-up requires email verification before access; the verification email arrives via the mailer.
- [x] Email/password sign-in establishes a KV-backed session readable on every request as `c.var.user`.
- [x] Google OAuth signs a user in and creates an `account` row.
- [x] Password reset works end-to-end via a signed emailed link.
- [x] Account pages support profile edit, email/password change, and account deletion.
- [x] No `organization` plugin, no RBAC — auth resolves to a single user.

## Risks & notes
- Sessions live in KV (edge-cached) — never read them straight from D1.
- 2FA, phone OTP, and API-key auth are layered on in M04.
- `requireAuth` (the per-route guard built on `c.var.user`) is formalized in M06.
