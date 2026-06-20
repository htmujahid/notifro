# Route modules

Each domain lives in its own file and exports a default `OpenAPIHono<AppEnv>` sub-app. `index.ts` mounts it with one line: `app.route('/api', domainRoutes)`.

## Adding a new domain

1. Create `apps/api/src/routes/<domain>.ts`
2. Create an `OpenAPIHono<AppEnv>` instance — always pass `{ defaultHook: validationHook }` so Zod errors use the standard error envelope
3. Apply `requireOrg` (and `requireRole` where needed) as middleware
4. Register routes with `router.openapi(...)`
5. Export `default router`
6. Mount in `index.ts`: `app.route('/api', domainRouter)`

## Conventions

- All product routes require `requireOrg` — it sets `c.var.org.id` and `c.var.org.role`.
- Use `requireRole('owner', 'admin')` for mutating operations, fine-grained checks use `requirePermission`.
- Scope every DB query with `where('organizationId', '=', c.var.org.id)` — never use a client-supplied org id.
- List endpoints must use `listQuerySchema` + `applyListQuery` from `src/lib/list-query.ts`.
- Throw `Errors.*` helpers from `src/lib/errors.ts` — `onError` in `index.ts` serializes them.
- See `_template.ts` for a complete example.
