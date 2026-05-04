/**
 * H Wallet Core - Entry Point
 *
 * Exports all core modules for use by CLI and MCP server.
 */

// Client
export { RestClient } from "./client/rest-client.js";
export type { HWalletConfig, OkxResponse } from "./client/rest-client.js";

// Onchain OS Client (V6)
export { OnchainClient } from "./client/onchainos-client.js";
export type { OnchainResult, OnchainClientOptions } from "./client/onchainos-client.js";

// Config
export { resolveConfig, readFullConfig, writeFullConfig, configFilePath } from "./config/config.js";
export type { HWalletProfile, HWalletTomlConfig } from "./config/config.js";

// Signature
export { getNow, buildPayload, signPayload, generateAuthHeaders } from "./utils/signature.js";

// Errors
export {
  HWalletError,
  ConfigError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  OkxApiError,
  NetworkError,
} from "./utils/errors.js";
