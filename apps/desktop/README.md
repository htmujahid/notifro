# desktop

The Notifro desktop app, the dashboard packaged as a native window for macOS, Windows, and Linux.

## Stack

- **Electron 42** + **Vite** + **React 19** + **React Router 8** + **TypeScript 6**

## How it fits

The Electron main process (`electron/main.ts`) and preload (`electron/preload.ts`) host a renderer (`src/renderer.tsx`) that renders the same shared UI as the other clients:

- [`@notifro/app`](../../packages/app): app-wide universal logic, including the desktop auth client and deep-link handling
- [`@notifro/views`](../../packages/views): shared pages (consumes `./routes/desktop`)

Platform bridges (deep links, native APIs) are exposed via preload and typed in `src/desktop.d.ts`.

## Develop

```bash
pnpm dev      # Vite + Electron in watch mode
pnpm build    # package the app
```
