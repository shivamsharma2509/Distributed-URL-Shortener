package com.shortstack.api.model;

import java.util.List;

public record DashboardSummaryResponse(
        long totalUrls,
        long activeUrls,
        long totalClicks,
        List<UrlResponse> recentUrls
) {
}