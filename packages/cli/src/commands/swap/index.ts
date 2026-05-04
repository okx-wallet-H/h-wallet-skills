/**
 * Swap command group — perpetual contract trading execution.
 * Part of h-v1-perp-trade skill.
 *
 * Commands: place, cancel, amend, close, close-all, positions, orders, algo, get-leverage
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
    case 'place':
      await handlePlace(subArgs, flags);
      break;
    case 'cancel':
      await handleCancel(subArgs, flags);
      break;
    case 'amend':
      await handleAmend(subArgs, flags);
      break;
    case 'close':
      await handleClose(subArgs, flags);
      break;
    case 'close-all':
      await handleCloseAll(subArgs, flags);
      break;
    case 'positions':
      await handlePositions(subArgs, flags);
      break;
    case 'orders':
      await handleOrders(subArgs, flags);
      break;
    case 'pending':
      await handlePending(subArgs, flags);
      break;
    case 'history':
      await handleHistory(subArgs, flags);
      break;
    case 'algo':
      await handleAlgo(subArgs, flags);
      break;
    case 'algo-place':
      await handleAlgoPlace(subArgs, flags);
      break;
    case 'algo-cancel':
      await handleAlgoCancel(subArgs, flags);
      break;
    case 'get-leverage':
      await handleGetLeverage(subArgs, flags);
      break;
    case 'leverage':
      await handleSetLeverage(subArgs, flags);
      break;
    default:
      throw new Error(
        `Unknown swap subcommand: "${subcommand}". Available: place, cancel, amend, close, close-all, positions, orders, pending, history, algo, algo-place, algo-cancel, get-leverage, leverage`
      );
  }
}

// ─── Place Order ──────────────────────────────────────────────────────────────

async function handlePlace(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);

  const instId = requireFlag(cmdFlags, 'instId');
  const side = requireFlag(cmdFlags, 'side');       // buy or sell
  const ordType = requireFlag(cmdFlags, 'ordType'); // market, limit, post_only, fok, ioc
  const sz = requireFlag(cmdFlags, 'sz');

  // Optional params
  const tdMode = optionalFlag(cmdFlags, 'tdMode', 'cross');
  const posSide = cmdFlags['posSide'] as string | undefined;       // long, short, net
  const px = cmdFlags['px'] as string | undefined;                 // limit price
  const tgtCcy = cmdFlags['tgtCcy'] as string | undefined;         // base_ccy, quote_ccy, margin
  const reduceOnly = cmdFlags['reduceOnly'] as string | undefined;
  const clOrdId = cmdFlags['clOrdId'] as string | undefined;

  // TP/SL attached
  const tpTriggerPx = cmdFlags['tpTriggerPx'] as string | undefined;
  const tpOrdPx = cmdFlags['tpOrdPx'] as string | undefined;       // -1 for market
  const slTriggerPx = cmdFlags['slTriggerPx'] as string | undefined;
  const slOrdPx = cmdFlags['slOrdPx'] as string | undefined;       // -1 for market

  // Validate
  if (ordType === 'limit' && !px) {
    throw new Error('Limit orders require --px (price)');
  }
  if (!['buy', 'sell'].includes(side)) {
    throw new Error('--side must be "buy" or "sell"');
  }

  const body: Record<string, string> = {
    instId, side, ordType, sz, tdMode,
  };

  if (posSide) body.posSide = posSide;
  if (px) body.px = px;
  if (tgtCcy) body.tgtCcy = tgtCcy;
  if (reduceOnly) body.reduceOnly = 'true';
  if (clOrdId) body.clOrdId = clOrdId;
  if (tpTriggerPx) body.tpTriggerPx = tpTriggerPx;
  if (tpOrdPx) body.tpOrdPx = tpOrdPx;
  if (slTriggerPx) body.slTriggerPx = slTriggerPx;
  if (slOrdPx) body.slOrdPx = slOrdPx;

  const client = createClient(flags);
  const res = await client.privatePost('/api/v5/trade/order', body);

  if (flags.json) {
    printResult(res.data, true);
    return;
  }

  const order = res.data?.[0];
  if (order && order.sCode === '0') {
    printSuccess(`Order placed: ${instId} ${side.toUpperCase()} ${sz} (${ordType})`);
    console.log(`  Order ID:  ${order.ordId}`);
    if (tpTriggerPx) console.log(`  TP:        ${tpTriggerPx}`);
    if (slTriggerPx) console.log(`  SL:        ${slTriggerPx}`);
    console.log('');
  } else {
    throw new Error(`Order failed: ${order?.sMsg || 'Unknown error'} (code: ${order?.sCode})`);
  }
}

// ─── Cancel Order ─────────────────────────────────────────────────────────────

async function handleCancel(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const ordId = cmdFlags['ordId'] as string | undefined;
  const clOrdId = cmdFlags['clOrdId'] as string | undefined;

  if (!ordId && !clOrdId) {
    throw new Error('Must provide --ordId or --clOrdId');
  }

  const body: Record<string, string> = { instId };
  if (ordId) body.ordId = ordId;
  if (clOrdId) body.clOrdId = clOrdId;

  const client = createClient(flags);
  const res = await client.privatePost('/api/v5/trade/cancel-order', body);

  if (flags.json) {
    printResult(res.data, true);
  } else {
    printSuccess(`Order cancelled: ${ordId || clOrdId}`);
  }
}

// ─── Amend Order ──────────────────────────────────────────────────────────────

async function handleAmend(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const ordId = cmdFlags['ordId'] as string | undefined;
  const clOrdId = cmdFlags['clOrdId'] as string | undefined;
  const newSz = cmdFlags['newSz'] as string | undefined;
  const newPx = cmdFlags['newPx'] as string | undefined;

  if (!ordId && !clOrdId) {
    throw new Error('Must provide --ordId or --clOrdId');
  }
  if (!newSz && !newPx) {
    throw new Error('Must provide --newSz or --newPx to amend');
  }

  const body: Record<string, string> = { instId };
  if (ordId) body.ordId = ordId;
  if (clOrdId) body.clOrdId = clOrdId;
  if (newSz) body.newSz = newSz;
  if (newPx) body.newPx = newPx;

  const client = createClient(flags);
  const res = await client.privatePost('/api/v5/trade/amend-order', body);

  if (flags.json) {
    printResult(res.data, true);
  } else {
    printSuccess(`Order amended: ${ordId || clOrdId}`);
  }
}

// ─── Close Position ───────────────────────────────────────────────────────────

async function handleClose(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const mgnMode = optionalFlag(cmdFlags, 'mgnMode', 'cross');
  const posSide = cmdFlags['posSide'] as string | undefined;

  const body: Record<string, string> = { instId, mgnMode };
  if (posSide) body.posSide = posSide;

  const client = createClient(flags);
  const res = await client.privatePost('/api/v5/trade/close-position', body);

  if (flags.json) {
    printResult(res.data, true);
  } else {
    printSuccess(`Position closed: ${instId} ${posSide || 'all sides'}`);
  }
}

// ─── Close All Positions ──────────────────────────────────────────────────────

async function handleCloseAll(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const confirm = cmdFlags['confirm'] as boolean;

  if (!confirm) {
    printWarning('This will close ALL open swap positions. Add --confirm to proceed.');
    return;
  }

  const client = createClient(flags);

  // Get all positions first
  const posRes = await client.privateGet('/api/v5/account/positions', { instType: 'SWAP' });
  const positions = posRes.data || [];

  if (positions.length === 0) {
    console.log('\n  No open positions to close.\n');
    return;
  }

  // Close each position
  let closed = 0;
  for (const pos of positions) {
    try {
      const body: Record<string, string> = {
        instId: pos.instId,
        mgnMode: pos.mgnMode,
      };
      if (pos.posSide && pos.posSide !== 'net') {
        body.posSide = pos.posSide;
      }
      await client.privatePost('/api/v5/trade/close-position', body);
      closed++;
    } catch (err) {
      printWarning(`Failed to close ${pos.instId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  printSuccess(`Closed ${closed}/${positions.length} positions`);
}

// ─── Positions ────────────────────────────────────────────────────────────────

async function handlePositions(args: string[], flags: GlobalFlags): Promise<void> {
  const { positional, flags: cmdFlags } = parseCommandFlags(args);
  const instId = positional[0] || (cmdFlags['instId'] as string);

  const client = createClient(flags);
  const params: Record<string, string> = { instType: 'SWAP' };
  if (instId) params.instId = instId;

  const res = await client.privateGet('/api/v5/account/positions', params);
  const positions = res.data || [];

  if (flags.json) {
    printResult(positions, true);
    return;
  }

  if (positions.length === 0) {
    console.log('\n  No open swap positions.\n');
    return;
  }

  console.log('\n  📈 Swap Positions\n');
  printTable(
    positions.map((p: any) => ({
      instId: p.instId,
      side: p.posSide,
      size: p.pos,
      avgPx: Number(p.avgPx).toFixed(2),
      markPx: Number(p.markPx).toFixed(2),
      upl: Number(p.upl).toFixed(2),
      uplRatio: (Number(p.uplRatio) * 100).toFixed(2) + '%',
      lever: p.lever + 'x',
      liqPx: p.liqPx ? Number(p.liqPx).toFixed(2) : '-',
    })),
    [
      { key: 'instId', label: 'Instrument' },
      { key: 'side', label: 'Side' },
      { key: 'size', label: 'Size', align: 'right' },
      { key: 'avgPx', label: 'Entry', align: 'right' },
      { key: 'markPx', label: 'Mark', align: 'right' },
      { key: 'upl', label: 'PnL', align: 'right' },
      { key: 'uplRatio', label: 'PnL%', align: 'right' },
      { key: 'lever', label: 'Lever', align: 'right' },
      { key: 'liqPx', label: 'Liq', align: 'right' },
    ]
  );
  console.log('');
}

// ─── Open Orders ──────────────────────────────────────────────────────────────

async function handleOrders(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = cmdFlags['instId'] as string | undefined;

  const client = createClient(flags);
  const params: Record<string, string> = { instType: 'SWAP' };
  if (instId) params.instId = instId;

  const res = await client.privateGet('/api/v5/trade/orders-pending', params);
  printResult(res.data, flags.json);
}

// ─── Pending Orders ───────────────────────────────────────────────────────────

async function handlePending(args: string[], flags: GlobalFlags): Promise<void> {
  // Alias for orders
  await handleOrders(args, flags);
}

// ─── Order History ────────────────────────────────────────────────────────────

async function handleHistory(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instType = (cmdFlags['instType'] as string) || 'SWAP';
  const limit = (cmdFlags['limit'] as string) || '20';

  const client = createClient(flags);
  const res = await client.privateGet('/api/v5/trade/orders-history-archive', { instType, limit });
  printResult(res.data, flags.json);
}

// ─── Algo Orders (TP/SL/Trailing) ────────────────────────────────────────────

async function handleAlgo(args: string[], flags: GlobalFlags): Promise<void> {
  const { positional, flags: cmdFlags } = parseCommandFlags(args);
  const action = positional[0] || 'list';
  const instId = cmdFlags['instId'] as string | undefined;

  const client = createClient(flags);

  if (action === 'list' || action === 'orders') {
    const params: Record<string, string> = { ordType: 'conditional', instType: 'SWAP' };
    if (instId) params.instId = instId;
    const res = await client.privateGet('/api/v5/trade/orders-algo-pending', params);
    printResult(res.data, flags.json);
  } else {
    throw new Error(`Unknown algo action: "${action}". Use "algo list" or "algo-place" / "algo-cancel"`);
  }
}

// ─── Algo Place (TP/SL/Trailing Stop) ────────────────────────────────────────

async function handleAlgoPlace(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);

  const instId = requireFlag(cmdFlags, 'instId');
  const tdMode = optionalFlag(cmdFlags, 'tdMode', 'cross');
  const side = requireFlag(cmdFlags, 'side');
  const sz = requireFlag(cmdFlags, 'sz');
  const ordType = optionalFlag(cmdFlags, 'ordType', 'conditional'); // conditional, oco, trigger, move_order_stop

  const body: Record<string, string> = { instId, tdMode, side, sz, ordType };

  // TP/SL params
  const tpTriggerPx = cmdFlags['tpTriggerPx'] as string | undefined;
  const tpOrdPx = cmdFlags['tpOrdPx'] as string | undefined;
  const slTriggerPx = cmdFlags['slTriggerPx'] as string | undefined;
  const slOrdPx = cmdFlags['slOrdPx'] as string | undefined;
  const posSide = cmdFlags['posSide'] as string | undefined;

  // Trailing stop params
  const callbackRatio = cmdFlags['callbackRatio'] as string | undefined;
  const callbackSpread = cmdFlags['callbackSpread'] as string | undefined;
  const activePx = cmdFlags['activePx'] as string | undefined;

  if (tpTriggerPx) body.tpTriggerPx = tpTriggerPx;
  if (tpOrdPx) body.tpOrdPx = tpOrdPx;
  if (slTriggerPx) body.slTriggerPx = slTriggerPx;
  if (slOrdPx) body.slOrdPx = slOrdPx;
  if (posSide) body.posSide = posSide;
  if (callbackRatio) body.callbackRatio = callbackRatio;
  if (callbackSpread) body.callbackSpread = callbackSpread;
  if (activePx) body.activePx = activePx;

  // For trailing stop
  if (ordType === 'move_order_stop') {
    if (!callbackRatio && !callbackSpread) {
      throw new Error('Trailing stop requires --callbackRatio or --callbackSpread');
    }
  }

  const client = createClient(flags);
  const res = await client.privatePost('/api/v5/trade/order-algo', body);

  if (flags.json) {
    printResult(res.data, true);
  } else {
    const result = res.data?.[0];
    if (result && result.sCode === '0') {
      printSuccess(`Algo order placed: ${ordType} for ${instId}`);
      console.log(`  Algo ID: ${result.algoId}`);
    } else {
      throw new Error(`Algo order failed: ${result?.sMsg || 'Unknown error'}`);
    }
  }
}

// ─── Algo Cancel ──────────────────────────────────────────────────────────────

async function handleAlgoCancel(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const algoId = requireFlag(cmdFlags, 'algoId');

  const client = createClient(flags);
  const res = await client.privatePost('/api/v5/trade/cancel-algos', {
    instId,
    algoId,
  });

  if (flags.json) {
    printResult(res.data, true);
  } else {
    printSuccess(`Algo order cancelled: ${algoId}`);
  }
}

// ─── Get Leverage ─────────────────────────────────────────────────────────────

async function handleGetLeverage(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const mgnMode = optionalFlag(cmdFlags, 'mgnMode', 'cross');

  const client = createClient(flags);
  const res = await client.privateGet('/api/v5/account/leverage-info', { instId, mgnMode });

  if (flags.json) {
    printResult(res.data, true);
    return;
  }

  const data = res.data?.[0];
  if (data) {
    console.log(`\n  ⚙️ Leverage — ${instId} (${mgnMode})\n`);
    console.log(`  Leverage:  ${data.lever}x`);
    console.log(`  Pos Side:  ${data.posSide || 'both'}`);
    console.log('');
  }
}

// ─── Set Leverage ─────────────────────────────────────────────────────────────

async function handleSetLeverage(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const lever = requireFlag(cmdFlags, 'lever');
  const mgnMode = optionalFlag(cmdFlags, 'mgnMode', 'cross');
  const posSide = cmdFlags['posSide'] as string | undefined;

  const body: Record<string, string> = { instId, lever, mgnMode };
  if (posSide) body.posSide = posSide;

  const client = createClient(flags);
  const res = await client.privatePost('/api/v5/account/set-leverage', body);

  if (flags.json) {
    printResult(res.data, true);
  } else {
    printSuccess(`Leverage set to ${lever}x for ${instId} (${mgnMode})`);
  }
}
