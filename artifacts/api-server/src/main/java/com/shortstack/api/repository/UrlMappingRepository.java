package com.shortstack.api.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.shortstack.api.model.UrlMapping;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class UrlMappingRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private final RowMapper<UrlMapping> rowMapper = this::mapRow;

    public UrlMappingRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<UrlMapping> findByShortCode(String shortCode) {
        return jdbc.query("""
                SELECT id, short_code, original_url, created_at, expires_at, active, click_count, updated_at
                FROM url_mappings WHERE short_code = :shortCode
                """, Map.of("shortCode", shortCode), rowMapper).stream().findFirst();
    }

    public Optional<UrlMapping> findActiveForRedirect(String shortCode) {
        return jdbc.query("""
                SELECT id, short_code, original_url, created_at, expires_at, active, click_count, updated_at
                FROM url_mappings
                WHERE short_code = :shortCode
                  AND active = TRUE
                  AND (expires_at IS NULL OR expires_at > NOW())
                """, Map.of("shortCode", shortCode), rowMapper).stream().findFirst();
    }

    public Long insertPending(String shortCode, String originalUrl, Instant expiresAt) {
        var params = new MapSqlParameterSource()
                .addValue("shortCode", shortCode)
                .addValue("originalUrl", originalUrl)
                .addValue("expiresAt", toDatabaseTimestamp(expiresAt));
        return jdbc.queryForObject("""
                INSERT INTO url_mappings (short_code, original_url, expires_at, active, click_count)
                VALUES (:shortCode, :originalUrl, :expiresAt, TRUE, 0)
                RETURNING id
                """, params, Long.class);
    }

    public void replaceShortCode(Long id, String shortCode) {
        jdbc.update("""
                UPDATE url_mappings SET short_code = :shortCode, updated_at = NOW()
                WHERE id = :id
                """, Map.of("id", id, "shortCode", shortCode));
    }

    public void deleteById(Long id) {
        jdbc.update("DELETE FROM url_mappings WHERE id = :id", Map.of("id", id));
    }

    public void incrementClickCount(Long id) {
        jdbc.update("""
                UPDATE url_mappings
                SET click_count = click_count + 1, updated_at = NOW()
                WHERE id = :id
                """, Map.of("id", id));
    }

    public Optional<UrlMapping> update(String shortCode, Boolean active, boolean activeProvided,
                                       Instant expiresAt, boolean expiresAtProvided) {
        List<String> updates = new ArrayList<>();
        var params = new MapSqlParameterSource().addValue("shortCode", shortCode);
        if (activeProvided) {
            updates.add("active = :active");
            params.addValue("active", active);
        }
        if (expiresAtProvided) {
            updates.add("expires_at = :expiresAt");
            params.addValue("expiresAt", toDatabaseTimestamp(expiresAt));
        }
        if (updates.isEmpty()) {
            return findByShortCode(shortCode);
        }
        updates.add("updated_at = NOW()");
        jdbc.update("UPDATE url_mappings SET " + String.join(", ", updates)
                + " WHERE short_code = :shortCode", params);
        return findByShortCode(shortCode);
    }

    public List<UrlMapping> list(String status, String search, int page, int pageSize) {
        QueryParts query = queryParts(status, search);
        query.params.addValue("limit", pageSize).addValue("offset", page * pageSize);
        return jdbc.query("""
                SELECT id, short_code, original_url, created_at, expires_at, active, click_count, updated_at
                FROM url_mappings
                WHERE %s
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
                """.formatted(query.where), query.params, rowMapper);
    }

    public long count(String status, String search) {
        QueryParts query = queryParts(status, search);
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM url_mappings WHERE " + query.where,
                query.params,
                Long.class
        );
        return count == null ? 0 : count;
    }

    public List<UrlMapping> recent(int limit) {
        return jdbc.query("""
                SELECT id, short_code, original_url, created_at, expires_at, active, click_count, updated_at
                FROM url_mappings ORDER BY created_at DESC LIMIT :limit
                """, Map.of("limit", limit), rowMapper);
    }

    public long totalCount() {
        return number("SELECT COUNT(*) FROM url_mappings");
    }

    public long activeCount() {
        return number("""
                SELECT COUNT(*) FROM url_mappings
                WHERE active = TRUE AND (expires_at IS NULL OR expires_at > NOW())
                """);
    }

    public long totalClicks() {
        return number("SELECT COALESCE(SUM(click_count), 0) FROM url_mappings");
    }

    private QueryParts queryParts(String status, String search) {
        List<String> clauses = new ArrayList<>();
        var params = new MapSqlParameterSource();
        if (search != null && !search.isBlank()) {
            clauses.add("(short_code ILIKE :search OR original_url ILIKE :search)");
            params.addValue("search", "%" + search.trim() + "%");
        }
        switch (status) {
            case "all" -> {
            }
            case "active" -> clauses.add("active = TRUE AND (expires_at IS NULL OR expires_at > NOW())");
            case "disabled" -> clauses.add("active = FALSE");
            case "expired" -> clauses.add("expires_at IS NOT NULL AND expires_at <= NOW()");
            default -> throw new IllegalArgumentException("Unsupported status");
        }
        return new QueryParts(clauses.isEmpty() ? "TRUE" : String.join(" AND ", clauses), params);
    }

    private long number(String sql) {
        Long value = jdbc.getJdbcTemplate().queryForObject(sql, Long.class);
        return value == null ? 0 : value;
    }

    private UrlMapping mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new UrlMapping(
                rs.getLong("id"),
                rs.getString("short_code"),
                rs.getString("original_url"),
                toInstant(rs.getObject("created_at")),
                toInstant(rs.getObject("expires_at")),
                rs.getBoolean("active"),
                rs.getLong("click_count"),
                toInstant(rs.getObject("updated_at"))
        );
    }

    private Instant toInstant(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.toInstant();
        }
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toInstant();
        }
        throw new IllegalStateException("Unsupported timestamp type: " + value.getClass());
    }

    private OffsetDateTime toDatabaseTimestamp(Instant value) {
        return value == null ? null : value.atOffset(ZoneOffset.UTC);
    }

    private record QueryParts(String where, MapSqlParameterSource params) {
    }
}