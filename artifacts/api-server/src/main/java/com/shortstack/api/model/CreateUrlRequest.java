package com.shortstack.api.model;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateUrlRequest(
        @NotBlank(message = "originalUrl is required")
        @Size(max = 2048, message = "originalUrl must be at most 2048 characters")
        String originalUrl,

        @Size(min = 3, max = 32, message = "customAlias must be between 3 and 32 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "customAlias contains unsupported characters")
        String customAlias,

        Instant expiresAt
) {
}