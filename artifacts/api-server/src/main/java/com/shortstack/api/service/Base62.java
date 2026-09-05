package com.shortstack.api.service;

public final class Base62 {
    private static final String ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    private Base62() {
    }

    public static String encode(long value) {
        if (value < 0) {
            throw new IllegalArgumentException("Identifier must be non-negative");
        }
        if (value == 0) {
            return "0";
        }
        StringBuilder result = new StringBuilder();
        long remainder = value;
        while (remainder > 0) {
            result.append(ALPHABET.charAt((int) (remainder % 62)));
            remainder /= 62;
        }
        return result.reverse().toString();
    }
}