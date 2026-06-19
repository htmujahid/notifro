# api

The Renderical backend API — authentication, notification ingestion, and platform endpoints, running on Cloudflare Workers.

## Stack

- **Hono 4** on **Cloudflare Workers**
- **Better Auth 1** for authentication
- **OpenAPI** via `@hono/zod-openapi`, with interactive docs from `@scalar/hono-api-reference`

## How it fits

The standalone backend (`src/index.ts`). Auth configuration and Cloudflare bindings live in `src/lib/`. Transactional email is sent through [`@workspace/mailer`](../../packages/mailer). The client apps authenticate against this API using the platform auth clients in [`@workspace/app`](../../packages/app).

Bindings are typed as `CloudflareBindings` and passed to Hono:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## Develop

```bash
npm run dev         # wrangler dev (local Worker)
npm run deploy      # deploy to Cloudflare
npm run cf-typegen  # regenerate CloudflareBindings types from wrangler config
```
