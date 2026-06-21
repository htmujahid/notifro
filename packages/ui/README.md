# @renderical/ui

The shared **design system** — a Tailwind v4 + shadcn-based React component library, with hooks, utilities, and the theme used across every app.

## What's here

- `components/` — the full component set (buttons, dialogs, forms, charts, command palette, etc.)
- `hooks/` — reusable UI hooks
- `lib/` — utilities (`cn`, formatting, …)
- `styles/` / `globals.css` — the Tailwind theme and design tokens

## Exports

`./components/*`, `./hooks/*`, `./lib/*`, and `./globals.css`.

## Stack

React 19 + Tailwind CSS 4 + shadcn/ui (Base UI primitives), with lucide-react, recharts, sonner, vaul, cmdk, date-fns, and friends.

## Used by

`@renderical/views`, `@renderical/core`, `apps/site`, and any app needing components or the theme. For low-level unstyled primitives, see [`@renderical/ui-primitives`](../ui-primitives).
