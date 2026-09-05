package com.shortstack.api.service;

import java.net.URI;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.shortstack.api.exception.ExceptionTypes;
import com.shortstack.api.model.CreateUrlRequest;
import com.shortstack.api.model.UrlMapping;
import com.shortstack.api.repository.UrlMappingRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UrlMappingService {
    private static final Set<String> RESERVED_ALIASES = Set.of(
            "api", "healthz", "actuator", "favicon.ico", "robots.txt"
    );

    private final UrlMappingRepository repository;
    private final RedisCacheService cache;

    public UrlMappingService(UrlMappingRepository repository, RedisCacheService cache) {
        this.repository = repository;
        this.cache = cache;
    }

    @Transactional
    public UrlMapping create(CreateUrlRequest request) {
        validateOriginalUrl(request.originalUrl());
        validateExpiration(request.expiresAt());
        if (request.customAlias() != null && isReservedAlias(request.customAlias())) {
            throw ExceptionTypes.badRequest("That alias is reserved");
        }

        if (request.customAlias() != null && !request.customAlias().isBlank()) {
            try {
                Long id = repository.insertPending(request.customAlias(), request.originalUrl(), request.expiresAt());
                return repository.findByShortCode(request.customAlias()).orElseThrow(() -> new IllegalStateException("Created mapping disappeared"));
            } catch (DuplicateKeyException exception) {
                throw ExceptionTypes.duplicateAlias();
            }
        }

        for (int attempt = 0; attempt < 3; attempt++) {
            String pendingCode = UUID.randomUUID().toString().replace("-", "").substring(0, 32);
            Long id = repository.insertPending(pendingCode, request.originalUrl(), request.expiresAt());
            String shortCode = Base62.encode(id);
            try {
                repository.replaceShortCode(id, shortCode);
                return repository.findByShortCode(shortCode).orElseThrow(() -> new IllegalStateException("Created mapping disappeared"));
            } catch (DuplicateKeyException exception) {
                repository.deleteById(id);
            }
        }
        throw new IllegalStateException("Could not allocate a unique short code");
    }

    public Optional<UrlMapping> find(String shortCode) {
        validateShortCode(shortCode);
        return repository.findByShortCode(shortCode);
    }

    public Optional<RedisCacheService.CachedRedirect> findRedirect(String shortCode) {
        validateShortCode(shortCode);
        Optional<RedisCacheService.CachedRedirect> cached = cache.get(shortCode);
        if (cached.isPresent()) {
            return cached;
        }
        Optional<UrlMapping> mapping = repository.findActiveForRedirect(shortCode);
        mapping.ifPresent(value -> cache.put(shortCode,
                new RedisCacheService.CachedRedirect(value.id(), value.originalUrl())));
        return mapping.map(value -> new RedisCacheService.CachedRedirect(value.id(), value.originalUrl()));
    }

    @Transactional
    public Optional<UrlMapping> update(String shortCode, JsonNode body) {
        validateShortCode(shortCode);
        if (body == null || !body.isObject()) {
            throw ExceptionTypes.badRequest("Request body must be a JSON object");
        }

        boolean activeProvided = body.has("active");
        Boolean active = null;
        if (activeProvided && !body.get("active").isNull()) {
            if (!body.get("active").isBoolean()) {
                throw ExceptionTypes.badRequest("active must be a boolean");
            }
            active = body.get("active").booleanValue();
        }

        boolean expiresAtProvided = body.has("expiresAt");
        Instant expiresAt = null;
        if (expiresAtProvided && !body.get("expiresAt").isNull()) {
            if (!body.get("expiresAt").isTextual()) {
                throw ExceptionTypes.badRequest("expiresAt must be an ISO-8601 date-time or null");
            }
            try {
                expiresAt = Instant.parse(body.get("expiresAt").textValue());
            } catch (Exception exception) {
                throw ExceptionTypes.badRequest("expiresAt must be an ISO-8601 date-time or null");
            }
            validateExpiration(expiresAt);
        }

        Optional<UrlMapping> updated = repository.update(
                shortCode, active, activeProvided && active != null, expiresAt, expiresAtProvided
        );
        cache.invalidate(shortCode);
        return updated;
    }

    @Transactional
    public Optional<UrlMapping> disable(String shortCode) {
        validateShortCode(shortCode);
        Optional<UrlMapping> updated = repository.update(shortCode, false, true, null, false);
        cache.invalidate(shortCode);
        return updated;
    }

    @Transactional
    public void incrementClickCount(Long id) {
        repository.incrementClickCount(id);
    }

    public static boolean isReservedAlias(String alias) {
        return RESERVED_ALIASES.contains(alias.toLowerCase());
    }

    private void validateOriginalUrl(String value) {
        try {
            URI uri = URI.create(value);
            if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null) {
                throw ExceptionTypes.badRequest("originalUrl must be a complete http:// or https:// URL");
            }
        } catch (IllegalArgumentException exception) {
            throw ExceptionTypes.badRequest("originalUrl must be a complete http:// or https:// URL");
        }
    }

    private void validateExpiration(Instant expiresAt) {
        if (expiresAt != null && !expiresAt.isAfter(Instant.now())) {
            throw new com.shortstack.api.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "INVALID_EXPIRATION",
                    "Expiration must be in the future"
            );
        }
    }

    private void validateShortCode(String shortCode) {
        if (shortCode == null || !shortCode.matches("^[A-Za-z0-9_-]{1,32}$")) {
            throw ExceptionTypes.notFound();
        }
    }
}