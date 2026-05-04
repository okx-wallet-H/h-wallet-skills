/**
 * Grid command group — perpetual contract grid bot management.
 * Part of h-v1-perp-grid skill.
 *
 * Commands: create, stop, status, list, ai-params, orders, profit
 */

import { parseCommandFlags, requireFlag, optionalFlag } from '../../utils/args.js';
import { printResult, printTable, printSuccess, printWarning } from '../../utils/output.js';
import { RestClient, resolveConfig } from '@h-wallet/core';
import type { GlobalFlags } from '../../utils/args.js';

function createClient(globalFlags: GlobalFlags): RestClient {
  const config = resolveConfig(globalFlags.profile);
  return new RestClient(config);
}

export async function execute(args: string[], flags: GlobalFlags): Promise<void> {
  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case 'create':
      await handleCreate(subArgs, flags);
      break;
    case 'stop':
      await handleStop(subArgs, flags);
      break;
    case 'status':
      await handleStatus(subArgs, flags);
      break;
    case 'list':
      await handleList(subArgs, flags);
      break;
    case 'ai-params':
      await handleAiParams(subArgs, flags);
      break;
    case 'orders':
      await handleOrders(subArgs, flags);
      break;
    case 'profit':
      await handleProfit(subArgs, flags);
      break;
    default:
      throw new Error(
        `Unknown grid subcommand: "${subcommand}". Available: create, stop, status, list, ai-params, orders, profit`
      );
  }
}

// ─── Create Grid Bot ──────────────────────────────────────────────────────────

async function handleCreate(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);

  const instId = requireFlag(cmdFlags, 'instId');
  const gridNum = requireFlag(cmdFlags, 'gridNum');
  const maxPx = requireFlag(cmdFlags, 'maxPx');
  const minPx = requireFlag(cmdFlags, 'minPx');

  // Optional params with H Wallet defaults (optimized for neutral grid)
  const lever = optionalFlag(cmdFlags, 'lever', '3');
  const sz = cmdFlags['sz'] as string | undefined;                     // total investment
  const direction = optionalFlag(cmdFlags, 'direction', 'neutral');     // long, short, neutral
  const runType = optionalFlag(cmdFlags, 'runType', '1');               // 1=arithmetic, 2=geometric
  const tpRatio = optionalFlag(cmdFlags, 'tpRatio', '0.3');            // 30% take profit (H Wallet default)
  const slRatio = cmdFlags['slRatio'] as string | undefined;
  const basePos = cmdFlags['basePos'] as string | undefined;            // open base position
  const triggerParams = cmdFlags['triggerParams'] as string | undefined;

  const body: Record<string, string> = {
    instId,
    algoOrdType: 'contract_grid',
    maxPx,
    minPx,
    gridNum,
    lever,
    direction,
    runType,
  };

  if (sz) body.sz = sz;
  if (tpRatio !== '0') body.tpRatio = tpRatio;
  if (slRatio) body.slRatio = slRatio;
  if (basePos) body.basePos = basePos ? 'true' : 'false';

  const client = createClient(flags);
  const res = await client.privatePost('/api/v5/tradingBot/grid/order-algo', body);

  if (flags.json) {
    printResult(res.data, true);
    return;
  }

  const result = res.data?.[0];
  if (result && result.sCode === '0') {
    printSuccess(`Grid bot created: ${instId}`);
    console.log(`  Bot ID:      ${result.algoId}`);
    console.log(`  Grid Range:  ${minPx} — ${maxPx}`);
    console.log(`  Grid Count:  ${gridNum}`);
    console.log(`  Leverage:    ${lever}x`);
    console.log(`  Direction:   ${direction}`);
    console.log(`  TP Ratio:    ${(Number(tpRatio) * 100).toFixed(0)}%`);
    console.log('');
  } else {
    throw new Error(`Grid creation failed: ${result?.sMsg || 'Unknown error'} (code: ${result?.sCode})`);
  }
}

// ─── Stop Grid Bot ────────────────────────────────────────────────────────────

async function handleStop(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const botId = requireFlag(cmdFlags, 'botId');

  const client = createClient(flags);
  const res = await client.privatePost('/api/v5/tradingBot/grid/stop-order-algo', {
    algoId: botId,
    instType: 'SWAP',
    algoOrdType: 'contract_grid',
  });

  if (flags.json) {
    printResult(res.data, true);
  } else {
    printSuccess(`Grid bot stopped: ${botId}`);
  }
}

// ─── Grid Status ──────────────────────────────────────────────────────────────

async function handleStatus(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const botId = requireFlag(cmdFlags, 'botId');

  const client = createClient(flags);
  const res = await client.privateGet('/api/v5/tradingBot/grid/orders-algo-details', {
    algoOrdType: 'contract_grid',
    algoId: botId,
  });

  const data = res.data?.[0];

  if (flags.json) {
    printResult(data, true);
    return;
  }

  if (data) {
    console.log(`\n  🤖 Grid Bot Status — ${data.instId}\n`);
    console.log(`  Bot ID:        ${data.algoId}`);
    console.log(`  State:         ${data.state}`);
    console.log(`  Direction:     ${data.direction}`);
    console.log(`  Grid Range:    ${data.minPx} — ${data.maxPx}`);
    console.log(`  Grid Count:    ${data.gridNum}`);
    console.log(`  Leverage:      ${data.lever}x`);
    console.log(`  Total PnL:     ${Number(data.totalPnl).toFixed(2)} USDT`);
    console.log(`  Grid Profit:   ${Number(data.gridProfit).toFixed(2)} USDT`);
    console.log(`  Float PnL:     ${Number(data.floatProfit).toFixed(2)} USDT`);
    console.log(`  Annualized:    ${(Number(data.annualizedRate) * 100).toFixed(2)}%`);
    console.log(`  Run Days:      ${data.runDays || '-'}`);
    console.log(`  Filled Count:  ${data.filledCount || '-'}`);
    console.log('');
  }
}

// ─── List Grid Bots ───────────────────────────────────────────────────────────

async function handleList(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const state = optionalFlag(cmdFlags, 'state', 'running'); // running, stopped

  const client = createClient(flags);

  let res;
  if (state === 'running') {
    res = await client.privateGet('/api/v5/tradingBot/grid/orders-algo-pending', {
      algoOrdType: 'contract_grid',
    });
  } else {
    res = await client.privateGet('/api/v5/tradingBot/grid/orders-algo-history', {
      algoOrdType: 'contract_grid',
    });
  }

  const bots = res.data || [];

  if (flags.json) {
    printResult(bots, true);
    return;
  }

  if (bots.length === 0) {
    console.log(`\n  No ${state} grid bots.\n`);
    return;
  }

  console.log(`\n  🤖 Grid Bots (${state})\n`);
  printTable(
    bots.map((b: any) => ({
      botId: b.algoId?.slice(-8),
      instId: b.instId,
      direction: b.direction,
      pnl: Number(b.totalPnl).toFixed(2),
      range: `${b.minPx}—${b.maxPx}`,
      grids: b.gridNum,
    })),
    [
      { key: 'botId', label: 'Bot ID' },
      { key: 'instId', label: 'Instrument' },
      { key: 'direction', label: 'Dir' },
      { key: 'pnl', label: 'PnL', align: 'right' },
      { key: 'range', label: 'Range' },
      { key: 'grids', label: 'Grids', align: 'right' },
    ]
  );
  console.log('');
}

// ─── AI Params ────────────────────────────────────────────────────────────────

async function handleAiParams(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const direction = optionalFlag(cmdFlags, 'direction', 'neutral');

  const client = createClient(flags);
  const res = await client.publicGet('/api/v5/tradingBot/grid/ai-param', {
    algoOrdType: 'contract_grid',
    instId,
    direction,
  });

  const data = res.data?.[0];

  if (flags.json) {
    printResult(data, true);
    return;
  }

  if (data) {
    console.log(`\n  🧠 AI Recommended Grid Params — ${instId}\n`);
    console.log(`  Direction:     ${direction}`);
    console.log(`  Max Price:     ${data.maxPx}`);
    console.log(`  Min Price:     ${data.minPx}`);
    console.log(`  Grid Count:    ${data.gridNum}`);
    console.log(`  Leverage:      ${data.lever || '3'}x`);
    console.log(`  Min Investment:${data.minInvestment || '-'} USDT`);
    console.log(`  Run Type:      ${data.runType === '1' ? 'Arithmetic' : 'Geometric'}`);
    console.log('');
    console.log('  💡 H Wallet 建议：使用以上参数 + 30% 止盈，一键创建：');
    console.log(`     h-wallet grid create --instId ${instId} --gridNum ${data.gridNum} --maxPx ${data.maxPx} --minPx ${data.minPx} --lever ${data.lever || '3'} --direction ${direction} --tpRatio 0.3`);
    console.log('');
  }
}

// ─── Grid Sub-Orders ──────────────────────────────────────────────────────────

async function handleOrders(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const botId = requireFlag(cmdFlags, 'botId');
  const type = optionalFlag(cmdFlags, 'type', 'filled'); // filled, pending

  const client = createClient(flags);
  const endpoint = type === 'filled'
    ? '/api/v5/tradingBot/grid/sub-orders'
    : '/api/v5/tradingBot/grid/orders-algo-pending';

  const res = await client.privateGet(endpoint, {
    algoId: botId,
    algoOrdType: 'contract_grid',
  });

  printResult(res.data, flags.json);
}

// ─── Grid Profit ──────────────────────────────────────────────────────────────

async function handleProfit(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const botId = requireFlag(cmdFlags, 'botId');

  const client = createClient(flags);
  const res = await client.privateGet('/api/v5/tradingBot/grid/orders-algo-details', {
    algoOrdType: 'contract_grid',
    algoId: botId,
  });

  const data = res.data?.[0];

  if (flags.json) {
    printResult({
      totalPnl: data?.totalPnl,
      gridProfit: data?.gridProfit,
      floatProfit: data?.floatProfit,
      annualizedRate: data?.annualizedRate,
      runDays: data?.runDays,
    }, true);
    return;
  }

  if (data) {
    console.log(`\n  💰 Grid Profit Summary — ${data.instId}\n`);
    console.log(`  Total PnL:      ${Number(data.totalPnl).toFixed(2)} USDT`);
    console.log(`  Grid Profit:    ${Number(data.gridProfit).toFixed(2)} USDT`);
    console.log(`  Float PnL:      ${Number(data.floatProfit).toFixed(2)} USDT`);
    console.log(`  Annualized:     ${(Number(data.annualizedRate) * 100).toFixed(2)}%`);
    console.log(`  Run Days:       ${data.runDays}`);
    console.log('');
  }
}
