package com.shortstack.api;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ShortstackApplication {
    public static void main(String[] args) {
        normalizeDatabaseUrl();
        SpringApplication.run(ShortstackApplication.class, args);
    }

    private static void normalizeDatabaseUrl() {
        String databaseUrl = System.getenv("JDBC_DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank()) {
            databaseUrl = System.getenv("DATABASE_URL");
        }
        if (databaseUrl == null || databaseUrl.isBlank()) {
            return;
        }

        String uriValue = databaseUrl.startsWith("jdbc:")
                ? databaseUrl.substring("jdbc:".length())
                : databaseUrl;
        URI uri = URI.create(uriValue);
        StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
                .append(uri.getHost());
        if (uri.getPort() > 0) {
            jdbcUrl.append(":").append(uri.getPort());
        }
        if (uri.getRawPath() != null) {
            jdbcUrl.append(uri.getRawPath());
        }
        if (uri.getRawQuery() != null) {
            jdbcUrl.append("?").append(uri.getRawQuery());
        }

        if (uri.getUserInfo() != null) {
            String[] credentials = uri.getUserInfo().split(":", 2);
            System.setProperty("spring.datasource.username", decode(credentials[0]));
            if (credentials.length == 2) {
                System.setProperty("spring.datasource.password", decode(credentials[1]));
            }
        }
        System.setProperty("JDBC_DATABASE_URL", jdbcUrl.toString());
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}