# Shortstack — Distributed URL Shortener

Shortstack is a portfolio-grade URL shortening platform for creating, managing, and observing reliable redirects. It combines a Spring Boot REST API, PostgreSQL as the source of truth, Redis for cache-aside reads and rate limiting, and a responsive React control room.

## What it demonstrates

- URL-safe short codes generated from PostgreSQL identity IDs using Base62
- Custom aliases with database-backed uniqueness protection
- Expiration, soft disable, deletion, and safe 302 redirects
- Redis cache-aside reads with PostgreSQL fallback when Redis is unavailable
- Atomic click counters that avoid lost updates under concurrency
- Redis fixed-window protection for URL creation
- OpenAPI-first API contracts with generated React Query hooks and Zod schemas
- Responsive dashboard, URL management, and statistics screens
- Docker Compose, health checks, structured logs, and GitHub Actions CI

## Architecture

```mermaid
flowchart LR
    Browser --> Web["React + Vite"]
    Web --> API["Spring Boot API"]
    API --> Redis["Redis cache + rate limiter"]
    API --> Postgres["PostgreSQL source of truth"]
```

See [docs/architecture.md](docs/architecture.md) for request flows, schema decisions, concurrency behavior, failure scenarios, and scaling notes.

## Stack

- TypeScript, React, Vite, Tailwind CSS
- Java 19, Spring Boot, Maven
- Spring JDBC and Jakarta Bean Validation
- PostgreSQL
- Redis via Spring Data Redis
- OpenAPI, Orval, Zod, TanStack Query
- Docker Compose and GitHub Actions

The repository uses a pnpm workspace for the React frontend and shared API contract, while the API is a conventional Maven Spring Boot service under `artifacts/api-server`.

## Run locally

### Prerequisites

- Java 19 or newer
- Maven 3.8+
- Node.js 20+ and pnpm
- PostgreSQL 16
- Redis 7 (optional; the API falls back to PostgreSQL when Redis is unavailable)

### Start dependencies

```bash
docker compose up -d postgres redis
```

### Run the Spring Boot API

```bash
export DATABASE_URL=postgresql://shortstack:shortstack@localhost:5432/shortstack
export REDIS_URL=redis://localhost:6379
export SHORT_URL_BASE_URL=http://localhost:5000
export CORS_ORIGIN=http://localhost:5173
export PORT=5000
mvn -f artifacts/api-server/pom.xml spring-boot:run
```

The API creates the `url_mappings` table and indexes automatically on startup.

### Run the React dashboard

```bash
pnpm install
pnpm --filter @workspace/api-spec run codegen
PORT=5173 BASE_PATH=/ API_URL=http://localhost:5000 pnpm --filter @workspace/url-shortener run dev
```

The API is available on port `5000` and the dashboard on port `5173`. Vite proxies `/api` requests to Spring Boot during local development.
### Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

The web application is available on port `5173`, the Spring Boot API on port `5000`, PostgreSQL on `5432`, and Redis on `6379`.

## API

The API contract lives in [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml). Generated hooks are regenerated with:

```bash
pnpm --filter @workspace/api-spec run codegen
```

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/healthz` | Health check |
| `GET` | `/api/v1/dashboard/summary` | Dashboard aggregates and recent URLs |
| `GET` | `/api/v1/urls` | Searchable, paginated URL mappings |
| `POST` | `/api/v1/urls` | Create a shortened URL |
| `GET` | `/api/v1/urls/{shortCode}` | Read URL metadata |
| `PATCH` | `/api/v1/urls/{shortCode}` | Update status or expiration |
| `DELETE` | `/api/v1/urls/{shortCode}` | Soft-disable a mapping |
| `GET` | `/api/v1/urls/{shortCode}/stats` | Read click statistics |
| `GET` | `/api/r/{shortCode}` | Routable 302 redirect endpoint |

Example:

```bash
curl -X POST http://localhost:5000/api/v1/urls \
  -H 'content-type: application/json' \
  -d '{"originalUrl":"https://example.com/a/long/path","customAlias":"demo"}'
```

## Testing and quality checks

```bash
mvn -f artifacts/api-server/pom.xml test
pnpm --filter @workspace/url-shortener run typecheck
pnpm --filter @workspace/url-shortener run build
```

## Configuration

Copy `.env.example` and set values for the environment. Never commit `.env`.

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string without the `jdbc:` prefix | required |
| `JDBC_DATABASE_URL` | Optional JDBC-prefixed PostgreSQL URL override | derived from `DATABASE_URL` |
| `REDIS_URL` | Redis connection string | optional |
| `REDIS_CACHE_TTL_SECONDS` | Mapping cache TTL | `3600` |
| `CREATE_RATE_LIMIT` | URL creations per minute per client | `30` |
| `SHORT_URL_BASE_URL` | Public URL base when deployed | request host |
| `CORS_ORIGIN` | Comma-separated allowed origins | permissive in local development |

## Future scale improvements

At higher traffic, click events can move to an append-only analytics path, Redis counters can be flushed with a database-backed lease, and redirect traffic can be split from management APIs. PostgreSQL remains the authority for mapping validity and alias uniqueness.

## License

MIT