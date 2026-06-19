# web

The Renderical web dashboard — a React single-page app where users compose notifications, manage delivery channels, and configure preferences.

## Stack

- **Vite 8** + **React 19** + **React Router 8** + **TypeScript 6**

## How it fits

A thin shell that wires platform concerns (browser routing, web auth client) into shared workspace code:

- [`@workspace/app`](../../packages/app) — app-wide universal logic (auth, context)
- [`@workspace/views`](../../packages/views) — shared pages and route definitions (consumes `./routes/web`)
- [`@workspace/ui`](../../packages/ui) — component library

Most of the UI and behavior lives in the shared packages; this app mainly provides the entry point (`src/main.tsx`), web-specific hooks, and lib glue.

## Develop

```bash
pnpm dev    # from repo root, or within this app
```
