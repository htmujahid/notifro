# Renderical — Marketing site

The public marketing site for **Renderical**, the unified notification infrastructure.
Built with [Astro](https://astro.build) and deployed on Cloudflare.

## Pages

| Route          | Purpose                                                       |
| -------------- | ------------------------------------------------------------- |
| `/`            | Landing page — hero, core features, channels, MCP, how-it-works |
| `/features`    | Full feature breakdown across every category                  |
| `/channels`    | Supported channels and routing/fallback                       |
| `/mcp`         | MCP server layer — tools, resources, prompts, safety          |
| `/developers`  | Quickstart, APIs, SDKs, CLI, and MCP setup                    |
| `/pricing`     | Plans, comparison, and FAQ                                     |
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
  config.ts            # Site metadata, nav, and channel list
  layouts/BaseLayout.astro
  components/          # Header, Footer, CtaBand
  styles/global.css    # Design system (tokens, components)
  pages/               # One .astro file per route
```

Branding and shared content live in `src/config.ts`; the design system lives in
`src/styles/global.css`.

## Commands

| Command           | Action                              |
| ----------------- | ----------------------------------- |
| `npm install`     | Install dependencies                |
| `npm run dev`     | Start the dev server at `localhost:4321` |
| `npm run build`   | Build the static site to `./dist/`  |
| `npm run preview` | Preview the production build locally |
