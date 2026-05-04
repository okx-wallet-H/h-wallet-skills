/**
 * H Wallet - Error Class Hierarchy
 *
 * Structured error types for clear error handling and user-facing messages.
 */

export class HWalletError extends Error {
  public readonly hint?: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "HWalletError";
    this.hint = hint;
  }
}

/**
 * Configuration is missing or malformed.
 */
export class ConfigError extends HWalletError {
  constructor(message: string, hint?: string) {
    super(message, hint);
    this.name = "ConfigError";
  }
}

/**
 * Tool input parameter validation failed.
 */
export class ValidationError extends HWalletError {
  constructor(message: string, hint?: string) {
    super(message, hint);
    this.name = "ValidationError";
  }
}

/**
 * API Key / signature authentication failed (OKX codes 50111-50113).
 */
export class AuthenticationError extends HWalletError {
  constructor(message: string, hint?: string) {
    super(message, hint);
    this.name = "AuthenticationError";
  }
}

/**
 * Client-side rate limit exceeded.
 */
export class RateLimitError extends HWalletError {
  constructor(message: string, hint?: string) {
    super(message, hint ?? "Wait a moment before retrying.");
    this.name = "RateLimitError";
  }
}

/**
 * OKX API returned a business-level error (code !== "0").
 */
export class OkxApiError extends HWalletError {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(`OKX API Error [${code}]: ${message}`);
    this.name = "OkxApiError";
    this.code = code;
  }
}

/**
 * Network failure, timeout, or non-JSON response.
 */
export class NetworkError extends HWalletError {
  constructor(message: string, hint?: string) {
    super(message, hint ?? "Check network connectivity and retry.");
    this.name = "NetworkError";
  }
}
