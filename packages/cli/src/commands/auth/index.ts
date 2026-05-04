/**
 * Auth command group — login, status, config management.
 * Part of h-v1-wallet-auth skill.
 */

import { parseCommandFlags } from '../../utils/args.js';
import { printResult, printSuccess, printError } from '../../utils/output.js';
import { resolveConfig } from '@h-wallet/core';
import type { GlobalFlags } from '../../utils/args.js';

export async function execute(args: string[], flags: GlobalFlags): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case 'login':
      await handleLogin(args.slice(1), flags);
      break;
    case 'status':
      await handleStatus(flags);
      break;
    default:
      throw new Error(`Unknown auth subcommand: "${subcommand}". Available: login, status`);
  }
}

async function handleLogin(_args: string[], flags: GlobalFlags): Promise<void> {
  // OAuth login flow — in production, opens browser for OKX OAuth
  const config = resolveConfig(flags.profile);
  const loginUrl = `${config.baseUrl}/oauth/authorize?client_id=h-wallet&redirect_uri=http://localhost:9876/callback`;

  if (flags.json) {
    printResult({ status: 'pending', loginUrl, message: 'Open URL in browser to complete login' }, true);
  } else {
    console.log('\n  🔐 H Wallet OAuth Login\n');
    console.log(`  Please open the following URL in your browser:\n`);
    console.log(`  ${loginUrl}\n`);
    console.log('  Waiting for authentication...\n');
  }
}

async function handleStatus(flags: GlobalFlags): Promise<void> {
  try {
    const config = resolveConfig(flags.profile);
    const result = {
      status: config.apiKey ? 'logged_in' : 'not_logged_in',
      method: config.apiKey ? 'api_key' : 'none',
      profile: flags.profile,
      site: flags.demo ? 'demo' : 'live',
      uid: config.apiKey ? '***configured***' : null,
    };
    printResult(result, flags.json);
  } catch {
    printResult({
      status: 'not_logged_in',
      method: 'none',
      profile: flags.profile,
      site: flags.demo ? 'demo' : 'live',
      uid: null,
    }, flags.json);
  }
}
