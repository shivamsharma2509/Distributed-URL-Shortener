# Shortstack — Distributed URL Shortener

Shortstack lets developers create, manage, and observe reliable short links with PostgreSQL-backed mappings and Redis-accelerated redirects.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/url-shortener run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `REDIS_URL`, `REDIS_CACHE_TTL_SECONDS`, `CREATE_RATE_LIMIT`, `SHORT_URL_BASE_URL`, `CORS_ORIGIN`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 with structured Pino logging
- DB: PostgreSQL + Drizzle ORM
- Cache: Redis via ioredis, with PostgreSQL fallback
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/url-shortener/src/` — React dashboard, URL management, creation, and detail screens
- `artifacts/api-server/src/routes/` — health, URL management, and redirect routes
- `artifacts/api-server/src/lib/url-shortener.ts` — Base62 generation, caching flow, and database operations
- `lib/db/src/schema/url-mappings.ts` — source-of-truth Drizzle table definition
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `docs/architecture.md` — system flows, trade-offs, and failure behavior

## Architecture decisions

- PostgreSQL remains authoritative; Redis is best-effort cache and rate-limit state.
- Generated Base62 codes are derived from PostgreSQL identity IDs, so instances do not need shared JVM or process memory.
- Click counts use atomic database arithmetic to avoid lost increments.
- Soft disable plus cache invalidation is used instead of destructive deletion on the redirect path.
- The redirect endpoint uses 302 so lifecycle changes are not hidden behind permanent client caching.

## Product

The dashboard summarizes URL health, recent mappings, and clicks. Users can create custom or generated aliases, set expiration, search and filter mappings, copy links, inspect statistics, enable/disable redirects, and delete mappings.

## User preferences

The approved product direction prioritizes correctness, maintainability, horizontal scalability, observability, developer experience, and interview explainability.

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`.
- Use the managed artifact workflows so `PORT` and `BASE_PATH` are supplied automatically.
- The routable redirect endpoint is `/api/r/{shortCode}` in this path-routed workspace.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
