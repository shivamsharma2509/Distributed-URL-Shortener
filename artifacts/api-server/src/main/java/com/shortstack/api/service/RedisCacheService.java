package com.shortstack.api.service;

import java.time.Duration;
import java.util.Optional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RedisCacheService {
    private static final Logger log = LoggerFactory.getLogger(RedisCacheService.class);
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final long ttlSeconds;

    public RedisCacheService(
            StringRedisTemplate redis,
            ObjectMapper objectMapper,
            @Value("${shortstack.cache-ttl-seconds:3600}") long ttlSeconds
    ) {
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.ttlSeconds = Math.max(1, ttlSeconds);
    }

    public Optional<CachedRedirect> get(String shortCode) {
        try {
            String value = redis.opsForValue().get(key(shortCode));
            if (value == null) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(value, CachedRedirect.class));
        } catch (JsonProcessingException exception) {
            log.debug("Redis cache payload could not be decoded: {}", exception.getMessage());
            return Optional.empty();
        } catch (RuntimeException exception) {
            log.debug("Redis cache read unavailable; falling back to PostgreSQL: {}", exception.getMessage());
            return Optional.empty();
        }
    }

    public void put(String shortCode, CachedRedirect redirect) {
        try {
            redis.opsForValue().set(key(shortCode), objectMapper.writeValueAsString(redirect),
                    Duration.ofSeconds(ttlSeconds));
        } catch (JsonProcessingException exception) {
            log.debug("Redis cache payload could not be encoded: {}", exception.getMessage());
        } catch (RuntimeException exception) {
            log.debug("Redis cache write unavailable: {}", exception.getMessage());
        }
    }

    public void invalidate(String shortCode) {
        try {
            redis.delete(key(shortCode));
        } catch (RuntimeException exception) {
            log.debug("Redis cache invalidation unavailable: {}", exception.getMessage());
        }
    }

    private String key(String shortCode) {
        return "shortstack:url:" + shortCode;
    }

    public record CachedRedirect(Long id, String originalUrl) {
    }
}