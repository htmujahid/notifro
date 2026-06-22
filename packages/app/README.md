# @notifro/app

The **app-wide universal logic layer**. The top-level state, context, and authentication that every app talks to directly.

## Role in the architecture

This is the package the apps interact with most of the time. It holds concerns that are universal to the whole product regardless of feature or screen:

- **Authentication** — platform-specific Better Auth clients for web, desktop, and mobile, plus shared auth context and hooks
- **App context** — the universal React context/providers (`./app/context`)
- **Deep linking** — auth callback / deep-link handling shared across native shells

Downstream, [`@notifro/core`](../core) builds its stateful feature logic on top of this, and [`@notifro/views`](../views) renders it.

## What's here

- `app/` — app context and providers
- `auth/` — auth clients (web / desktop / mobile), context, hooks, and deep-link utilities

## Stack

React 19 + Better Auth + TanStack React Query 5, on top of [`@notifro/ui-primitives`](../ui-primitives).
