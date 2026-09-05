package com.shortstack.api.exception;

import org.springframework.http.HttpStatus;

public final class ExceptionTypes {
    private ExceptionTypes() {
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", message);
    }

    public static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "URL_NOT_FOUND", "Short URL does not exist");
    }

    public static ApiException duplicateAlias() {
        return new ApiException(HttpStatus.CONFLICT, "DUPLICATE_ALIAS", "That custom alias is already in use");
    }
}