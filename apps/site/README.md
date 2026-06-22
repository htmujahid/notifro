# Notifro: Marketing site

The public marketing site for **Notifro**, the unified notification infrastructure.
Built with [Astro](https://astro.build) and deployed on Cloudflare.

It shares the design system with the rest of the monorepo: Tailwind v4 + shadcn theme
from `@notifro/ui` (imported in `src/styles/app.css`), with the React integration
enabled so UI components (e.g. the FAQ `Accordion`) can be used directly as Astro islands.
Auth links point at the web app under `PUBLIC_FRONTEND_URL` (`/auth/sign-in`, `/auth/sign-up`).

## Pages

| Route          | Purpose                                                       |
| -------------- | ------------------------------------------------------------- |
| `/`            | Landing page: hero, core features, channels, MCP, how-it-works |
| `/features`    | Full feature breakdown across every category                  |
| `/channels`    | Supported channels and routing/fallback                       |
| `/mcp`         | MCP server layer: tools, resources, prompts, safety          |
| `/developers`  | Quickstart, APIs, SDKs, CLI, and MCP setup                    |
| `/security`    | Security & compliance posture                                 |
| `/about`       | Company and product principles                                |
| `/contact`     | Sales, support, and security contacts                         |
| `/changelog`   | Product updates                                               |
| `/status`      | System status                                                 |
| `/blog`        | Articles                                                      |
| `/privacy`, `/terms`, `/dpa` | Legal                                           |

## Structure

```
src/
  config.ts            # Site metadata, nav, channels (auth URLs from PUBLIC_FRONTEND_URL)
  layouts/BaseLayout.astro
  components/          # Header, Footer, CtaBand, PageHeader (.astro) + Faq (React island)
  styles/app.css       # Imports @notifro/ui theme + @source for this app
  pages/               # One .astro file per route
postcss.config.mjs     # Tailwind v4 via @tailwindcss/postcss
```

Branding and shared content live in `src/config.ts`. Styling comes from the shared
`@notifro/ui` shadcn theme. Use the same Tailwind utilities and design tokens
(`bg-card`, `text-muted-foreground`, `bg-primary`, …) as the other apps.

## Commands

| Command           | Action                              |
| ----------------- | ----------------------------------- |
| `npm install`     | Install dependencies                |
| `npm run dev`     | Start the dev server at `localhost:4321` |
| `npm run build`   | Build the static site to `./dist/`  |
| `npm run preview` | Preview the production build locally |
