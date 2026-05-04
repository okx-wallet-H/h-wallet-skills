/**
 * DCA command group — perpetual contract Martingale DCA bot management.
 * Part of h-v1-perp-dca skill.
 *
 * OKX API Base: /api/v5/tradingBot/dca
 * Commands: create, stop, status, list, cycles, profit
 */

import { parseCommandFlags, requireFlag, optionalFlag } from '../../utils/args.js';
import { printResult, printTable, printSuccess, printWarning } from '../../utils/output.js';
import { RestClient, resolveConfig } from '@h-wallet/core';
import type { GlobalFlags } from '../../utils/args.js';

const BASE = '/api/v5/tradingBot/dca';

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
    case 'cycles':
      await handleCycles(subArgs, flags);
      break;
    case 'profit':
      await handleProfit(subArgs, flags);
      break;
    default:
      throw new Error(
        `Unknown dca subcommand: "${subcommand}". Available: create, stop, status, list, cycles, profit`
      );
  }
}

// ─── Create DCA Bot ───────────────────────────────────────────────────────────

async function handleCreate(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);

  const instId = requireFlag(cmdFlags, 'instId');
  const direction = optionalFlag(cmdFlags, 'direction', 'long');
  const lever = optionalFlag(cmdFlags, 'lever', '3');

  // Entry params
  const initOrdAmt = requireFlag(cmdFlags, 'initOrdAmt');          // initial order amount in USDT
  const maxSafetyOrds = optionalFlag(cmdFlags, 'maxSafetyOrds', '3');
  const safetyOrdAmt = cmdFlags['safetyOrdAmt'] as string | undefined;
  const pxSteps = optionalFlag(cmdFlags, 'pxSteps', '0.03');       // 3% price drop per safety order
  const pxStepsMult = optionalFlag(cmdFlags, 'pxStepsMult', '1');
  const volMult = optionalFlag(cmdFlags, 'volMult', '1');

  // Take profit / Stop loss
  const tpPct = optionalFlag(cmdFlags, 'tpPct', '0.05');           // 5% TP per cycle
  const slPct = cmdFlags['slPct'] as string | undefined;

  // Trigger
  const triggerStrategy = optionalFlag(cmdFlags, 'triggerStrategy', 'instant');
  const triggerPx = cmdFlags['triggerPx'] as string | undefined;

  // Validate safety order params
  if (Number(maxSafetyOrds) > 0 && !safetyOrdAmt) {
    throw new Error('--safetyOrdAmt is required when maxSafetyOrds > 0');
  }

  const triggerParams = [{ triggerAction: 'start', triggerStrategy } as Record<string, string>];
  if (triggerStrategy === 'price' && triggerPx) {
    triggerParams[0].triggerPx = triggerPx;
  }

  const body: Record<string, any> = {
    instId,
    algoOrdType: 'contract_dca',
    lever,
    direction,
    initOrdAmt,
    maxSafetyOrds,
    safetyOrdAmt: safetyOrdAmt || initOrdAmt,
    pxSteps,
    pxStepsMult,
    volMult,
    tpPct,
    allowReinvest: true,
    triggerParams,
  };

  if (slPct) body.slPct = slPct;

  const client = createClient(flags);
  const res = await client.privatePost(`${BASE}/create`, body);

  if (flags.json) {
    printResult(res.data, true);
    return;
  }

  const result = res.data?.[0];
  if (result && result.sCode === '0') {
    printSuccess(`DCA Martingale bot created: ${instId}`);
    console.log(`  Bot ID:          ${result.algoId}`);
    console.log(`  Direction:       ${direction}`);
    console.log(`  Leverage:        ${lever}x`);
    console.log(`  Init Amount:     ${initOrdAmt} USDT`);
    console.log(`  Safety Orders:   ${maxSafetyOrds}`);
    console.log(`  Price Step:      ${(Number(pxSteps) * 100).toFixed(1)}%`);
    console.log(`  TP Ratio:        ${(Number(tpPct) * 100).toFixed(1)}%`);
    console.log(`  Auto Reinvest:   Yes`);
    console.log('');
  } else {
    throw new Error(`DCA creation failed: ${result?.sMsg || 'Unknown error'} (code: ${result?.sCode})`);
  }
}

// ─── Stop DCA Bot ─────────────────────────────────────────────────────────────

async function handleStop(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const algoId = requireFlag(cmdFlags, 'algoId');

  const client = createClient(flags);
  const res = await client.privatePost(`${BASE}/stop`, {
    algoId,
    algoOrdType: 'contract_dca',
  });

  if (flags.json) {
    printResult(res.data, true);
  } else {
    printSuccess(`DCA bot stopped: ${algoId}`);
  }
}

// ─── DCA Status (Position Details) ───────────────────────────────────────────

async function handleStatus(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const algoId = requireFlag(cmdFlags, 'algoId');

  const client = createClient(flags);
  const res = await client.privateGet(`${BASE}/position-details`, {
    algoId,
    algoOrdType: 'contract_dca',
  });

  const data = res.data?.[0];

  if (flags.json) {
    printResult(data, true);
    return;
  }

  if (data) {
    console.log(`\n  🔄 DCA Bot Status — ${data.instId || 'N/A'}\n`);
    console.log(`  Bot ID:          ${algoId}`);
    console.log(`  State:           ${data.state || 'running'}`);
    console.log(`  Direction:       ${data.direction || '-'}`);
    console.log(`  Leverage:        ${data.lever || '-'}x`);
    console.log(`  Avg Entry Price: ${data.avgPx ? Number(data.avgPx).toFixed(2) : '-'}`);
    console.log(`  Position Size:   ${data.pos || '-'}`);
    console.log(`  Unrealized PnL:  ${data.upl ? Number(data.upl).toFixed(2) : '-'} USDT`);
    console.log(`  Liq Price:       ${data.liqPx ? Number(data.liqPx).toFixed(2) : '-'}`);
    console.log(`  Margin Used:     ${data.margin ? Number(data.margin).toFixed(2) : '-'} USDT`);
    console.log('');
  } else {
    console.log(`\n  No position data for bot ${algoId}\n`);
  }
}

// ─── List DCA Bots ────────────────────────────────────────────────────────────

async function handleList(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const status = optionalFlag(cmdFlags, 'status', 'active');

  const client = createClient(flags);

  const path = status === 'history'
    ? `${BASE}/history-list`
    : `${BASE}/ongoing-list`;

  const res = await client.privateGet(path, {
    algoOrdType: 'contract_dca',
  });

  const bots = res.data || [];

  if (flags.json) {
    printResult(bots, true);
    return;
  }

  if (bots.length === 0) {
    console.log(`\n  No ${status} DCA bots.\n`);
    return;
  }

  console.log(`\n  🔄 DCA Bots (${status})\n`);
  printTable(
    bots.map((b: any) => ({
      algoId: b.algoId?.slice(-8),
      instId: b.instId,
      direction: b.direction,
      lever: (b.lever || '-') + 'x',
      state: b.state || '-',
      pnl: Number(b.totalPnl || 0).toFixed(2),
    })),
    [
      { key: 'algoId', label: 'Bot ID' },
      { key: 'instId', label: 'Instrument' },
      { key: 'direction', label: 'Dir' },
      { key: 'lever', label: 'Lever' },
      { key: 'state', label: 'State' },
      { key: 'pnl', label: 'PnL', align: 'right' },
    ]
  );
  console.log('');
}

// ─── DCA Cycles ───────────────────────────────────────────────────────────────

async function handleCycles(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const algoId = requireFlag(cmdFlags, 'algoId');
  const cycleId = cmdFlags['cycleId'] as string | undefined;

  const client = createClient(flags);

  if (cycleId) {
    // Get orders within a specific cycle
    const res = await client.privateGet(`${BASE}/orders`, {
      algoId,
      algoOrdType: 'contract_dca',
      cycleId,
    });

    if (flags.json) {
      printResult(res.data, true);
      return;
    }

    const orders = res.data || [];
    console.log(`\n  📋 DCA Cycle Orders — ${algoId} / Cycle ${cycleId}\n`);
    if (orders.length === 0) {
      console.log('  No orders in this cycle.');
    } else {
      printTable(
        orders.map((o: any) => ({
          ordId: o.ordId?.slice(-8) || '-',
          side: o.side,
          sz: o.sz,
          fillPx: o.fillPx ? Number(o.fillPx).toFixed(2) : '-',
          state: o.state,
        })),
        [
          { key: 'ordId', label: 'Order' },
          { key: 'side', label: 'Side' },
          { key: 'sz', label: 'Size', align: 'right' },
          { key: 'fillPx', label: 'Fill Px', align: 'right' },
          { key: 'state', label: 'State' },
        ]
      );
    }
  } else {
    // Get cycle list
    const res = await client.privateGet(`${BASE}/cycle-list`, {
      algoId,
      algoOrdType: 'contract_dca',
    });

    if (flags.json) {
      printResult(res.data, true);
      return;
    }

    const cycles = res.data || [];
    console.log(`\n  🔄 DCA Cycles — ${algoId}\n`);
    if (cycles.length === 0) {
      console.log('  No cycles yet.');
    } else {
      printTable(
        cycles.map((c: any) => ({
          cycleId: c.cycleId || '-',
          pnl: Number(c.pnl || 0).toFixed(2),
          state: c.state || '-',
          startTime: c.cTime ? new Date(Number(c.cTime)).toISOString().slice(0, 16) : '-',
        })),
        [
          { key: 'cycleId', label: 'Cycle' },
          { key: 'pnl', label: 'PnL', align: 'right' },
          { key: 'state', label: 'State' },
          { key: 'startTime', label: 'Start' },
        ]
      );
    }
  }
  console.log('');
}

// ─── DCA Profit ───────────────────────────────────────────────────────────────

async function handleProfit(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const algoId = requireFlag(cmdFlags, 'algoId');

  const client = createClient(flags);
  const res = await client.privateGet(`${BASE}/position-details`, {
    algoId,
    algoOrdType: 'contract_dca',
  });

  const data = res.data?.[0];

  if (flags.json) {
    printResult({
      algoId,
      totalPnl: data?.totalPnl,
      realizedPnl: data?.realizedPnl,
      unrealizedPnl: data?.upl,
      avgPx: data?.avgPx,
      liqPx: data?.liqPx,
    }, true);
    return;
  }

  if (data) {
    console.log(`\n  💰 DCA Profit Summary — ${data.instId || 'N/A'}\n`);
    console.log(`  Total PnL:       ${Number(data.totalPnl || 0).toFixed(2)} USDT`);
    console.log(`  Realized PnL:    ${Number(data.realizedPnl || 0).toFixed(2)} USDT`);
    console.log(`  Unrealized PnL:  ${Number(data.upl || 0).toFixed(2)} USDT`);
    console.log(`  Avg Entry:       ${data.avgPx ? Number(data.avgPx).toFixed(2) : '-'}`);
    console.log(`  Liq Price:       ${data.liqPx ? Number(data.liqPx).toFixed(2) : '-'}`);
    console.log('');
  } else {
    console.log(`\n  No profit data for bot ${algoId}\n`);
  }
}
