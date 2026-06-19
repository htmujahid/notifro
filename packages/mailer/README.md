# @workspace/mailer

Transactional email for Renderical — templates and a sending binding for Cloudflare Workers.

## What's here

- `src/index.ts` — the mailer entry point (compose + send)
- `src/binding.ts` — the Cloudflare Email Service binding wiring
- `src/emails/` — email templates (verification, password reset, etc.)

## Stack

TypeScript on Cloudflare Workers, using Cloudflare Email Service. No runtime dependencies beyond the Workers platform.

## Used by

[`apps/api`](../../apps/api) — for auth and notification emails.
