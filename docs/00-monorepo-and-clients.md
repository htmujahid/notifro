# Milestone 00 — Monorepo scaffold, shared packages & client apps

**Phase:** 00 (Foundation) · **Depends on:** — · **Status:** Done

## Goal
Stand up the pnpm + Turbo monorepo, the shared package layer (`ui`, `core`, `views`, `app`, `api-client`),
and the client applications (web, desktop, iOS, Android, admin, marketing site) — all rendering the **same**
React 19 UI through one shared rendering path.

## Why it matters
Every later milestone ships UI to five platforms at once. A single shared `@renderical/views` →
`@renderical/core` → `@renderical/ui` pipeline means a page is written once and runs on web, desktop, and
mobile. The monorepo is the substrate the whole product is built on.

## Current state
- Greenfield. This milestone is the platform baseline; nothing precedes it.

## Scope (in)
- **Tooling**: pnpm `10.33.4` (pinned via `packageManager`), Turbo `2.9.x` (`ui: "tui"`), Node `>=20`,
  TypeScript `~6`. Root scripts `dev` / `build` / `lint` / `format` / `typecheck` fan out via Turbo;
  `sdk:generate` filters `@renderical/sdk`. Workspace globs `apps/*` + `packages/*`.
- **Shared packages**:
  - `@renderical/ui` — shadcn-generated component library (30+ components, Tailwind 4, Recharts, Lucide,
    Sonner, Vaul). **Never edit `packages/ui/src/components/`.**
  - `@renderical/ui-primitives` — theme provider + base primitives (`@base-ui/react`).
  - `@renderical/app` — auth client + app context; bridges `@renderical/api-client` with better-auth.
  - `@renderical/api-client` — typed HTTP client, context provider, error handling, shared `types.ts`.
  - `@renderical/core` — business logic: layouts, hooks, schemas, protected routes.
  - `@renderical/views` — shared pages + route configs for all platforms.
- **Client apps**:
  - `apps/web` — Vite SPA (React 19), deployed to Cloudflare; imports `@renderical/views/routes/web`.
  - `apps/desktop` — Electron + electron-forge; imports `routes/desktop`.
  - `apps/ios` / `apps/android` — Capacitor 8 + Vite; import `routes/ios` / `routes/android`; use
    `@renderical/mobile-shared` for native bridges + Capacitor Preferences storage.
  - `apps/admin` — Next.js 16 (opennextjs-cloudflare).
  - `apps/site` — Astro marketing site (Cloudflare adapter).
- **Placeholder packages** (README-only, reserved): `auth`, `analytics`, `payments`.

## Architecture — the shared rendering path
```
@renderical/app        (auth + app context provider)
  → @renderical/core   (hooks, layouts: Root / App / Auth / Account, ProtectedRoute)
    → @renderical/ui   (shadcn components + styling)
      → @renderical/views (routes/_shared.tsx + per-platform route modules)
```
- `packages/views/src/routes/_shared.tsx` defines `sharedAuthRoutes`, `sharedProtectedChildren`,
  `publicRoutes`, and the 404 route. Per-platform modules (`web.tsx`, `desktop.tsx`, `ios.tsx`,
  `android.tsx`) compose these with platform wrappers.
- Layout hierarchy in `@renderical/core/layouts/`: `RootLayout` → (`AuthLayout` | `AppLayout` → `AccountLayout`),
  guarded by `ProtectedRoute`.

## Implementation steps
1. Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, base `tsconfig.json`.
2. Scaffold `@renderical/ui` (shadcn) + `@renderical/ui-primitives`.
3. Scaffold `@renderical/api-client`, `@renderical/app`, `@renderical/core`, `@renderical/views` with the
   shared layout + route structure.
4. Scaffold each client app, wiring it to its platform route module.
5. Reserve placeholder packages with README stubs.

## Acceptance criteria
- [x] `pnpm install` + `pnpm build` build every app and package via Turbo.
- [x] A page added to `@renderical/views` + registered in `_shared.tsx` renders on web, desktop, iOS, Android.
- [x] `pnpm typecheck` and `pnpm lint` run across the workspace.
- [x] UI comes only from `@renderical/ui`; consumers never edit shadcn-generated components.

## Risks & notes
- The 5-platform shared path is the core constraint of the project — keep pages presentation-only and put
  data/state in `@renderical/core` hooks.
- The API worker (M01), mailer (M02), and auth (M03/M04) build on this scaffold.
