package com.shortstack.api.model;

import java.time.Instant;

public record UrlMapping(
        Long id,
        String shortCode,
        String originalUrl,
        Instant createdAt,
        Instant expiresAt,
        boolean active,
        long clickCount,
        Instant updatedAt
) {
}