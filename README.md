# Renderical

**Unified notification infrastructure — compose once, deliver everywhere.**

Renderical normalizes every channel behind a single compose-once API. Write a message once
and Renderical transforms and delivers it across Slack, email, Microsoft Teams, Discord,
web push, in-app inbox, webhooks, and SMS — with fallback chains, scope-based OAuth,
a built-in preference center, and a **native MCP server** so AI agents can send safely. One
integration replaces the five tools teams stitch together today.

## Core features

- **Single compose API** — one normalized payload, automatically transformed into Slack
  Block Kit, responsive HTML email, Teams adaptive cards, Discord embeds, and push payloads.
  Rich content (text, markdown, buttons, images, attachments, interactive components) and a
  template engine with variables, conditionals, loops, and localization.
- **Fallback chains** — try push → fall back to email → fall back to SMS, with routing rules
  by user, message type, priority, or time.
- **Multi-channel delivery** — Slack, Gmail/SMTP, Teams, Discord, web push, in-app
  inbox, generic webhooks, and SMS. Broadcast, targeted, and transactional modes with
  rate-aware throttling.
- **Scheduling & timing** — send-at with timezone awareness, recurring/cron sends, send-time
  optimization, quiet hours / DND, and time-window delivery.
- **Scope-based OAuth & connected accounts** — granular per-provider scopes, token storage,
  refresh and rotation, per-account permission introspection, connection health monitoring,
  and multi-tenant credential isolation.
- **Reliability** — automatic retries with backoff, dead-letter queue, idempotency keys,
  full delivery status tracking (queued → sent → delivered → opened → clicked → failed),
  webhook receipts, and bounce handling.
- **Preference center** — per-channel/per-category opt-in/out, subscription topics, frequency
  capping, digest bundling, compliant unsubscribe (CAN-SPAM/GDPR), and channel priority.
- **Personalization & orchestration** — segmentation, dynamic content, A/B testing, locale/TZ
  auto-detection, multi-step journeys, trigger-based automation, and throttle/debounce.
- **Analytics & observability** — per-channel delivery/open/engagement metrics, funnel and
  conversion tracking, real-time dashboards with anomaly alerting, cost tracking, and audit logs.
- **Templates & content** — visual builder with live multi-channel preview, versioning and
  rollback, a shared snippet library, and a brand kit applied across channels.
- **Security & compliance** — encryption, PII redaction, RBAC, SSO/SAML, IP allowlisting,
  signed webhooks with replay protection, SOC 2 / HIPAA / GDPR posture, data residency,
  suppression lists, and a consent ledger.
- **Smart / AI** — AI-assisted drafting and tone adjustment, smart channel selection,
  send-time prediction, and anomaly detection on engagement drops.
- **Operational** — provider failover, multi-region delivery, cost-optimized routing, and a
  self-hosted / on-prem deployment option.

## MCP server layer

Renderical exposes the entire platform as an MCP server so AI agents (Claude, IDE assistants,
custom agents) can compose, schedule, and deliver notifications in natural language — using the
same routing, fallback, and OAuth scopes underneath. Available as **remote MCP** (hosted,
OAuth-authenticated) and **local/stdio MCP** (self-hosted/dev).

- **Tools** — `send_notification`, `schedule_notification`, `list_channels`,
  `get_channel_status`, `manage_connection`, `get_delivery_status`, `manage_preferences`,
  `create_template`, `render_preview`, `query_analytics`.
- **Resources** — connected accounts and scopes, templates and variables, recipient segments,
  recent delivery logs and failures.
- **Prompts** — "Notify a user across their preferred channel with fallback", "Schedule a
  digest summary for a segment", "Diagnose why a notification failed and retry".
- **Safety** — per-tool scope enforcement tied to connected-account OAuth scopes, preview and
  approval gates (human-in-the-loop), rate limiting and idempotency at the MCP layer, and every
  agent-initiated send written to the same audit log as API/UI sends.

## Monorepo layout

Turborepo + pnpm workspaces.

```
apps/
  site      → Marketing site (Astro, Cloudflare) — landing & marketing pages
  web       → Web app / dashboard
  admin     → Admin console
  api       → Backend API
  desktop   → Desktop app
  ios       → iOS app
  android   → Android app
packages/
  analytics, app, auth, core, i18n, mailer,
  payments, ui, ui-primitives, views
```

### Marketing site (`apps/site`)

Astro site for Renderical's public pages. Pages: home, features, channels, MCP server,
developers, security, about, contact, changelog, status, blog, and legal
(privacy, terms, DPA).

```bash
cd apps/site
npm install
npm run dev      # local dev server
npm run build    # static build (Cloudflare adapter)
npm run preview  # preview the build
```

## Development

```bash
pnpm install
pnpm dev         # turbo dev across apps
pnpm build       # turbo build
pnpm lint
pnpm typecheck
```
