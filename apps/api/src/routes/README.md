# Route modules

Each domain lives in its own file and exports a default `OpenAPIHono<AppEnv>` sub-app. `index.ts` mounts it with one line: `app.route('/api', domainRoutes)`.

## Adding a new domain

1. Create `apps/api/src/routes/<domain>.ts`
2. Create an `OpenAPIHono<AppEnv>` instance. Always pass `{ defaultHook: validationHook }` so Zod errors use the standard error envelope
3. Apply `requireAuth` as middleware
4. Register routes with `router.openapi(...)`
5. Export `default router`
6. Mount in `index.ts`: `app.route('/api', domainRouter)`

## Conventions

- All product routes require `requireAuth`, which sets `c.var.user` and `c.var.session`.
- Scope every DB query with `where('userId', '=', c.var.user!.id)`. Never use a client-supplied user id.
- List endpoints must use `listQuerySchema` + `applyListQuery` from `src/lib/list-query.ts`.
- Throw `Errors.*` helpers from `src/lib/errors.ts`, and `onError` in `index.ts` serializes them.
- See `_template.ts` for a complete example.
