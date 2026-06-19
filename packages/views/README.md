# @workspace/views

The **stateless presentation layer**. Shared pages, layouts, and route definitions rendered identically across every client — web, desktop, iOS, and Android.

## Role in the architecture

```
apps/*  ──►  @workspace/app     (app-wide universal logic)
              │
              ▼
        @workspace/core         (stateful logic: forms, queries, mutations)
              │
              ▼
        @workspace/views        (this package — pure, stateless UI)  ──►  @workspace/ui
```

Views are **presentation only**. They lay out screens and wire user intent to behavior handed down from [`@workspace/core`](../core); they do not own state, fetch data, or contain platform logic. Keeping them stateless is what lets the same page render on every platform.

## What's here

- `routes/` — per-platform route trees: `./routes/web`, `./routes/desktop`, `./routes/ios`, `./routes/android`
- `pages/` — the screens (auth flows: sign-in, sign-up, forgot/reset password, verify-email, and the app pages)
- `layouts/` — shared layout shells

## Stack

React 19 + React Router 8, styled via [`@workspace/ui`](../ui).

## Used by

`apps/web`, `apps/desktop`, `apps/ios`, `apps/android` — each imports its platform's route export.
