package com.shortstack.api.model;

import java.time.Instant;

public record UrlStatsResponse(
        String shortCode,
        long clickCount,
        boolean active,
        Instant expiresAt,
        Instant lastUpdatedAt
) {
}