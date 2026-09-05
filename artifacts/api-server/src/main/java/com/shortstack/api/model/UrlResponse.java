package com.shortstack.api.model;

import java.time.Instant;

import jakarta.servlet.http.HttpServletRequest;

public record UrlResponse(
        String shortCode,
        String shortUrl,
        String originalUrl,
        Instant createdAt,
        Instant expiresAt,
        boolean active,
        long clickCount,
        Instant updatedAt
) {
    public static UrlResponse from(UrlMapping mapping, HttpServletRequest request, String configuredBaseUrl) {
        String baseUrl = configuredBaseUrl == null || configuredBaseUrl.isBlank()
                ? request.getScheme() + "://" + request.getServerName() + portSuffix(request)
                : configuredBaseUrl.replaceAll("/+$", "");
        return new UrlResponse(
                mapping.shortCode(),
                baseUrl + "/api/r/" + mapping.shortCode(),
                mapping.originalUrl(),
                mapping.createdAt(),
                mapping.expiresAt(),
                mapping.active(),
                mapping.clickCount(),
                mapping.updatedAt()
        );
    }

    private static String portSuffix(HttpServletRequest request) {
        int port = request.getServerPort();
        boolean standard = ("http".equalsIgnoreCase(request.getScheme()) && port == 80)
                || ("https".equalsIgnoreCase(request.getScheme()) && port == 443);
        return standard ? "" : ":" + port;
    }
}