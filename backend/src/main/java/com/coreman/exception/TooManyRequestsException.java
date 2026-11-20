package com.coreman.exception;

/** Rate limit hit on a public endpoint — returned as HTTP 429 with a friendly message. */
public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
