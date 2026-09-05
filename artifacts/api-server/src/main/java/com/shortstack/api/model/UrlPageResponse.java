package com.shortstack.api.model;

import java.util.List;

public record UrlPageResponse(
        List<UrlResponse> items,
        int page,
        int pageSize,
        long totalItems,
        int totalPages
) {
}