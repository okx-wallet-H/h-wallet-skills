/**
 * Argument parsing utilities for H Wallet CLI.
 * Lightweight — no external dependencies.
 */

export interface GlobalFlags {
  json: boolean;
  profile: string;
  demo: boolean;
}

export interface ParsedArgs {
  args: string[];
  flags: GlobalFlags;
}

/**
 * Extract global flags from raw argv, return remaining positional args.
 */
export function parseGlobalFlags(rawArgs: string[]): ParsedArgs {
  const flags: GlobalFlags = {
    json: false,
    profile: 'default',
    demo: false,
  };

  const args: string[] = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];

    if (arg === '--json') {
      flags.json = true;
    } else if (arg === '--demo') {
      flags.demo = true;
    } else if (arg === '--profile' && i + 1 < rawArgs.length) {
      flags.profile = rawArgs[++i];
    } else {
      args.push(arg);
    }
  }

  return { args, flags };
}

/**
 * Parse command-specific flags from args array.
 * Returns a map of flag names to values.
 *
 * Supports:
 *   --flag value
 *   --flag=value
 *   --boolFlag (no value, treated as true)
 */
export function parseCommandFlags(args: string[]): { positional: string[]; flags: Record<string, string | boolean> } {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        // --key=value
        const key = arg.slice(2, eqIdx);
        flags[key] = arg.slice(eqIdx + 1);
      } else {
        const key = arg.slice(2);
        // Check if next arg is a value (not another flag)
        if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          flags[key] = args[++i];
        } else {
          flags[key] = true;
        }
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

/**
 * Get a required flag value, throw if missing.
 */
export function requireFlag(flags: Record<string, string | boolean>, name: string): string {
  const val = flags[name];
  if (val === undefined || val === true) {
    throw new Error(`Missing required flag: --${name}`);
  }
  return val as string;
}

/**
 * Get an optional flag value with default.
 */
export function optionalFlag(flags: Record<string, string | boolean>, name: string, defaultValue: string): string {
  const val = flags[name];
  if (val === undefined || val === true) {
    return defaultValue;
  }
  return val as string;
}
