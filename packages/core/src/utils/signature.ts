/**
 * H Wallet - OKX V5 API Signature Utilities
 *
 * Implements HMAC-SHA256 signing for OKX REST API v5.
 * Payload format: timestamp + METHOD + requestPath + body
 */

import { createHmac } from "node:crypto";

/**
 * Get current ISO 8601 timestamp for OKX API signing.
 * @returns ISO 8601 formatted timestamp string
 */
export function getNow(): string {
  return new Date().toISOString();
}

/**
 * Build the signing payload for OKX API.
 *
 * @param timestamp - ISO 8601 timestamp
 * @param method - HTTP method (uppercase: GET, POST)
 * @param requestPath - Request path including query string (e.g. /api/v5/market/ticker?instId=BTC-USDT)
 * @param body - Request body (empty string for GET requests)
 * @returns Concatenated payload string
 */
export function buildPayload(
  timestamp: string,
  method: string,
  requestPath: string,
  body: string = ""
): string {
  return timestamp + method.toUpperCase() + requestPath + body;
}

/**
 * Sign the payload using HMAC-SHA256 and return Base64-encoded signature.
 *
 * @param payload - The concatenated payload string
 * @param secretKey - The API secret key
 * @returns Base64-encoded HMAC-SHA256 signature
 */
export function signPayload(payload: string, secretKey: string): string {
  return createHmac("sha256", secretKey).update(payload).digest("base64");
}

/**
 * Generate complete OKX API authentication headers.
 *
 * @param method - HTTP method (GET/POST)
 * @param requestPath - Full request path with query string
 * @param body - Request body (JSON string for POST, empty for GET)
 * @param apiKey - OKX API Key
 * @param secretKey - OKX Secret Key
 * @param passphrase - OKX Passphrase
 * @param demo - Whether this is a demo/simulated trading request
 * @returns Object containing all required authentication headers
 */
export function generateAuthHeaders(
  method: string,
  requestPath: string,
  body: string,
  apiKey: string,
  secretKey: string,
  passphrase: string,
  demo: boolean = false
): Record<string, string> {
  const timestamp = getNow();
  const payload = buildPayload(timestamp, method, requestPath, body);
  const sign = signPayload(payload, secretKey);

  const headers: Record<string, string> = {
    "OK-ACCESS-KEY": apiKey,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-PASSPHRASE": passphrase,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "Content-Type": "application/json",
  };

  if (demo) {
    headers["x-simulated-trading"] = "1";
  }

  return headers;
}
