/**
 * Config command — init, show, set profile.
 * Part of h-v1-wallet-auth skill.
 */

import { parseCommandFlags } from '../../utils/args.js';
import { printResult, printSuccess } from '../../utils/output.js';
import { resolveConfig, readFullConfig, writeFullConfig, configFilePath } from '@h-wallet/core';

const CONFIG_PATH = configFilePath();
import type { GlobalFlags } from '../../utils/args.js';

export async function execute(args: string[], flags: GlobalFlags): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case 'init':
      await handleInit(flags);
      break;
    case 'show':
      await handleShow(flags);
      break;
    default:
      throw new Error(`Unknown config subcommand: "${subcommand}". Available: init, show`);
  }
}

async function handleInit(flags: GlobalFlags): Promise<void> {
  // In production, this would be interactive (readline)
  // For now, output guidance
  if (flags.json) {
    printResult({
      action: 'config_init',
      configPath: CONFIG_PATH,
      instructions: 'Run interactively without --json to configure credentials',
    }, true);
  } else {
    console.log('\n  ⚙️  H Wallet Configuration\n');
    console.log(`  Config file: ${CONFIG_PATH}\n`);
    console.log('  请输入以下信息：');
    console.log('  1. API Key:        (从 OKX 获取)');
    console.log('  2. Secret Key:     (从 OKX 获取)');
    console.log('  3. Passphrase:     (创建 API Key 时设置的)');
    console.log('  4. Site:           live / demo');
    console.log('  5. Profile name:   default\n');
    console.log('  完成后运行: h-wallet auth status --json 验证配置\n');
  }
}

async function handleShow(flags: GlobalFlags): Promise<void> {
  try {
    const config = readFullConfig();
    if (flags.json) {
      // Mask secrets
      const masked = { ...config };
      if (masked.profiles) {
        for (const [name, profile] of Object.entries(masked.profiles)) {
          masked.profiles[name] = {
            ...profile,
            api_key: profile.api_key ? '***' + profile.api_key.slice(-4) : '',
            secret_key: profile.secret_key ? '***masked***' : '',
            passphrase: profile.passphrase ? '***masked***' : '',
          };
        }
      }
      printResult(masked, true);
    } else {
      console.log(`\n  Config: ${CONFIG_PATH}`);
      console.log(`  Default profile: ${config.default_profile || 'default'}`);
      if (config.profiles) {
        for (const [name, profile] of Object.entries(config.profiles)) {
          console.log(`\n  [${name}]`);
          console.log(`    api_key:    ${profile.api_key ? '***' + profile.api_key.slice(-4) : '(not set)'}`);
          console.log(`    site:       ${profile.site || 'live'}`);
        }
      }
      console.log('');
    }
  } catch {
    throw new Error(`Config file not found at ${CONFIG_PATH}. Run "h-wallet config init" first.`);
  }
}
