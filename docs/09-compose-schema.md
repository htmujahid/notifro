# Milestone 09 — Unified compose schema & per-channel transform contract

**Phase:** 1 · **Depends on:** M08 · **Status:** Done

## Goal
Define the **compose-once** payload: a single normalized, channel-agnostic Zod schema for message content
and recipients, plus the per-channel transform contract each `ChannelAdapter` implements to turn that
payload into a provider-specific shape. Transforms are stubs here; concrete bodies live in each channel
milestone.

## Why it matters
This is the platform's central differentiator: write a message once, deliver everywhere. A precise,
versioned payload schema is the contract the whole system — API, MCP server, templates, adapters — agrees
on.

## Current state
- M08 defined `ChannelAdapter` with a `transform(payload, ctx)` method and a forward-declared
  `ComposePayload = unknown`. This milestone replaces that placeholder with the real schema.
- The API already uses Zod via `@hono/zod-openapi`.

## Scope (in)
- **`ComposePayload` Zod schema** (`apps/api/src/compose/schema.ts`):
  - `content`: `title?`, `subject?`, `body` (`text` and/or `markdown`), `blocks?` (ordered typed blocks:
    `text`, `heading`, `image`, `divider`, `button`, `button_group`, `fields`), `attachments?`.
  - `metadata`: `category?`, `priority` (`low|normal|high|urgent`), `tags?`, `data?`.
  - `idempotencyKey?` (enforced in M21).
  - `recipient`: discriminated union — `user` (internal id) or `contact` (`{ email?, phone?, ... }`).
  - `localeHint?` and `timezoneHint?`.
- **Transform contract** (`apps/api/src/compose/transform.ts`): a `ChannelTransform<Provider>` type and
  stub transforms per channel type:
  - `email` → `{ to, from, subject, html, text }` (CF Email binding)
  - `webhook` → raw `ComposePayload` JSON (identity transform)
  - `web_push` → `{ title, body, icon?, data, actions? }`
  - `sms` → flattened plaintext (Twilio)
  - `whatsapp` → flattened plaintext (Twilio WhatsApp)
  - `telegram` → plaintext or Markdown (Telegram Bot API)
  - `in_app` → stored structured blocks (inbox UI, M11)
  - `slack` → Slack message payload (M18)
  - `discord` → Discord message payload (M19)
  - `teams` → Teams message payload (M19)
  - `mobile_push` → native push payload (M20)
  (M18–M20 add slack/discord/teams/mobile_push.)
  Stubs throw `not_implemented` until their channel milestone fills them in.
- **`renderPreview(payload, type)`** helper signature (used by Create page preview).
- Replace the M08 forward declaration so `ChannelAdapter.transform` is typed against the real `ComposePayload`.

## Out of scope (deferred)
- Template variables/conditionals/loops/localization → M25.
- Idempotency enforcement → M21.

## Data model
None — this is a payload/contract milestone.

## API surface
No standalone endpoints; `POST /api/notifications` (M10) accepts `ComposePayload` validated by this schema.

## Frontend
Export inferred `ComposePayload` types via `@renderical/api-client` types so the Create page and template
builder author against the same shape.

## Implementation steps
1. Create `apps/api/src/compose/schema.ts` with the Zod schemas; export inferred types.
2. Create `apps/api/src/compose/transform.ts` with stub transforms for all channel types (7 at M09; M18–M20 add four more).
3. Update `apps/api/src/channels/adapter.ts` to import the real `ComposePayload`.
4. Add `renderPreview(payload, type)` in `apps/api/src/compose/preview.ts`.
5. Re-export payload types from `@renderical/api-client` (`src/types.ts`).
6. Run `pnpm typecheck`.

## Acceptance criteria
- [x] `ComposePayload` parses a representative message and rejects malformed input with `422`.
- [x] `getTransform(type)` exists for every `ChannelType`; unimplemented ones signal `not_implemented`.
- [x] `ChannelAdapter.transform` is typed against `ComposePayload`; `pnpm typecheck` passes.
- [x] `ComposePayload` types are importable from `@renderical/api-client`.

## Risks & notes
- Keep the block model small but composable; resist channel-specific fields in the core payload.
- Each channel milestone (M10, M13–M20) replaces exactly one stub transform — design stubs to fail loudly
  at send time, never produce a silent malformed send.
