# admin

The Renderical admin console — internal tooling for operators to manage tenants, inspect deliveries, and administer the platform.

## Stack

- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS 4** + **TypeScript 5**
- Deployed to **Cloudflare** via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)

## How it fits

A standalone Next.js app under `src/app/`. Unlike the client apps it is not built from the shared `@workspace/views` layer — it has its own admin-only screens.

## Develop

```bash
npm run dev       # local Next.js dev server (localhost:3000)
npm run preview   # preview on the Cloudflare runtime
npm run deploy    # deploy to Cloudflare
```
