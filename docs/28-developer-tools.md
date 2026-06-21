# Milestone 28 — Developer tools: API keys, SDK & CLI

**Phase:** 8 · **Depends on:** M10, M06 · **Status:** Done

## Goal
Let the owner drive the platform programmatically: issue hashed API keys, authenticate requests with them,
log every API call, run sends in a non-destructive **sandbox** mode, and ship a typed SDK + a CLI.

## Why it matters
A notification platform is only useful if it can be called from code. API keys + an SDK + a CLI turn the
product into infrastructure; the request log and sandbox mode make integrating safe and debuggable.

## Current state
- M06 established `requireAuth`, the error model, and the list-query contract; M10 is the send pipeline.
- M04 enabled the better-auth `apiKey` plugin (`rk_*` prefix, metadata) and the per-request middleware that
  accepts `Authorization: Bearer rk_*` / `X-API-Key` and sets `sandboxMode`/`apiKeyId`. This milestone builds
  the developer-facing tooling on top of it.

## Scope (in)
- **API keys (better-auth `apiKey` plugin)**: keys carry a `prefix`, a `mode` in `metadata`
  (`{mode: 'live'|'test'}`), and an `enabled` flag; the plaintext is shown exactly once on creation. Keys are
  created/listed/revoked via `authInstance.api` and stored in the plugin's `apikey` table (M04, migration
  `0025_apikey_plugin.sql`). An earlier custom `api_key` table (migration `0024_api_keys.sql`) was superseded
  by the plugin.
- **API-key auth**: provided by the M04 middleware — `verifyApiKey()` resolves the key to its owner and sets
  `sandboxMode`/`apiKeyId`, falling back to session auth. This milestone consumes it.
- **`api_request_log`**: fire-and-forget log of every `/api/*` call (method, path, status, latencyMs);
  `redactPii()` applied to the path.
- **Sandbox mode**: a `test`-mode key (or `X-Renderical-Sandbox` header) makes `notifications.ts` insert a
  `mode='sandbox'` notification and return `{deliveries, previews}` without actually sending.
- **SDK** (`packages/sdk`): `createRendericalClient({baseUrl, apiKey})` with `.send()`, `.preview()`,
  `.listDeliveries()`, `.keys.*`, `.requestLog()`.
- **CLI** (`packages/cli`): `send` / `preview` / `logs` / `keys list` / `keys create`, reading
  `RENDERICAL_API_KEY` + `RENDERICAL_BASE_URL`.

## Data model
- **API keys**: the better-auth `apikey` table (M04, migration `0025_apikey_plugin.sql`) — no new table here.
- **Request log**: migration `apps/api/migrations/0024_api_keys.sql` →
  `api_request_log` (id, userId FK, apiKeyId, method, path, status, latencyMs, createdAt). (This migration
  also created the now-superseded custom `api_key` table.)

Kysely `ApiRequestLogTable` added to `DB`. `Variables` already carry `sandboxMode`/`apiKeyId` from M04.

## API surface
`requireAuth`, user-scoped:
- `GET /api/keys` (paginated, no hash/secret returned), `POST /api/keys` (returns plaintext once),
  `DELETE /api/keys/:id`
- `GET /api/request-log` (paginated, filterable method/status/path, sortable createdAt)

## Frontend
- `packages/views/src/pages/developers.tsx` — `ApiKeysSection` (create/revoke, copy-once secret, mode badge),
  `SandboxPanel` (compose + preview + real send), `RequestLogSection` (30s refetch).
- `packages/core/src/hooks/developers.ts` — `useApiKeys`, `useCreateApiKey`, `useRevokeApiKey`, `useRequestLog`.
- Developers route in `_shared.tsx`; Developers nav item in `app-sidebar.tsx`.
- Types `ApiKey`, `ApiKeyWithSecret`, `ApiRequestLog` in `packages/api-client/src/types.ts`.

## Implementation steps
1. Add the `api_request_log` migration + its Kysely interface (per M05).
2. Add the fire-and-forget request-logging middleware on `/api/*` (the API-key/session/sandbox middleware
   itself ships in M04).
3. Key routes (`/api/keys`) backed by `authInstance.api` (create/list/revoke via the apiKey plugin).
4. Add the sandbox branch to `notifications.ts` (preview-only, no send).
5. Request-log route; build `packages/sdk` and `packages/cli`.
6. Developers page + hooks + nav.

## Acceptance criteria
- [x] `POST /api/keys` returns the plaintext key once; `GET /api/keys` never returns the hash or secret.
- [x] A request authenticated with `Authorization: Bearer rk_*` resolves to the owning user.
- [x] Every `/api/*` call is logged with method/path/status/latency; PII in the path is redacted.
- [x] A `test`-mode key (or sandbox header) returns previews without delivering.
- [x] The SDK and CLI build and can send/preview/list against a running API.

## Risks & notes
- Keys are managed by the better-auth `apiKey` plugin (M04), not a hand-rolled table — creation/verification
  goes through `authInstance.api`. The earlier custom `api_key` table (migration 0024) is superseded.
- Request logging is best-effort (fire-and-forget) so it never blocks the response.
- MCP (M32) builds on these keys for remote tool auth.
