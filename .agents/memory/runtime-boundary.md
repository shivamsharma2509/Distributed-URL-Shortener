---
name: Runtime boundary
description: The deployable workspace runtime and its backend conventions.
---

The product uses a split runtime: the dashboard remains a pnpm/Vite React artifact, and the deployable API is a Maven Spring Boot service in the API artifact. The API uses Spring MVC, Spring JDBC/Hikari, PostgreSQL, and optional Spring Data Redis.

**Why:** The user explicitly requires a Java/Spring Boot backend, while the existing managed artifact routing and frontend depend on the pnpm workspace. Keeping the wrapper package preserves the workflow without keeping a Node server.

**How to apply:** Keep frontend and generated-contract work in pnpm. Put API behavior, persistence, caching, rate limiting, and server-side validation in the Spring Boot Maven project; do not reintroduce an Express runtime.