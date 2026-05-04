#!/usr/bin/env node
/**
 * H Wallet Trade CLI
 * Entry point — parses top-level command group and dispatches to sub-handlers.
 */

import { parseGlobalFlags, type GlobalFlags } from './utils/args.js';
import { printError, printHelp } from './utils/output.js';

// Command group registry
const COMMAND_GROUPS: Record<string, () => Promise<{ execute: (args: string[], flags: GlobalFlags) => Promise<void> }>> = {
  auth:     () => import('./commands/auth/index.js'),
  account:  () => import('./commands/account/index.js'),
  market:   () => import('./commands/market/index.js'),
  swap:     () => import('./commands/swap/index.js'),
  grid:     () => import('./commands/grid/index.js'),
  dca:      () => import('./commands/dca/index.js'),
  signal:   () => import('./commands/signal/index.js'),
  meme:     () => import('./commands/meme/index.js'),
  sniper:   () => import('./commands/sniper/index.js'),
  wallet:   () => import('./commands/wallet/index.js'),
  security: () => import('./commands/security/index.js'),
  switch:   () => import('./commands/switch/index.js'),
  autopay:  () => import('./commands/autopay/index.js'),
  config:   () => import('./commands/auth/config.js'),
};

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);

  // Extract global flags (--json, --profile, --demo)
  const { args, flags } = parseGlobalFlags(rawArgs);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    printHelp();
    process.exit(0);
  }

  if (args[0] === '--version' || args[0] === '-v') {
    console.log('h-wallet v1.0.0');
    process.exit(0);
  }

  const groupName = args[0];
  const subArgs = args.slice(1);

  const loader = COMMAND_GROUPS[groupName];
  if (!loader) {
    printError(`Unknown command group: "${groupName}". Run "h-wallet help" for usage.`);
    process.exit(1);
  }

  try {
    const mod = await loader();
    await mod.execute(subArgs, flags);
  } catch (err: unknown) {
    if (err instanceof Error) {
      printError(err.message, flags.json);
    } else {
      printError(String(err), flags.json);
    }
    process.exit(1);
  }
}

main();
