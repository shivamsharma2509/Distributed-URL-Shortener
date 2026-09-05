package com.shortstack.api.controller;

import java.net.URI;

import com.shortstack.api.service.UrlMappingService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class RedirectController {
    private final UrlMappingService service;

    public RedirectController(UrlMappingService service) {
        this.service = service;
    }

    @GetMapping("/r/{shortCode}")
    public ResponseEntity<Void> redirect(@PathVariable String shortCode) {
        return service.findRedirect(shortCode)
                .map(mapping -> {
                    service.incrementClickCount(mapping.id());
                    HttpHeaders headers = new HttpHeaders();
                    headers.setLocation(URI.create(mapping.originalUrl()));
                    return new ResponseEntity<Void>(headers, HttpStatus.FOUND);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}