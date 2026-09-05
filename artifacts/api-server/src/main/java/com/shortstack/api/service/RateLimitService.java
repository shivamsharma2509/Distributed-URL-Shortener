package com.shortstack.api.service;

import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RateLimitService {
    private static final Logger log = LoggerFactory.getLogger(RateLimitService.class);
    private final StringRedisTemplate redis;

    public RateLimitService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public boolean allow(String clientKey, int limit) {
        if (limit <= 0) {
            return true;
        }
        try {
            String key = "shortstack:rate:create:" + clientKey;
            Long current = redis.opsForValue().increment(key);
            if (current != null && current == 1) {
                redis.expire(key, Duration.ofMinutes(1));
            }
            return current == null || current <= limit;
        } catch (RuntimeException exception) {
            log.debug("Redis rate limiting unavailable; allowing request: {}", exception.getMessage());
            return true;
        }
    }
}