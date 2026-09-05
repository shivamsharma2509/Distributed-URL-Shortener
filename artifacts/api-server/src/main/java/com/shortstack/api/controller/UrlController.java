package com.shortstack.api.controller;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.shortstack.api.exception.ExceptionTypes;
import com.shortstack.api.model.CreateUrlRequest;
import com.shortstack.api.model.DashboardSummaryResponse;
import com.shortstack.api.model.UrlMapping;
import com.shortstack.api.model.UrlPageResponse;
import com.shortstack.api.model.UrlResponse;
import com.shortstack.api.model.UrlStatsResponse;
import com.shortstack.api.repository.UrlMappingRepository;
import com.shortstack.api.service.RateLimitService;
import com.shortstack.api.service.UrlMappingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class UrlController {
    private final UrlMappingService service;
    private final UrlMappingRepository repository;
    private final RateLimitService rateLimitService;
    private final String shortUrlBaseUrl;
    private final int createRateLimit;

    public UrlController(
            UrlMappingService service,
            UrlMappingRepository repository,
            RateLimitService rateLimitService,
            @Value("${shortstack.short-url-base-url:}") String shortUrlBaseUrl,
            @Value("${shortstack.create-rate-limit:30}") int createRateLimit
    ) {
        this.service = service;
        this.repository = repository;
        this.rateLimitService = rateLimitService;
        this.shortUrlBaseUrl = shortUrlBaseUrl;
        this.createRateLimit = createRateLimit;
    }

    @GetMapping("/dashboard/summary")
    public DashboardSummaryResponse dashboard(HttpServletRequest request) {
        return new DashboardSummaryResponse(
                repository.totalCount(),
                repository.activeCount(),
                repository.totalClicks(),
                repository.recent(5).stream().map(mapping -> response(mapping, request)).toList()
        );
    }

    @GetMapping("/urls")
    public UrlPageResponse list(
            @RequestParam(defaultValue = "all") String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            HttpServletRequest request
    ) {
        if (!List.of("all", "active", "disabled", "expired").contains(status)) {
            throw ExceptionTypes.badRequest("status must be all, active, disabled, or expired");
        }
        if (page < 0 || pageSize < 1 || pageSize > 100) {
            throw ExceptionTypes.badRequest("page must be non-negative and pageSize must be between 1 and 100");
        }
        long total = repository.count(status, search);
        int totalPages = (int) Math.ceil((double) total / pageSize);
        return new UrlPageResponse(
                repository.list(status, search, page, pageSize).stream().map(mapping -> response(mapping, request)).toList(),
                page,
                pageSize,
                total,
                totalPages
        );
    }

    @PostMapping("/urls")
    public ResponseEntity<UrlResponse> create(
            @Valid @RequestBody CreateUrlRequest body,
            HttpServletRequest request
    ) {
        String clientKey = request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
        if (!rateLimitService.allow(clientKey, createRateLimit)) {
            throw new com.shortstack.api.exception.ApiException(
                    org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
                    "RATE_LIMITED",
                    "Too many URL creation requests"
            );
        }
        return ResponseEntity.status(201).body(response(service.create(body), request));
    }

    @GetMapping("/urls/{shortCode}")
    public UrlResponse get(@PathVariable String shortCode, HttpServletRequest request) {
        return service.find(shortCode).map(mapping -> response(mapping, request)).orElseThrow(ExceptionTypes::notFound);
    }

    @PatchMapping("/urls/{shortCode}")
    public UrlResponse update(
            @PathVariable String shortCode,
            @RequestBody JsonNode body,
            HttpServletRequest request
    ) {
        return service.update(shortCode, body).map(mapping -> response(mapping, request)).orElseThrow(ExceptionTypes::notFound);
    }

    @DeleteMapping("/urls/{shortCode}")
    public ResponseEntity<Void> delete(@PathVariable String shortCode) {
        service.disable(shortCode).orElseThrow(ExceptionTypes::notFound);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/urls/{shortCode}/stats")
    public UrlStatsResponse stats(@PathVariable String shortCode) {
        UrlMapping mapping = service.find(shortCode).orElseThrow(ExceptionTypes::notFound);
        return new UrlStatsResponse(mapping.shortCode(), mapping.clickCount(), mapping.active(), mapping.expiresAt(), mapping.updatedAt());
    }

    private UrlResponse response(UrlMapping mapping, HttpServletRequest request) {
        return UrlResponse.from(mapping, request, shortUrlBaseUrl);
    }
}