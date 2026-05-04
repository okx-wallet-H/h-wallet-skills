/**
 * Market command group — tickers, candles, funding rates, open interest, long-short ratio.
 * Part of h-v1-perp-market skill.
 */

import { parseCommandFlags, optionalFlag, requireFlag } from '../../utils/args.js';
import { printResult, printTable } from '../../utils/output.js';
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
    case 'ticker':
      await handleTicker(subArgs, flags);
      break;
    case 'tickers':
      await handleTickers(subArgs, flags);
      break;
    case 'candles':
      await handleCandles(subArgs, flags);
      break;
    case 'depth':
      await handleDepth(subArgs, flags);
      break;
    case 'funding-rate':
      await handleFundingRate(subArgs, flags);
      break;
    case 'funding-history':
      await handleFundingHistory(subArgs, flags);
      break;
    case 'open-interest':
      await handleOpenInterest(subArgs, flags);
      break;
    case 'long-short-ratio':
      await handleLongShortRatio(subArgs, flags);
      break;
    case 'instruments':
      await handleInstruments(subArgs, flags);
      break;
    case 'mark-price':
      await handleMarkPrice(subArgs, flags);
      break;
    case 'indicators':
      await handleIndicators(subArgs, flags);
      break;
    default:
      throw new Error(
        `Unknown market subcommand: "${subcommand}". Available: ticker, tickers, candles, depth, funding-rate, funding-history, open-interest, long-short-ratio, instruments, mark-price, indicators`
      );
  }
}

// ─── Ticker ───────────────────────────────────────────────────────────────────

async function handleTicker(args: string[], flags: GlobalFlags): Promise<void> {
  const { positional, flags: cmdFlags } = parseCommandFlags(args);
  const instId = positional[0] || requireFlag(cmdFlags, 'instId');

  const client = createClient(flags);
  const res = await client.publicGet('/api/v5/market/ticker', { instId });
  const data = res.data?.[0];

  if (flags.json) {
    printResult(data, true);
    return;
  }

  if (data) {
    console.log(`\n  📊 ${instId}\n`);
    console.log(`  Last Price:     ${Number(data.last).toLocaleString()}`);
    console.log(`  24h High:       ${Number(data.high24h).toLocaleString()}`);
    console.log(`  24h Low:        ${Number(data.low24h).toLocaleString()}`);
    console.log(`  24h Volume:     ${Number(data.vol24h).toLocaleString()} contracts`);
    console.log(`  24h VolCcy:     ${Number(data.volCcy24h).toLocaleString()} USDT`);
    console.log(`  24h Change:     ${(Number(data.last) - Number(data.open24h) > 0 ? '+' : '')}${((Number(data.last) / Number(data.open24h) - 1) * 100).toFixed(2)}%`);
    console.log(`  Bid:            ${data.bidPx} (${data.bidSz})`);
    console.log(`  Ask:            ${data.askPx} (${data.askSz})`);
    console.log('');
  }
}

// ─── Tickers (all SWAP) ───────────────────────────────────────────────────────

async function handleTickers(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instType = (cmdFlags['instType'] as string) || 'SWAP';

  const client = createClient(flags);
  const res = await client.publicGet('/api/v5/market/tickers', { instType });
  const data = res.data || [];

  if (flags.json) {
    printResult(data, true);
    return;
  }

  // Sort by 24h volume descending, show top 20
  const sorted = data
    .filter((t: any) => t.instId.endsWith('-USDT-SWAP'))
    .sort((a: any, b: any) => Number(b.volCcy24h) - Number(a.volCcy24h))
    .slice(0, 20);

  console.log('\n  📊 Top 20 Perpetual Swaps by Volume\n');
  printTable(
    sorted.map((t: any) => ({
      instId: t.instId.replace('-USDT-SWAP', ''),
      last: Number(t.last).toFixed(2),
      change: ((Number(t.last) / Number(t.open24h) - 1) * 100).toFixed(2) + '%',
      vol: (Number(t.volCcy24h) / 1e6).toFixed(1) + 'M',
    })),
    [
      { key: 'instId', label: 'Symbol' },
      { key: 'last', label: 'Price', align: 'right' },
      { key: 'change', label: '24h%', align: 'right' },
      { key: 'vol', label: 'Volume(USDT)', align: 'right' },
    ]
  );
  console.log('');
}

// ─── Candles ──────────────────────────────────────────────────────────────────

async function handleCandles(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const bar = (cmdFlags['bar'] as string) || '4H';
  const limit = (cmdFlags['limit'] as string) || '100';

  const client = createClient(flags);
  const res = await client.publicGet('/api/v5/market/candles', { instId, bar, limit });

  if (flags.json) {
    printResult(res.data, true);
    return;
  }

  const candles = res.data || [];
  console.log(`\n  🕯️ ${instId} — ${bar} Candles (latest ${candles.length})\n`);

  // Show last 10 candles in table
  const recent = candles.slice(0, 10).map((c: any) => ({
    time: new Date(Number(c[0])).toISOString().slice(0, 16),
    open: Number(c[1]).toFixed(2),
    high: Number(c[2]).toFixed(2),
    low: Number(c[3]).toFixed(2),
    close: Number(c[4]).toFixed(2),
    vol: (Number(c[5]) / 1e3).toFixed(1) + 'K',
  }));

  printTable(recent, [
    { key: 'time', label: 'Time' },
    { key: 'open', label: 'Open', align: 'right' },
    { key: 'high', label: 'High', align: 'right' },
    { key: 'low', label: 'Low', align: 'right' },
    { key: 'close', label: 'Close', align: 'right' },
    { key: 'vol', label: 'Vol', align: 'right' },
  ]);
  console.log('');
}

// ─── Depth ────────────────────────────────────────────────────────────────────

async function handleDepth(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const sz = (cmdFlags['sz'] as string) || '20';

  const client = createClient(flags);
  const res = await client.publicGet('/api/v5/market/books', { instId, sz });

  printResult(res.data?.[0], flags.json);
}

// ─── Funding Rate ─────────────────────────────────────────────────────────────

async function handleFundingRate(args: string[], flags: GlobalFlags): Promise<void> {
  const { positional, flags: cmdFlags } = parseCommandFlags(args);
  const instId = positional[0] || requireFlag(cmdFlags, 'instId');

  const client = createClient(flags);
  const res = await client.publicGet('/api/v5/public/funding-rate', { instId });
  const data = res.data?.[0];

  if (flags.json) {
    printResult(data, true);
    return;
  }

  if (data) {
    const rate = (Number(data.fundingRate) * 100).toFixed(4);
    const nextRate = data.nextFundingRate ? (Number(data.nextFundingRate) * 100).toFixed(4) : 'N/A';
    const nextTime = new Date(Number(data.nextFundingTime)).toISOString().slice(0, 16);

    console.log(`\n  💰 Funding Rate — ${instId}\n`);
    console.log(`  Current Rate:    ${rate}%`);
    console.log(`  Next Rate:       ${nextRate}%`);
    console.log(`  Next Settlement: ${nextTime}`);
    console.log('');
  }
}

// ─── Funding History ──────────────────────────────────────────────────────────

async function handleFundingHistory(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const limit = (cmdFlags['limit'] as string) || '30';

  const client = createClient(flags);
  const res = await client.publicGet('/api/v5/public/funding-rate-history', { instId, limit });

  if (flags.json) {
    printResult(res.data, true);
    return;
  }

  const history = (res.data || []).map((h: any) => ({
    time: new Date(Number(h.fundingTime)).toISOString().slice(0, 16),
    rate: (Number(h.realizedRate) * 100).toFixed(4) + '%',
  }));

  console.log(`\n  📜 Funding Rate History — ${instId}\n`);
  printTable(history.slice(0, 20), [
    { key: 'time', label: 'Time' },
    { key: 'rate', label: 'Rate', align: 'right' },
  ]);
  console.log('');
}

// ─── Open Interest ────────────────────────────────────────────────────────────

async function handleOpenInterest(args: string[], flags: GlobalFlags): Promise<void> {
  const { positional, flags: cmdFlags } = parseCommandFlags(args);
  const instId = positional[0] || requireFlag(cmdFlags, 'instId');

  const client = createClient(flags);
  const res = await client.publicGet('/api/v5/public/open-interest', { instType: 'SWAP', instId });

  if (flags.json) {
    printResult(res.data, true);
    return;
  }

  const data = res.data?.[0];
  if (data) {
    console.log(`\n  📊 Open Interest — ${instId}\n`);
    console.log(`  OI (contracts):  ${Number(data.oi).toLocaleString()}`);
    console.log(`  OI (USDT):       ${Number(data.oiCcy).toLocaleString()}`);
    console.log(`  Timestamp:       ${new Date(Number(data.ts)).toISOString().slice(0, 16)}`);
    console.log('');
  }
}

// ─── Long/Short Ratio ─────────────────────────────────────────────────────────

async function handleLongShortRatio(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const period = (cmdFlags['period'] as string) || '5m';

  const client = createClient(flags);
  const res = await client.publicGet('/api/v5/rubik/stat/contracts-long-short-account-ratio', {
    instId: instId.replace('-SWAP', ''),
    period,
  });

  if (flags.json) {
    printResult(res.data, true);
    return;
  }

  const data = res.data || [];
  const latest = data[0];
  if (latest) {
    const longRatio = (Number(latest[1]) * 100).toFixed(1);
    const shortRatio = (Number(latest[2]) * 100).toFixed(1);
    console.log(`\n  ⚖️ Long/Short Ratio — ${instId}\n`);
    console.log(`  Long:   ${longRatio}%`);
    console.log(`  Short:  ${shortRatio}%`);
    console.log(`  Time:   ${new Date(Number(latest[0])).toISOString().slice(0, 16)}`);
    console.log('');
  }
}

// ─── Instruments ──────────────────────────────────────────────────────────────

async function handleInstruments(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = cmdFlags['instId'] as string | undefined;
  const instType = (cmdFlags['instType'] as string) || 'SWAP';

  const client = createClient(flags);
  const params: Record<string, string> = { instType };
  if (instId) params.instId = instId;

  const res = await client.publicGet('/api/v5/public/instruments', params);

  if (flags.json || !instId) {
    printResult(res.data, flags.json);
    return;
  }

  const data = res.data?.[0];
  if (data) {
    console.log(`\n  📋 Instrument Info — ${instId}\n`);
    console.log(`  Contract Value:  ${data.ctVal} ${data.ctValCcy}`);
    console.log(`  Tick Size:       ${data.tickSz}`);
    console.log(`  Lot Size:        ${data.lotSz}`);
    console.log(`  Min Size:        ${data.minSz}`);
    console.log(`  Max Leverage:    ${data.lever}x`);
    console.log(`  Settlement:      ${data.settleCcy}`);
    console.log(`  State:           ${data.state}`);
    console.log('');
  }
}

// ─── Mark Price ───────────────────────────────────────────────────────────────

async function handleMarkPrice(args: string[], flags: GlobalFlags): Promise<void> {
  const { positional, flags: cmdFlags } = parseCommandFlags(args);
  const instId = positional[0] || requireFlag(cmdFlags, 'instId');

  const client = createClient(flags);
  const res = await client.publicGet('/api/v5/public/mark-price', { instType: 'SWAP', instId });

  printResult(res.data?.[0], flags.json);
}

// ─── Indicators (RSI, ATR, MACD) ─────────────────────────────────────────────

async function handleIndicators(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const bar = (cmdFlags['bar'] as string) || '4H';

  // Fetch candles and compute indicators locally
  const client = createClient(flags);
  const res = await client.publicGet('/api/v5/market/candles', { instId, bar, limit: '100' });
  const candles = (res.data || []).map((c: any) => ({
    ts: Number(c[0]),
    open: Number(c[1]),
    high: Number(c[2]),
    low: Number(c[3]),
    close: Number(c[4]),
    vol: Number(c[5]),
  })).reverse(); // oldest first

  if (candles.length < 26) {
    throw new Error('Not enough candle data to compute indicators (need at least 26 bars)');
  }

  // RSI (14)
  const rsi = computeRSI(candles.map(c => c.close), 14);

  // ATR (14)
  const atr = computeATR(candles, 14);
  const atrPercent = (atr / candles[candles.length - 1].close) * 100;

  // MACD (12, 26, 9)
  const macd = computeMACD(candles.map(c => c.close), 12, 26, 9);

  // EMA 20
  const ema20 = computeEMA(candles.map(c => c.close), 20);

  const result = {
    instId,
    bar,
    rsi: Number(rsi.toFixed(2)),
    atr: Number(atr.toFixed(2)),
    atrPercent: Number(atrPercent.toFixed(2)),
    macdLine: Number(macd.macdLine.toFixed(4)),
    signalLine: Number(macd.signalLine.toFixed(4)),
    histogram: Number(macd.histogram.toFixed(4)),
    ema20: Number(ema20.toFixed(2)),
    lastPrice: candles[candles.length - 1].close,
    timestamp: new Date(candles[candles.length - 1].ts).toISOString(),
  };

  if (flags.json) {
    printResult(result, true);
    return;
  }

  console.log(`\n  📈 Technical Indicators — ${instId} (${bar})\n`);
  console.log(`  RSI (14):        ${result.rsi}`);
  console.log(`  ATR (14):        ${result.atr} (${result.atrPercent}%)`);
  console.log(`  MACD Line:       ${result.macdLine}`);
  console.log(`  Signal Line:     ${result.signalLine}`);
  console.log(`  Histogram:       ${result.histogram}`);
  console.log(`  EMA (20):        ${result.ema20}`);
  console.log(`  Last Price:      ${result.lastPrice}`);
  console.log('');
}

// ─── Indicator Computation Helpers ────────────────────────────────────────────

function computeRSI(closes: number[], period: number): number {
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function computeATR(candles: { high: number; low: number; close: number }[], period: number): number {
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trs.push(tr);
  }

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

function computeEMA(data: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

function computeMACD(closes: number[], fast: number, slow: number, signal: number): { macdLine: number; signalLine: number; histogram: number } {
  // Compute EMA series
  const emaFastSeries = computeEMASeries(closes, fast);
  const emaSlowSeries = computeEMASeries(closes, slow);

  const macdSeries: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdSeries.push((emaFastSeries[i] || 0) - (emaSlowSeries[i] || 0));
  }

  const signalSeries = computeEMASeries(macdSeries.slice(slow - 1), signal);
  const macdLine = macdSeries[macdSeries.length - 1];
  const signalLine = signalSeries[signalSeries.length - 1];

  return {
    macdLine,
    signalLine,
    histogram: macdLine - signalLine,
  };
}

function computeEMASeries(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < period; i++) {
    result.push(0); // placeholder
  }
  result[period - 1] = ema;

  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}
