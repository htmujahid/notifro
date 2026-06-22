// No OpenAPI contracts for tracking routes.
// These endpoints (/o/:token, /c/:token) return raw HTTP responses
// (image/gif and redirects) consumed by email clients, not API consumers,
// so they have no Zod schemas or createRoute() definitions.
