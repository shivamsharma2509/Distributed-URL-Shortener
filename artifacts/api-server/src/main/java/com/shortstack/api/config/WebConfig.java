package com.shortstack.api.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final String configuredOrigins;

    public WebConfig(@Value("${CORS_ORIGIN:}") String configuredOrigins) {
        this.configuredOrigins = configuredOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        var mapping = registry.addMapping("/api/**")
                .allowedMethods("GET", "POST", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);

        if (configuredOrigins == null || configuredOrigins.isBlank()) {
            mapping.allowedOriginPatterns("*");
        } else {
            List<String> origins = Arrays.stream(configuredOrigins.split(","))
                    .map(String::trim)
                    .filter(origin -> !origin.isBlank())
                    .toList();
            mapping.allowedOrigins(origins.toArray(String[]::new));
        }
    }
}