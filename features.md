# Renderical — Feature Reference

> Single-user, cross-platform notification infrastructure running on Cloudflare edge.
> Organised by module / package. Each section lists what is **implemented**, key files, data models, and integration points.

---

## Table of Contents

1. [Monorepo Structure](#monorepo-structure)
2. [apps/api — Cloudflare Workers Backend](#appsapi--cloudflare-workers-backend)
   - [Authentication & API Keys](#authentication--api-keys)
   - [Channels & Adapters](#channels--adapters)
   - [Notification Compose & Send](#notification-compose--send)
   - [Delivery Queue & Retry](#delivery-queue--retry)
   - [Scheduling & Recurring Sends](#scheduling--recurring-sends)
   - [Topics](#topics)
   - [Suppression & Compliance](#suppression--compliance)
   - [Templates & Snippets](#templates--snippets)
   - [Analytics & Tracking](#analytics--tracking)
   - [Inbox (In-App Messages)](#inbox-in-app-messages)
   - [Web Push Subscriptions](#web-push-subscriptions)
   - [Brand Kit](#brand-kit)
   - [Rate Limits](#rate-limits)
   - [API Request Logging](#api-request-logging)
   - [MCP Server Endpoint](#mcp-server-endpoint)
   - [Sandbox / Test Mode](#sandbox--test-mode)
3. [packages/core — UI Component Library](#packagescore--ui-component-library)
4. [packages/views — Pages & Routing](#packagesviews--pages--routing)
5. [packages/app — Cross-Platform Auth Shell](#packagesapp--cross-platform-auth-shell)
6. [packages/mailer — Transactional Email](#packagesmailer--transactional-email)
7. [packages/mcp — MCP Server Package](#packagesmcp--mcp-server-package)
8. [packages/sdk — TypeScript SDK](#packagessdk--typescript-sdk)
9. [packages/cli — CLI Tool](#packagescli--cli-tool)
10. [packages/templating — Template Engine](#packagestemplating--template-engine)
11. [packages/api-client — Frontend API Client](#packagesapi-client--frontend-api-client)
12. [packages/ui — UI Primitives (shadcn)](#packagesui--ui-primitives-shadcn)
13. [apps/web — Web App](#appsweb--web-app)
14. [apps/desktop — Electron Desktop App](#appsdesktop--electron-desktop-app)
15. [apps/ios & apps/android — Capacitor Mobile Apps](#appsios--appsandroid--capacitor-mobile-apps)
16. [apps/site — Marketing Site (Astro)](#appssite--marketing-site-astro)
17. [Database Schema Summary](#database-schema-summary)
18. [API Route Index](#api-route-index)

---

## Monorepo Structure

```
renderical/
├── apps/
│   ├── api/          # Cloudflare Worker — all backend logic
│   ├── web/          # Vite + React SPA
│   ├── desktop/      # Electron (Forge) desktop app
│   ├── ios/          # Capacitor iOS wrapper
│   ├── android/      # Capacitor Android wrapper
│   └── site/         # Astro marketing site (CF Pages)
└── packages/
    ├── core/         # Feature-level UI components & hooks (React)
    ├── views/        # Page components & platform-specific routers
    ├── app/          # Auth client adapters (web / desktop / mobile)
    ├── api-client/   # Typed HTTP client for frontend use
    ├── sdk/          # Public TypeScript SDK
    ├── cli/          # `renderical` CLI
    ├── mcp/          # MCP (Model Context Protocol) server
    ├── mailer/       # Transactional email templates (CF Email)
    ├── templating/   # Mustache-style template engine
    ├── ui/           # shadcn-generated UI primitives
    ├── ui-primitives/# Theme provider
    └── i18n/         # Internationalisation stubs
```

Tooling: **pnpm workspaces + Turborepo**, framework **Hono** (API), **React 19** (UI), **better-auth** (auth), **Kysely** (D1 query builder), **Cloudflare D1** (SQLite DB), **Cloudflare Queues** (delivery), **Cloudflare KV** (sessions), **Cloudflare Email** (mailer), **@hono/zod-openapi** (typed API), **Scalar** (API docs).

---

## apps/api — Cloudflare Workers Backend

Entry: `apps/api/src/index.ts`

### Authentication & API Keys

**Stack:** [better-auth](https://better-auth.js.org) with plugins: `emailOtp`, `twoFactor`, `phoneNumber`, `apiKey`.

| Feature | Detail |
|---|---|
| Email + Password sign-up | Requires email verification before access |
| Email OTP verification | 6-digit OTP, 5-min TTL, sent via Cloudflare Email |
| Password reset via OTP | OTP emailed; separate reset-password flow |
| Google OAuth | Configured via `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` |
| Two-Factor Authentication (TOTP) | Authenticator-app TOTP via `twoFactor` plugin |
| Two-Factor OTP (email) | Backup 2FA via email OTP |
| Phone number OTP | SMS verification via Twilio (`TWILIO_*` env vars) |
| Backup codes | Generated on 2FA enable; regenerable |
| API Key management | Prefix `rk_`, `live` and `test` (sandbox) modes, per-key metadata |
| Session management | KV-backed secondary storage; `trustedOrigins` CORS guard |
| Rate limiting | 100 req / 60 s per account via KV |

Files: `apps/api/src/lib/auth.ts`, `apps/api/src/middleware/auth.ts`

Auth endpoints live under `/api/auth/*` and are fully handled by better-auth (no custom implementation needed).

---

### Channels & Adapters

All adapters are registered into a global registry (`channels/registry.ts`) at startup. Each implements a common `ChannelAdapter` interface: `type`, `transform(payload, ctx)`, `send(provider, conn, ctx)`.

| Channel | File | Provider/Protocol |
|---|---|---|
| Email | `channels/email.ts` | SMTP / SendGrid / Resend (via `connection.config`) |
| SMS | `channels/sms.ts` | Twilio SMS |
| WhatsApp | `channels/whatsapp.ts` | Twilio WhatsApp |
| Telegram | `channels/telegram.ts` | Telegram Bot API |
| Slack | `channels/slack.ts` | Slack Incoming Webhooks / API |
| Discord | `channels/discord.ts` | Discord Webhook |
| Microsoft Teams | `channels/teams.ts` | Teams Incoming Webhook |
| Web Push | `channels/web-push/adapter.ts` | VAPID push; encrypted with `web-push/encrypt.ts` |
| Webhook | `channels/webhook/adapter.ts` | HTTP POST; HMAC-SHA256 signed (`webhook/sign.ts`) |
| In-App | `channels/in-app.ts` | Writes to `inbox_message` table |

**Connection model:** Each channel provider is stored as a `Connection` row with `type`, `name`, `status` (active/inactive), `config` (JSON provider config), `credentials` (JSON secrets), `scopes`, and `health`.

Route `GET/POST/PATCH/DELETE /api/connections` — CRUD for connections.

---

### Notification Compose & Send

**Compose Schema** (`apps/api/src/compose/schema.ts`):

```
ComposePayload {
  schemaVersion: "1"
  recipient: user | contact
  channels: ChannelType[]
  content: {
    title?, subject?, body (text|markdown),
    blocks (text|heading|image|divider|button|button_group|fields)[],
    attachments[]
  }
  metadata: { category?, priority (low|normal|high|urgent), tags[], data{} }
  idempotencyKey?
  localeHint?, timezoneHint?
  trackOpens, trackClicks
  sendAt?, sendAtLocal?
  quietHoursStart?, quietHoursEnd? (HH:MM)
  deliveryWindowStart?, deliveryWindowEnd? (HH:MM)
  respectQuietHours
  topicKey?
}
```

**Recipient types:**
- `user` — owner's own user account (email auto-resolved)
- `contact` — ad-hoc address (email, phone, slackUserId, discordUserId, teamsUserId, pushSubscription)

**Send flow** (`routes/notifications.ts`):
1. Parse + validate `ComposePayload`
2. Idempotency key check
3. Resolve connection per channel
4. Create `notification` row + one `delivery` row per channel
5. Enqueue `DeliveryQueueMessage` → `DELIVERY_Q`

**Sandbox mode** — `X-Renderical-Sandbox: true` header or test-mode API key; returns preview without sending; marks `sandboxMode: true` in response.

**Preview** (`/api/notifications` + sandbox header) — dry-run render with channel-specific output preview.

Files: `apps/api/src/compose/`, `apps/api/src/routes/notifications.ts`, `apps/api/src/routes/_template.ts`

---

### Delivery Queue & Retry

Cloudflare Queue consumer at `queue/consumer.ts`.

**Per-message flow:**
1. Load `delivery` + `notification` rows
2. Check suppression list; mark `suppressed` if hit
3. Resolve connection
4. Render template if attached
5. Call adapter `send()`
6. On success: mark `delivered`, log `delivery_event`
7. On retryable error (timeout / 429 / 502-504): exponential backoff up to `MAX_ATTEMPTS=5`; `msg.retry({ delaySeconds })`
8. On permanent error: move to `dead_letter`

**Backoff formula:** `min(10×2^(attempts−1), 3600) × (1 + rand(0.2))`

**DLQ handler:** Catches messages that exhausted queue retries; finalises to `dead_letter` table.

**PII redaction:** Error strings passed through `redactPii()` before persistence.

Files: `apps/api/src/queue/consumer.ts`, `apps/api/src/lib/suppress.ts`, `apps/api/src/lib/redact.ts`

---

### Scheduling & Recurring Sends

**One-time schedules** (`scheduled_message` table):
- `sendAt` (UTC ISO), `timezone`, `status` (pending → enqueued)
- Optional quiet-hours override (`quietHoursStart/End`)
- Optional delivery window (`deliveryWindowStart/End`)
- `respectQuietHours` flag (ignored for `high`/`urgent` priority)

**Recurring sends** (`recurring_send` table):
- `cron` expression + `timezone`
- `nextRunAt` advanced on each sweep using `nextCronRun()` (custom cron parser)
- Each run spawns a `scheduled_message` row then advances `nextRunAt`
- Invalid cron disables the recurring send

**Sweep** (`scheduling/sweep.ts`) — Cloudflare Cron Trigger (scheduled Worker):
1. Fetch up to 100 due `scheduled_message` rows
2. Apply quiet-hours / delivery-window: reschedule if blocked
3. Create `notification` + `delivery` rows, enqueue to `DELIVERY_Q`
4. Process up to 50 due `recurring_send` rows

Files: `apps/api/src/scheduling/`, `apps/api/src/routes/schedules.ts`, `apps/api/src/routes/recurring.ts`

---

### Topics

**Topics** (`topic` table):
- `key` (slugged string), `name`, `description` — used to tag notifications in logs and analytics
- CRUD: `GET/POST/PATCH/DELETE /api/topics`

Files: `apps/api/src/routes/topics.ts`

---

### Suppression & Compliance

**Suppression list** (`suppression` table):
- Per `(channel, address)` — checked before every send
- Reasons: bounce, complaint, manual
- `isSuppressed()` short-circuits delivery before calling adapter

**Compliance routes:**
- `GET/POST/DELETE /api/compliance/suppressions`
- Hard-bounce receipts from providers written here

**Receipts** (`/webhooks/receipts/*`): Inbound provider callbacks for bounce / complaint / delivery events. Updates delivery rows and can add to suppression list.

Files: `apps/api/src/lib/suppress.ts`, `apps/api/src/routes/compliance.ts`, `apps/api/src/routes/receipts.ts`

---

### Templates & Snippets

**Templates** (`template` table):
- `name`, `slug`, `description`, `defaultLocale`
- `content` (JSON blob with `title`, `body.text`, `body.markdown`, `blocks[]`)
- `variables` (JSON schema for template variables)
- `localeStrings` (JSON map `{ [locale]: { [key]: string } }`)

**Template versions** (`template_version` table):
- Each save creates a new version row
- Versions store full `content`, `localeStrings`, `variables` snapshots
- Routes: `GET /api/templates/:id/versions`, `POST /api/templates/:id/versions/:versionId/restore`

**Snippets** (`snippet` table):
- Reusable content fragments: `name`, `content`
- CRUD: `GET/POST/PATCH/DELETE /api/snippets`

**Template engine** (`packages/templating/src/engine.ts`):
- Custom Mustache-like syntax `{{ variable }}`, `{{ t.i18n_key }}`, `{{ var | "default" }}`
- Control flow: `{{#if cond}}...{{else}}...{{/if}}`
- Iteration: `{{#each items as item}}...{{/each}}` (max 100 iterations)
- Nested dot-path resolution, array coercion to comma-separated string
- Output size limit: 100 KB
- `renderString(template, ctx, localeStrings)` — core function
- `renderValue(value, ctx, localeStrings)` — recursively renders strings inside objects/arrays

Files: `apps/api/src/routes/templates.ts`, `apps/api/src/routes/template-versions.ts`, `apps/api/src/routes/snippets.ts`, `packages/templating/src/engine.ts`

---

### Analytics & Tracking

**Delivery events** (`delivery_event` table): Per-delivery lifecycle events: `delivered`, `opened`, `clicked`, `bounced`.

**Tracking** (`/t/*` routes):
- `GET /t/o/:token` — open pixel; writes `openedAt` to delivery
- `GET /t/c/:token` — click redirect; writes `clickedAt` and redirects to original URL
- PII-safe token: HMAC-signed delivery ID
- `trackOpens` / `trackClicks` flags in compose payload control whether links are wrapped

**Analytics API** (`/api/analytics`): Aggregated delivery stats by channel / status / date range.

**Overview** (`/api/overview`): Dashboard summary metrics (counts, recent activity).

Files: `apps/api/src/lib/tracking.ts`, `apps/api/src/routes/tracking.ts`, `apps/api/src/routes/analytics.ts`, `apps/api/src/routes/overview.ts`

---

### Inbox (In-App Messages)

**Inbox messages** (`inbox_message` table):
- Written by the `in_app` channel adapter on successful delivery
- Fields: `title`, `body`, `icon`, `url`, `seenAt`, `readAt`
- Routes: `GET /api/inbox`, `PATCH /api/inbox/:id` (mark seen/read), `DELETE /api/inbox/:id`

Files: `apps/api/src/channels/in-app.ts`, `apps/api/src/routes/inbox.ts`

---

### Web Push Subscriptions

**Push subscriptions** (`push_subscription` table):
- Browser `PushSubscription` object stored as `{ endpoint, p256dh, auth }`
- `userAgent` recorded for identification
- Routes: `POST /api/push/subscribe`, `DELETE /api/push/unsubscribe`, `GET /api/push/vapid-public-key`

**VAPID key pair** stored in KV; generated on first request.

**Encryption** (`channels/web-push/encrypt.ts`): AES-GCM payload encryption per the Web Push spec. VAPID JWT signed with P-256 key (`channels/web-push/vapid.ts`).

Files: `apps/api/src/channels/web-push/`, `apps/api/src/routes/push.ts`

---

### Brand Kit

**Brand kit** (`brand_kit` table):
- `logoUrl`, `colors` (JSON palette), `fontStack`
- Used by email template renderer to inject brand variables
- Routes: `GET /api/brand-kit`, `PUT /api/brand-kit`

Files: `apps/api/src/routes/brand-kit.ts`

---

### Rate Limits

**Rate limit rules** (`rate_limit_rule` table):
- Per `channel`: `maxCount` in `windowSeconds`
- Applied per user+channel before delivery
- Routes: `GET/POST/PATCH/DELETE /api/rate-limits`

**Auth-layer rate limit:** 100 API requests / 60 s per account stored in KV.

Files: `apps/api/src/lib/rate-limit.ts`, `apps/api/src/routes/rate-limits.ts`

---

### API Request Logging

**Request log** (`api_request_log` table):
- Logs every authenticated API call: `method`, `path` (PII-redacted), `status`, `latencyMs`, `apiKeyId`
- Excludes `/api/request-log` and `/api/auth/*` paths to avoid infinite logging
- Routes: `GET /api/request-log`

Files: `apps/api/src/routes/request-log.ts`

---

### MCP Server Endpoint

**Endpoint:** `POST/GET/DELETE /mcp` — requires `rk_`-prefixed API key.

Uses `@modelcontextprotocol/sdk` via the `@renderical/mcp` package. Serves a Streamable HTTP transport (stateless, `enableJsonResponse: true`).

**Tools registered:**

| Tool | Description |
|---|---|
| `list_channels` | List all configured connections |
| `send_notification` | Send a notification; supports human-approval gate |
| `schedule_notification` | Schedule a notification at a future time |
| `get_delivery_status` | Fetch delivery records for a notification |
| `create_template` | Create a new template |
| `render_preview` | Dry-run render via sandbox mode |
| `query_analytics` | Query delivery analytics |
| `approve_action` | Approve a pending human-gated MCP action |

**MCP approval gates** (`mcp_approval_gate` table): Per-tool `requiresApproval` flag; when set, `send_notification` creates a `mcp_pending_action` row and returns an `approvalToken` instead of sending.

**MCP pending actions** (`mcp_pending_action` table): Stores serialised action payload with `status` (pending → approved/rejected) and `expiresAt`.

**MCP Resources:** `renderical://channels`, `renderical://templates`, `renderical://recent-deliveries`

**MCP Prompts:** Registered in `packages/mcp/src/prompts.ts`

**Dashboard MCP section** (`/api/mcp/gates`): UI for toggling per-tool approval requirements.

Files: `packages/mcp/src/`, `apps/api/src/routes/mcp.ts`

---

### Sandbox / Test Mode

Activated by:
- API key created with `mode: "test"` metadata
- `X-Renderical-Sandbox: true` request header

In sandbox mode:
- Notifications are created with status `sandboxMode: true`
- Channel adapters receive a no-op path and return preview output instead of sending
- Compose endpoint returns `previews: { [channel]: renderedOutput }`
- CLI `preview` command uses sandbox mode

---

## packages/core — UI Component Library

Feature-level React components and data hooks used across all app targets.

### Layouts

| Component | File | Purpose |
|---|---|---|
| `RootLayout` | `layouts/root-layout.tsx` | Theme + query client providers |
| `AppLayout` | `layouts/app-layout.tsx` | Sidebar + header shell for authenticated views |
| `AuthLayout` | `layouts/auth-layout.tsx` | Centred card layout for auth pages |
| `AccountLayout` | `layouts/account-layout.tsx` | Nested layout for account settings tabs |

**Sidebar** (`layouts/components/app-sidebar.tsx`):
- Navigation groups: main, documents
- Quick-create dialog (compose shortcut)
- Search command palette
- User menu with sign-out

### Auth Components (`components/auth/`)

| Component | Feature |
|---|---|
| `SignInForm` | Email + password sign-in; Google OAuth button |
| `SignUpForm` | Account registration |
| `ForgotPasswordForm` | Request OTP for password reset |
| `ResetPasswordForm` | Enter OTP + new password |
| `VerifyEmailCard` | Enter 6-digit OTP to verify email |
| `TwoFactorForm` | Enter TOTP / backup code |
| `AuthIcons` | GitHub, Google, Apple icon SVGs |

### Account Components (`components/account/`)

| Component | Feature |
|---|---|
| `ProfileForm` | Update name / avatar |
| `ChangeEmailForm` | Change email address |
| `ChangePasswordForm` | Change password |
| `TwoFactorSettings` | Enable / disable 2FA display |
| `EnableFlow` | TOTP QR setup + verification step |
| `DisableFlow` | Confirm + disable 2FA |
| `BackupCodeGrid` | Display one-time backup codes |
| `RegenerateBackupCodesFlow` | Regenerate backup codes flow |
| `DeleteAccountDialog` | Confirm + delete account |

### Dashboard (`components/dashboard/`)

- `DashboardView` — overview page
- `OverviewMetrics` — delivery counts, success rate
- `AnalyticsSection` — mini charts per channel
- `MiniLineChart` — sparkline using recharts
- `OnboardingChecklist` — first-run task list
- `DashboardSkeleton` — loading state

### Notifications (`components/notifications/`)

- `NotificationsView` — list of sent notifications with delivery status
- Status badges (queued, delivered, failed, dead, suppressed)

### Channels (`components/channels/`)

- `ChannelsView` — grid of connection cards with status indicators
- `ConnectionDialog` — add/edit connection form (provider-specific config fields)
- `WebhookManager` — list + manage outbound webhook endpoints
- `WebhookRow` — single webhook row with test-send action
- `AddWebhookForm` — create outbound webhook endpoint

### Templates (`components/templates/`)

- `TemplatesView` — searchable template list
- `TemplateEdit` — full template editor: content, variables, locale strings, preview pane
- `VersionRow` — version history row with restore action

### Schedules (`components/schedules/`)

- `SchedulesView` — tabs for one-time schedules and recurring sends
- `RecurringRow` — cron expression display + enable/disable toggle

### Analytics (`components/analytics/`)

- `AnalyticsView` — delivery metrics by channel, time-range filter, sparklines

### Developers (`components/developers/`)

- `DevelopersView` — tabs for API Keys, MCP, Request Log, Sandbox
- `ApiKeysSection` — list / create / revoke API keys (live + test modes)
- `McpSection` — MCP endpoint URL, per-tool approval gate toggles
- `RequestLogSection` — paginated API request log table
- `SandboxPanel` — in-browser notification composer in sandbox mode

### Settings (`components/settings/`)

- `SettingsView` — tabs for Brand Kit, Compliance, Rate Limits, Topics
- `BrandKitSection` — logo upload, colour palette, font stack
- `ComplianceSection` — suppression list management
- `RateLimitsSection` — per-channel rate rule CRUD
- `SubscriptionsSection` — notification topic tag management

### Onboarding (`components/onboarding/`)

- `OnboardingView` — step-by-step first-run wizard
- `StepIcon` — animated step status icons

### Other

- `CreateView` — quick-compose notification form
- `LogsView` — raw delivery log with filters
- `HelpView` + `FaqItem` — FAQ accordion
- `ProtectedRoute` — session guard wrapper
- `RendericalLogo` — SVG brand logo

### Hooks (`hooks/`)

All hooks use `@tanstack/react-query` via the `api-client` package.

| Hook file | Features covered |
|---|---|
| `analytics.ts` | `useAnalytics`, `useOverview` |
| `compliance.ts` | `useSuppressions`, `useConsentEvents` |
| `connections.ts` | `useConnections`, `useCreateConnection`, `useDeleteConnection` |
| `developers.ts` | `useApiKeys`, `useCreateKey`, `useRevokeKey`, `useRequestLog` |
| `inbox.ts` | `useInboxMessages`, `useMarkRead` |
| `mcp.ts` | `useMcpGates`, `usePendingActions`, `useApproveMcpAction` |
| `notifications.ts` | `useNotifications`, `useSendNotification` |
| `overview.ts` | `useOverviewStats` |
| `preferences.ts` | `useTopics`, `useCreateTopic`, `useDeleteTopic` |
| `push.ts` | `useVapidKey`, `useSubscribePush` |
| `rate-limits.ts` | `useRateLimits` |
| `schedules.ts` | `useSchedules`, `useRecurringSends` |
| `templates.ts` | `useTemplates`, `useTemplate`, `useTemplateVersions` |
| `webhooks.ts` | `useWebhooks`, `useCreateWebhook`, `useDeleteWebhook` |

---

## packages/views — Pages & Routing

Page-level components and platform-specific router configs.

### Pages

| Route | Page file | View |
|---|---|---|
| `/auth/sign-in` | `pages/auth/sign-in.tsx` | `SignInForm` |
| `/auth/sign-up` | `pages/auth/sign-up.tsx` | `SignUpForm` |
| `/auth/forgot-password` | `pages/auth/forgot-password.tsx` | `ForgotPasswordForm` |
| `/auth/reset-password` | `pages/auth/reset-password.tsx` | `ResetPasswordForm` |
| `/auth/verify-email` | `pages/auth/verify-email.tsx` | `VerifyEmailCard` |
| `/auth/two-factor` | `pages/auth/two-factor.tsx` | `TwoFactorForm` |
| `/` (redirect) | — | → `/notifications` |
| `/notifications` | `pages/notifications.tsx` | `NotificationsView` |
| `/schedules` | `pages/schedules.tsx` | `SchedulesView` |
| `/channels` | `pages/channels.tsx` | `ChannelsView` |
| `/create` | `pages/create.tsx` | `CreateView` |
| `/templates` | `pages/templates.tsx` | `TemplatesView` |
| `/templates/:id` | `pages/template-edit.tsx` | `TemplateEdit` |
| `/logs` | `pages/logs.tsx` | `LogsView` |
| `/analytics` | `pages/analytics.tsx` | `AnalyticsView` |
| `/developers` | `pages/developers.tsx` | `DevelopersView` |
| `/settings` | `pages/settings.tsx` | `SettingsView` |
| `/help` | `pages/help.tsx` | `HelpView` |
| `/onboarding` | `pages/onboarding.tsx` | `OnboardingView` |
| `/account` | `pages/account/profile.tsx` | `ProfileForm` |
| `/account/security` | `pages/account/security.tsx` | Change email / password |
| `/account/two-factor` | `pages/account/two-factor.tsx` | `TwoFactorSettings` |

### Platform Routers

| File | Platform | Notes |
|---|---|---|
| `routes/web.tsx` | Browser SPA | `BrowserRouter`; all shared routes |
| `routes/desktop.tsx` | Electron | `HashRouter`; same shared routes |
| `routes/ios.tsx` | iOS Capacitor | Deep-link URL handling |
| `routes/android.tsx` | Android Capacitor | Deep-link URL handling |
| `routes/_shared.tsx` | All | Exports `sharedAuthRoutes`, `sharedProtectedChildren`, `publicRoutes`, `notFoundRoute` |

---

## packages/app — Cross-Platform Auth Shell

Provides a unified auth client and app context that adapts per platform.

| File | Purpose |
|---|---|
| `auth/client.ts` | Base better-auth client config |
| `auth/client.web.ts` | Browser variant (cookie-based session) |
| `auth/client.desktop.ts` | Electron variant (IPC-aware) |
| `auth/client.mobile.ts` | Capacitor variant; redirects to deep links |
| `auth/native-url.ts` | Resolves deep link URL scheme per platform |
| `auth/context.tsx` | React `AuthContext` provider |
| `auth/use-session.ts` | `useSession()` hook |
| `app/context.tsx` | App-level context (baseUrl, etc.) |
| `app/query.tsx` | `QueryClientProvider` setup |

---

## packages/mailer — Transactional Email

Cloudflare Email binding wrapper. All emails sent from `noreply@renderical.com`.

| Export | Template |
|---|---|
| `sendVerificationOTPEmail` | Account email verification OTP |
| `sendResetPasswordOTPEmail` | Password reset OTP |
| `sendTwoFactorOTPEmail` | 2FA email OTP |
| `sendInvitationEmail` | Team/project invitation |
| `sendNotificationEmail` | Notification delivery via email channel |

Files: `packages/mailer/src/emails/`, `packages/mailer/src/binding.ts`

---

## packages/mcp — MCP Server Package

Standalone `@renderical/mcp` package that exposes a `createMcpServer(config)` function.

| Module | Purpose |
|---|---|
| `server.ts` | `createMcpServer({ baseUrl, apiKey })` — initialises MCP server |
| `tools.ts` | Registers 9 tools (see MCP Server section above) |
| `resources.ts` | Registers 3 resources: channels, templates, recent-deliveries |
| `prompts.ts` | Registers MCP prompts |
| `bin.ts` | CLI entry for running as a standalone MCP server process |

The MCP package calls back to the Renderical REST API using the supplied `apiKey`, making it fully stateless.

---

## packages/sdk — TypeScript SDK

`createRendericalClient(options)` — isomorphic fetch-based client.

| Method | Description |
|---|---|
| `send(payload)` | Send a notification (live mode) |
| `preview(payload)` | Dry-run render (sandbox) |
| `listDeliveries(params)` | Paginated delivery list |
| `keys.list()` | List API keys |
| `keys.create(name, mode)` | Create live or test API key |
| `keys.revoke(id)` | Delete API key |
| `requestLog(params)` | Paginated API request log |

Options: `{ baseUrl, apiKey }`. Errors throw with `.code` (API error code string).

Files: `packages/sdk/src/client.ts`, `packages/sdk/src/index.ts`

---

## packages/cli — CLI Tool

`renderical` binary (Node.js).

```
renderical send    --channel <ch> --to <addr> --subject <s> --body <b>
renderical preview --channel <ch> --to <addr> --subject <s> --body <b>
renderical logs    [--limit <n>]
renderical keys list
renderical keys create --name <n> [--mode live|test]
```

Env vars: `RENDERICAL_API_KEY` (required), `RENDERICAL_BASE_URL` (default `http://localhost:8787`).

Uses `@renderical/sdk` under the hood.

Files: `packages/cli/src/index.ts`

---

## packages/templating — Template Engine

Custom Mustache-style engine with no external runtime dependency.

**Syntax reference:**

| Syntax | Meaning |
|---|---|
| `{{ variable }}` | Variable substitution (dot-path) |
| `{{ nested.path }}` | Nested property access |
| `{{ var \| "default" }}` | Fallback value |
| `{{ t.key }}` | i18n string lookup from `localeStrings` |
| `{{#if cond}}…{{else}}…{{/if}}` | Conditional block |
| `{{#each items as item}}…{{/each}}` | Iteration (max 100 items, `itemIndex` available) |

**Limits:** 100 KB output, 100 loop iterations.

**API:**
- `renderString(template, ctx, localeStrings?) → string`
- `renderValue<T>(value, ctx, localeStrings?) → T` (recursively renders into objects/arrays)

Tests: `packages/templating/src/engine.test.ts`

---

## packages/api-client — Frontend API Client

Typed `fetch` wrapper used by `@renderical/core` hooks.

| Module | Purpose |
|---|---|
| `client.ts` | `createApiClient(baseUrl)` — all typed HTTP methods |
| `context.tsx` | `ApiClientContext` + `useApiClient()` hook |
| `error.ts` | `ApiClientError` with `.code` property |
| `types.ts` | Shared types: `ChannelType`, `ComposePayload`, `ListResponse`, `ApiKey`, etc. |

Used internally by all `packages/core/src/hooks/` files.

---

## packages/ui — UI Primitives (shadcn)

Auto-generated shadcn components. **Do not edit these files directly** (see project rule).

Components available: `accordion`, `alert-dialog`, `alert`, `avatar`, `badge`, `breadcrumb`, `button`, `button-group`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `combobox`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `empty`, `field`, `hover-card`, `input`, `input-group`, `input-otp`, `item`, `kbd`, `label`, `menubar`, `native-select`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner` (toasts), `spinner`, `switch`, `table`, `tabs`, `textarea`, `toggle`, `toggle-group`, `tooltip`.

Utility: `lib/utils.ts` — `cn()` (class merging).

---

## apps/web — Web App

Vite + React SPA.

- Entry: `apps/web/src/main.tsx` → renders `App`
- `App.tsx` → uses `routes/web.tsx` router
- Served from Cloudflare Pages or any static host

---

## apps/desktop — Electron Desktop App

Electron Forge + Vite.

- Main process: `electron/main.ts` — creates `BrowserWindow`; loads renderer URL
- Preload: `electron/preload.ts` — exposes `contextBridge` APIs as `window.desktop`
- Renderer: `src/renderer.tsx` → `App.tsx` → `routes/desktop.tsx` (HashRouter)
- `desktop.d.ts` — TypeScript types for `window.desktop` bridge

---

## apps/ios & apps/android — Capacitor Mobile Apps

| File | Purpose |
|---|---|
| `capacitor.config.ts` | App ID, server URL, plugins |
| `src/App.tsx` | Root React component with platform router |
| `src/main.tsx` | Entry; initialises Capacitor |
| `vite.config.ts` | Vite config for mobile build |

Uses `routes/ios.tsx` / `routes/android.tsx` which add deep-link handling on top of `_shared.tsx` routes.

---

## apps/site — Marketing Site (Astro)

Astro + Cloudflare Pages.

- `src/config.ts` — site metadata, navigation
- `src/components/UseCases.tsx` — use-case cards (React island)
- `src/components/Faq.tsx` — FAQ accordion (React island)

---

## Database Schema Summary

> All tables stored in Cloudflare D1 (SQLite). Queried via Kysely.

| Table | Description |
|---|---|
| `user` | Owner accounts (email, phone, emailVerified, phoneNumberVerified) |
| `connection` | Channel provider connections (type, config, credentials, status, health) |
| `template` | Notification templates (content, variables, localeStrings) |
| `template_version` | Version history snapshots |
| `snippet` | Reusable content fragments |
| `brand_kit` | Logo, colours, font stack |
| `notification` | Sent notification records (payload, channels, mode, status) |
| `delivery` | Per-channel delivery attempts (status, attempts, timestamps) |
| `delivery_event` | Delivery lifecycle events (delivered, opened, clicked) |
| `dead_letter` | Failed deliveries that exhausted retries |
| `idempotency_key` | Deduplication keys (24h TTL) |
| `inbox_message` | In-app inbox messages |
| `push_subscription` | Browser Web Push subscriptions (VAPID) |
| `webhook_endpoint` | Outbound webhook endpoints with HMAC secret |
| `scheduled_message` | One-time scheduled notifications |
| `recurring_send` | Cron-based recurring sends |
| `topic` | Notification topic tags (key, name, description) |
| `rate_limit_rule` | Per-channel rate limit configs |
| `apikey` | API keys with prefix, metadata, rate-limit config |
| `api_request_log` | Authenticated API call audit log |
| `mcp_approval_gate` | Per-MCP-tool approval requirement flags |
| `mcp_pending_action` | MCP actions awaiting human approval |
| `suppression` | Hard-suppressed channel+address pairs |
| `consent_event` | Immutable suppression audit trail |
| `onboarding_state` | First-run checklist progress |

---

## API Route Index

All routes prefixed `/api` unless noted.

| Method | Path | Feature |
|---|---|---|
| `*` | `/api/auth/*` | better-auth (sign-in, sign-up, session, OAuth, OTP, 2FA) |
| `GET` | `/health` | Worker health check |
| `GET` | `/doc` | OpenAPI JSON spec |
| `GET` | `/scalar` | Scalar API reference UI |
| `*` | `/mcp` | MCP streamable HTTP endpoint |
| `GET/POST` | `/api/connections` | List / create connections |
| `GET/PATCH/DELETE` | `/api/connections/:id` | Get / update / delete connection |
| `POST` | `/api/notifications` | Send notification (or sandbox preview) |
| `GET` | `/api/notifications` | List notifications |
| `GET` | `/api/notifications/:id` | Get notification + deliveries |
| `GET` | `/api/templates` | List templates |
| `POST` | `/api/templates` | Create template |
| `GET/PATCH/DELETE` | `/api/templates/:id` | Get / update / delete template |
| `GET` | `/api/templates/:id/versions` | List versions |
| `POST` | `/api/templates/:id/versions/:vId/restore` | Restore version |
| `GET/POST/PATCH/DELETE` | `/api/snippets` | Snippet CRUD |
| `GET` | `/api/deliveries` | List deliveries (filterable) |
| `GET` | `/api/deliveries/:id` | Get delivery |
| `GET` | `/api/inbox` | List inbox messages |
| `PATCH/DELETE` | `/api/inbox/:id` | Mark read / delete inbox message |
| `GET` | `/api/push/vapid-public-key` | VAPID public key |
| `POST` | `/api/push/subscribe` | Register push subscription |
| `DELETE` | `/api/push/unsubscribe` | Remove push subscription |
| `GET/POST/PATCH/DELETE` | `/api/webhooks` | Outbound webhook endpoint CRUD |
| `POST` | `/api/webhooks/:id/test` | Send test event to webhook |
| `GET/POST/DELETE` | `/api/schedules` | One-time schedule CRUD |
| `GET/POST/PATCH/DELETE` | `/api/recurring` | Recurring send CRUD |
| `GET/PUT` | `/api/brand-kit` | Brand kit |
| `GET/POST/PATCH/DELETE` | `/api/topics` | Topic CRUD |
| `GET/POST/PATCH/DELETE` | `/api/rate-limits` | Rate limit rule CRUD |
| `GET/POST/DELETE` | `/api/keys` | API key CRUD |
| `GET` | `/api/request-log` | API request log |
| `GET` | `/api/overview` | Dashboard metrics |
| `GET` | `/api/analytics` | Delivery analytics |
| `GET/POST/DELETE` | `/api/compliance/suppressions` | Suppression list |
| `GET` | `/api/compliance/consent-events` | Consent audit log |
| `GET/PATCH` | `/api/mcp/gates` | MCP approval gate settings |
| `POST` | `/api/mcp/pending` | Create pending MCP action |
| `POST` | `/api/mcp/pending/:id/approve` | Approve pending MCP action |
| `GET` | `/t/o/:token` | Open pixel tracking |
| `GET` | `/t/c/:token` | Click tracking + redirect |
| `POST` | `/webhooks/receipts/*` | Provider inbound receipt callbacks |
