# Milestone 29 — MCP server (remote HTTP + local stdio)

**Phase:** 8 · **Depends on:** M10, M28 (developer tools) · **Status:** Done

## Goal
Expose the platform to AI agents over the Model Context Protocol: tools to send/schedule/inspect
notifications, resources for channels/templates/deliveries, prompt templates, and an **approval gate** that
holds sensitive tool calls for human confirmation. Available both as a remote HTTP endpoint and a local
stdio binary.

## Why it matters
Agents are a first-class way to operate notification infrastructure. MCP makes every core capability callable
by an LLM, while approval gates keep destructive/sending actions under human control.

## Current state
- M28 (developer tools) added API keys + request logging; the remote MCP endpoint authenticates with the same keys.
- M10 send pipeline and the template/analytics routes already exist for the tools to call.

## Scope (in)
- **`@renderical/mcp`** package: a `createMcpServer(config)` factory exposing 8 tools (`list_channels`,
  `send_notification`, `schedule_notification`, `get_delivery_status`,
  `create_template`, `render_preview`, `query_analytics`, `approve_action`), 3 resources
  (`renderical://channels`, `://templates`, `://recent-deliveries`), and 3 prompts. Tools call the Worker
  over HTTP, threading the caller's auth.
- **Remote endpoint**: a stateless `/mcp` route using `WebStandardStreamableHTTPServerTransport`
  (per-request server, CORS-enabled) — works in Cloudflare Workers with `nodejs_compat`.
- **Local stdio binary** (`src/bin.ts`): reads `RENDERICAL_API_KEY`/`RENDERICAL_BASE_URL`, connects a
  `StdioServerTransport`.
- **Approval gates**: `send_notification` checks `mcp_approval_gate`; if approval is required it stores a
  `mcp_pending_action` and returns `{approvalToken, message}` instead of sending. `approve_action` replays
  the stored HTTP call.

## Data model
Migration `apps/api/migrations/0020_mcp.sql`:
- `mcp_approval_gate` (id, userId FK, tool, requiresApproval, createdAt, updatedAt) UNIQUE on `(userId, tool)`
- `mcp_pending_action` (id, userId FK, tool, payload, status, expiresAt, createdAt, updatedAt) — 24h expiry

Kysely `McpApprovalGateTable`, `McpPendingActionTable` added to `DB`.

## API surface
`requireAuth`, user-scoped:
- `GET/POST /api/mcp/gates`, `DELETE /api/mcp/gates/:id`
- `GET/POST /api/mcp/pending`
- `POST /api/mcp/pending/:id/approve` (replays the stored call), `POST /api/mcp/pending/:id/reject`

Plus the `/mcp` MCP transport endpoint (CORS-enabled, API-key auth).

## Frontend
- `McpSection` in `packages/views/src/pages/developers.tsx` — remote endpoint URL (copy), stdio binary
  command, approval-gates table (per-tool toggle + delete), pending-approvals list (approve/reject, 15s poll).
- `packages/core/src/hooks/mcp.ts` — `useMcpGates`, `useUpsertMcpGate`, `useDeleteMcpGate`, `useMcpPending`,
  `useApproveMcpAction`, `useRejectMcpAction`.
- Types `McpApprovalGate`, `McpPendingAction` in `packages/api-client/src/types.ts`.

## Implementation steps
1. Migration + Kysely interfaces (per M05).
2. Build `packages/mcp` (`tools.ts`, `resources.ts`, `prompts.ts`, `server.ts`, `bin.ts`); add `@renderical/mcp`
   to `apps/api`.
3. Mount the `/mcp` route in `index.ts` with the Web Standards streamable transport (stateless) + CORS.
4. MCP gate/pending CRUD routes; the approve endpoint replays the stored HTTP call with the caller's auth.
5. `McpSection` UI + hooks.

## Acceptance criteria
- [x] An MCP client can list tools/resources/prompts and call `list_channels`/`send_notification` against `/mcp`.
- [x] `send_notification` for a gated tool stores a pending action and returns an approval token instead of sending.
- [x] `approve_action` (or the approve route) replays the stored call and completes the send.
- [x] The stdio binary connects with env credentials and serves the same tools.
- [x] Gates and pending actions are user-scoped via `requireAuth`.

## Risks & notes
- Stateless per-request server (no Durable Objects) keeps the Worker simple; sessions aren't persisted.
- The approve path replays the original HTTP request (passing through auth headers) rather than calling
  internal functions, to avoid circular imports.
- `query_analytics` degrades to a delivery list where richer analytics aren't available.
