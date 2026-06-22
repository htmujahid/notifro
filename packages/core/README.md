# @notifro/core

The **stateful logic layer**. Forms, data fetching, mutations, validation, and feature components that drive the screens in [`@notifro/views`](../views).

## Role in the architecture

Core sits between app-wide logic and the presentation layer:

- It builds on [`@notifro/app`](../app) for universal concerns (auth, context).
- It owns **stateful logic** — React Query data fetching/caching, React Hook Form state, and Zod schemas. The app is user-scoped; there are no organization features.
- Its only consumer downstream is [`@notifro/views`](../views): core supplies the state and handlers, views render them. Core does **not** do raw presentation, and views do **not** own state.

## What's here

- `components/` — feature components
- `layouts/` — stateful layout logic
- `hooks/` — data and domain hooks (e.g. `./hooks/inbox`)
- `schemas/` — Zod schemas (e.g. `./schemas/auth`)
- `data/` — data access helpers

## Stack

React 19 + TanStack React Query 5 + React Hook Form 7 + Zod + React Router 8. UI from [`@notifro/ui`](../ui).
