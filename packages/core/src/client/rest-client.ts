/**
 * H Wallet - REST Client for OKX V5 API
 *
 * Provides public and private request methods with automatic
 * HMAC-SHA256 signing, rate limiting, and error handling.
 */

import { generateAuthHeaders } from "../utils/signature.js";
import { HWalletError, AuthenticationError, RateLimitError, OkxApiError, NetworkError } from "../utils/errors.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HWalletConfig {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  baseUrl: string;
  timeoutMs: number;
  demo: boolean;
  site: "global" | "eea" | "us";
  proxyUrl?: string;
  sourceTag: string;
}

export interface OkxResponse<T = unknown> {
  code: string;
  msg: string;
  data: T;
}

interface RequestOptions {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
  auth: boolean;
}

// ---------------------------------------------------------------------------
// REST Client
// ---------------------------------------------------------------------------

export class RestClient {
  private config: HWalletConfig;

  constructor(config: HWalletConfig) {
    this.config = config;
  }

  /**
   * Public GET request (no authentication required).
   * Used for market data endpoints.
   */
  async publicGet<T = unknown>(
    path: string,
    query?: Record<string, string | number | undefined>
  ): Promise<OkxResponse<T>> {
    return this.request<T>({ method: "GET", path, query, auth: false });
  }

  /**
   * Private GET request (authentication required).
   * Used for account data, positions, orders.
   */
  async privateGet<T = unknown>(
    path: string,
    query?: Record<string, string | number | undefined>
  ): Promise<OkxResponse<T>> {
    return this.request<T>({ method: "GET", path, query, auth: true });
  }

  /**
   * Private POST request (authentication required).
   * Used for placing orders, creating bots, fund transfers.
   */
  async privatePost<T = unknown>(
    path: string,
    body?: Record<string, unknown>
  ): Promise<OkxResponse<T>> {
    return this.request<T>({ method: "POST", path, body, auth: true });
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async request<T>(options: RequestOptions): Promise<OkxResponse<T>> {
    const { method, path, query, body, auth } = options;

    // Build full URL with query string
    const queryString = query
      ? "?" + Object.entries(query)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";

    const requestPath = path + queryString;
    const url = this.config.baseUrl + requestPath;
    const bodyStr = body ? JSON.stringify(body) : "";

    // Build headers
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (auth) {
      if (!this.config.apiKey || !this.config.secretKey || !this.config.passphrase) {
        throw new AuthenticationError(
          "API credentials not configured.",
          "Run `h-wallet config init` to set up your API key."
        );
      }

      headers = generateAuthHeaders(
        method,
        requestPath,
        bodyStr,
        this.config.apiKey,
        this.config.secretKey,
        this.config.passphrase,
        this.config.demo
      );
    }

    // Execute request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (method === "POST" && bodyStr) {
        fetchOptions.body = bodyStr;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitError("Rate limit exceeded. Please wait before retrying.");
        }
        throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as OkxResponse<T>;

      // Check OKX business-level errors
      if (data.code !== "0") {
        const code = parseInt(data.code, 10);

        // Authentication errors: 50111, 50112, 50113
        if (code >= 50111 && code <= 50113) {
          throw new AuthenticationError(
            `OKX auth error (${data.code}): ${data.msg}`,
            "Check your API key, secret, and passphrase."
          );
        }

        throw new OkxApiError(data.code, data.msg);
      }

      return data;
    } catch (error) {
      if (error instanceof HWalletError) throw error;

      if (error instanceof Error && error.name === "AbortError") {
        throw new NetworkError(`Request timed out after ${this.config.timeoutMs}ms`);
      }

      throw new NetworkError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
