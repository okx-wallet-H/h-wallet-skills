/**
 * H Wallet - Configuration Management
 *
 * Reads and writes configuration from ~/.h-wallet/config.toml
 * Supports multiple profiles (live, demo) with environment variable overrides.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { ConfigError } from "../utils/errors.js";
import type { HWalletConfig } from "../client/rest-client.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HWalletProfile {
  api_key?: string;
  secret_key?: string;
  passphrase?: string;
  base_url?: string;
  timeout_ms?: number;
  demo?: boolean;
  site?: "global" | "eea" | "us";
  proxy_url?: string;
}

export interface HWalletTomlConfig {
  default_profile?: string;
  profiles: Record<string, HWalletProfile>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SITE_BASE_URLS: Record<string, string> = {
  global: "https://www.okx.com",
  eea: "https://eea.okx.com",
  us: "https://us.okx.com",
};

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_SOURCE_TAG = "HWallet";

// ---------------------------------------------------------------------------
// File Operations
// ---------------------------------------------------------------------------

export function configFilePath(): string {
  return join(homedir(), ".h-wallet", "config.toml");
}

/**
 * Read the full config from ~/.h-wallet/config.toml.
 * Returns a config with empty profiles if the file does not exist.
 */
export function readFullConfig(): HWalletTomlConfig {
  const path = configFilePath();
  if (!existsSync(path)) return { profiles: {} };

  const raw = readFileSync(path, "utf-8");
  try {
    return parseToml(raw);
  } catch (err) {
    throw new ConfigError(
      `Failed to parse ${path}: ${err instanceof Error ? err.message : String(err)}`,
      "If your passphrase or keys contain special characters:\n" +
        "  - Contains # \\ \"  → use single quotes:  passphrase = 'your#pass'\n" +
        "  - Contains '       → use double quotes:  passphrase = \"your'pass\"\n" +
        "Or re-run: h-wallet config init"
    );
  }
}

/**
 * Write the full config to ~/.h-wallet/config.toml.
 */
export function writeFullConfig(config: HWalletTomlConfig): void {
  const path = configFilePath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const header =
    "# H Wallet Configuration\n" +
    "# Wrap values containing special chars in quotes\n\n";

  writeFileSync(path, header + stringifyToml(config), "utf-8");
}

// ---------------------------------------------------------------------------
// Profile Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a profile into a complete HWalletConfig.
 * Priority: Environment variables > TOML profile values > defaults.
 */
export function resolveConfig(profileName?: string): HWalletConfig {
  const fullConfig = readFullConfig();
  const name = profileName ?? fullConfig.default_profile ?? "default";
  const profile = fullConfig.profiles?.[name] ?? {};

  // Environment variable overrides
  const apiKey = process.env.H_WALLET_API_KEY?.trim() ?? process.env.OKX_API_KEY?.trim() ?? profile.api_key ?? "";
  const secretKey = process.env.H_WALLET_SECRET_KEY?.trim() ?? process.env.OKX_SECRET_KEY?.trim() ?? profile.secret_key ?? "";
  const passphrase = process.env.H_WALLET_PASSPHRASE?.trim() ?? process.env.OKX_PASSPHRASE?.trim() ?? profile.passphrase ?? "";

  const site = (profile.site ?? "global") as "global" | "eea" | "us";
  const baseUrl = profile.base_url ?? SITE_BASE_URLS[site] ?? SITE_BASE_URLS.global;

  return {
    apiKey,
    secretKey,
    passphrase,
    baseUrl,
    timeoutMs: profile.timeout_ms ?? DEFAULT_TIMEOUT_MS,
    demo: profile.demo ?? false,
    site,
    proxyUrl: profile.proxy_url,
    sourceTag: DEFAULT_SOURCE_TAG,
  };
}

// ---------------------------------------------------------------------------
// Simple TOML Parser/Serializer (minimal, handles our config format)
// ---------------------------------------------------------------------------

function parseToml(raw: string): HWalletTomlConfig {
  const config: HWalletTomlConfig = { profiles: {} };
  let currentProfile: string | null = null;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Profile header: [profiles.xxx]
    const profileMatch = trimmed.match(/^\[profiles\.(\w+)\]$/);
    if (profileMatch) {
      currentProfile = profileMatch[1];
      config.profiles[currentProfile] = {};
      continue;
    }

    // Top-level key
    const kvMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (kvMatch) {
      const [, key, rawValue] = kvMatch;
      const value = parseTomlValue(rawValue);

      if (currentProfile && config.profiles[currentProfile]) {
        (config.profiles[currentProfile] as Record<string, unknown>)[key] = value;
      } else if (key === "default_profile") {
        config.default_profile = String(value);
      }
    }
  }

  return config;
}

function parseTomlValue(raw: string): string | number | boolean {
  const trimmed = raw.trim();

  // Boolean
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  // Number
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);

  // String (quoted)
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function stringifyToml(config: HWalletTomlConfig): string {
  let output = "";

  if (config.default_profile) {
    output += `default_profile = "${config.default_profile}"\n\n`;
  }

  for (const [name, profile] of Object.entries(config.profiles)) {
    output += `[profiles.${name}]\n`;
    for (const [key, value] of Object.entries(profile)) {
      if (value === undefined) continue;
      if (typeof value === "string") {
        output += `${key} = "${value}"\n`;
      } else if (typeof value === "boolean") {
        output += `${key} = ${value}\n`;
      } else if (typeof value === "number") {
        output += `${key} = ${value}\n`;
      }
    }
    output += "\n";
  }

  return output;
}
