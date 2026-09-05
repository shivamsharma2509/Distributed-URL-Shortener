---
name: Spring JDBC timestamps
description: PostgreSQL timestamp parameter binding behavior in the Spring JDBC API.
---

When writing PostgreSQL `timestamptz` values through `NamedParameterJdbcTemplate`, convert `Instant` values to UTC `OffsetDateTime` before binding them. Directly binding a non-null `Instant` can produce an internal server error even though null timestamp parameters work.

**Why:** The create flow initially succeeded without expiration and failed only when an expiration was supplied; PostgreSQL's JDBC type inference did not accept the Java `Instant` parameter in this setup.

**How to apply:** Use the UTC `OffsetDateTime` representation for expiration inserts and updates, while continuing to map returned PostgreSQL timestamps back to `Instant`.