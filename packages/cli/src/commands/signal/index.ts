/**
 * Signal command group — smart money tracking, trader analysis, consensus signals.
 * Part of h-v1-perp-signal skill.
 *
 * Commands: traders, trader, overview, consensus, history, sentiment, alert
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
    case 'traders':
      await handleTraders(subArgs, flags);
      break;
    case 'trader':
      await handleTrader(subArgs, flags);
      break;
    case 'overview':
      await handleOverview(subArgs, flags);
      break;
    case 'consensus':
      await handleConsensus(subArgs, flags);
      break;
    case 'history':
      await handleHistory(subArgs, flags);
      break;
    case 'sentiment':
      await handleSentiment(subArgs, flags);
      break;
    case 'alert':
      await handleAlert(subArgs, flags);
      break;
    default:
      throw new Error(
        `Unknown signal subcommand: "${subcommand}". Available: traders, trader, overview, consensus, history, sentiment, alert`
      );
  }
}

// ─── Traders Leaderboard ──────────────────────────────────────────────────────

async function handleTraders(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const sortBy = optionalFlag(cmdFlags, 'sortBy', 'pnl');         // pnl, winRate, maxDrawdown, aum
  const period = optionalFlag(cmdFlags, 'period', '7d');           // 7d, 30d, 90d
  const limit = optionalFlag(cmdFlags, 'limit', '20');

  const client = createClient(flags);
  const res = await client.privateGet('/api/v5/copytrading/public-lead-traders', {
    sortType: sortBy,
    period,
    limit,
  });

  const traders = res.data || [];

  if (flags.json) {
    printResult(traders, true);
    return;
  }

  console.log(`\n  🏆 Top Traders (sorted by ${sortBy}, ${period})\n`);
  printTable(
    traders.slice(0, Number(limit)).map((t: any, i: number) => ({
      rank: String(i + 1),
      name: t.nickName || t.uniqueName || 'Anonymous',
      pnl: Number(t.pnl || 0).toFixed(2),
      pnlRatio: (Number(t.pnlRatio || 0) * 100).toFixed(1) + '%',
      winRate: (Number(t.winRatio || 0) * 100).toFixed(1) + '%',
      aum: (Number(t.aum || 0) / 1000).toFixed(1) + 'K',
      followers: t.copyTraderNum || '0',
    })),
    [
      { key: 'rank', label: '#' },
      { key: 'name', label: 'Trader' },
      { key: 'pnl', label: 'PnL(USDT)', align: 'right' },
      { key: 'pnlRatio', label: 'Return', align: 'right' },
      { key: 'winRate', label: 'Win%', align: 'right' },
      { key: 'aum', label: 'AUM', align: 'right' },
      { key: 'followers', label: 'Followers', align: 'right' },
    ]
  );
  console.log('');
}

// ─── Single Trader Profile ────────────────────────────────────────────────────

async function handleTrader(args: string[], flags: GlobalFlags): Promise<void> {
  const { positional, flags: cmdFlags } = parseCommandFlags(args);
  const traderId = positional[0] || requireFlag(cmdFlags, 'traderId');

  const client = createClient(flags);

  // Get trader profile
  const profileRes = await client.privateGet('/api/v5/copytrading/public-lead-traders', {
    uniqueName: traderId,
  });

  // Get trader current positions
  const posRes = await client.privateGet('/api/v5/copytrading/public-current-subpositions', {
    uniqueName: traderId,
  });

  // Get trader history
  const histRes = await client.privateGet('/api/v5/copytrading/public-subpositions-history', {
    uniqueName: traderId,
    limit: '10',
  });

  if (flags.json) {
    printResult({
      profile: profileRes.data?.[0],
      currentPositions: posRes.data,
      recentHistory: histRes.data,
    }, true);
    return;
  }

  const profile = profileRes.data?.[0];
  if (profile) {
    console.log(`\n  👤 Trader Profile — ${profile.nickName || traderId}\n`);
    console.log(`  ID:            ${traderId}`);
    console.log(`  Total PnL:     ${Number(profile.pnl || 0).toFixed(2)} USDT`);
    console.log(`  Return:        ${(Number(profile.pnlRatio || 0) * 100).toFixed(2)}%`);
    console.log(`  Win Rate:      ${(Number(profile.winRatio || 0) * 100).toFixed(1)}%`);
    console.log(`  Max Drawdown:  ${(Number(profile.maxDrawdown || 0) * 100).toFixed(1)}%`);
    console.log(`  AUM:           ${Number(profile.aum || 0).toFixed(2)} USDT`);
    console.log(`  Followers:     ${profile.copyTraderNum || '0'}`);
  }

  const positions = posRes.data || [];
  if (positions.length > 0) {
    console.log(`\n  📈 Current Positions (${positions.length})\n`);
    printTable(
      positions.map((p: any) => ({
        instId: p.instId,
        side: p.posSide || p.subPosSide,
        size: p.subPosQty || p.pos,
        avgPx: Number(p.avgPx).toFixed(2),
        pnl: Number(p.pnl || 0).toFixed(2),
        lever: (p.lever || '-') + 'x',
      })),
      [
        { key: 'instId', label: 'Instrument' },
        { key: 'side', label: 'Side' },
        { key: 'size', label: 'Size', align: 'right' },
        { key: 'avgPx', label: 'Entry', align: 'right' },
        { key: 'pnl', label: 'PnL', align: 'right' },
        { key: 'lever', label: 'Lever', align: 'right' },
      ]
    );
  }

  console.log('');
}

// ─── Multi-Coin Smart Money Overview ──────────────────────────────────────────

async function handleOverview(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const limit = optionalFlag(cmdFlags, 'limit', '20');

  const client = createClient(flags);

  // Get long/short ratio for top coins
  const topCoins = ['BTC-USDT-SWAP', 'ETH-USDT-SWAP', 'SOL-USDT-SWAP', 'DOGE-USDT-SWAP',
    'XRP-USDT-SWAP', 'PEPE-USDT-SWAP', 'WIF-USDT-SWAP', 'BONK-USDT-SWAP',
    'ARB-USDT-SWAP', 'OP-USDT-SWAP'];

  const results: any[] = [];

  for (const instId of topCoins) {
    try {
      const res = await client.publicGet('/api/v5/rubik/stat/contracts-long-short-account-ratio', {
        instId: instId.replace('-USDT-SWAP', '-USDT'),
        period: '5m',
      });
      const latest = res.data?.[0];
      if (latest) {
        results.push({
          instId: instId.replace('-USDT-SWAP', ''),
          longRatio: (Number(latest[1]) * 100).toFixed(1) + '%',
          shortRatio: (Number(latest[2]) * 100).toFixed(1) + '%',
          bias: Number(latest[1]) > 0.55 ? '🟢 LONG' : Number(latest[1]) < 0.45 ? '🔴 SHORT' : '⚪ NEUTRAL',
        });
      }
    } catch {
      // Skip failed coins
    }
  }

  if (flags.json) {
    printResult(results, true);
    return;
  }

  console.log('\n  🧠 Smart Money Overview — Multi-Coin Long/Short\n');
  printTable(results, [
    { key: 'instId', label: 'Symbol' },
    { key: 'longRatio', label: 'Long%', align: 'right' },
    { key: 'shortRatio', label: 'Short%', align: 'right' },
    { key: 'bias', label: 'Bias' },
  ]);
  console.log('');
}

// ─── Single Coin Consensus Signal ─────────────────────────────────────────────

async function handleConsensus(args: string[], flags: GlobalFlags): Promise<void> {
  const { positional, flags: cmdFlags } = parseCommandFlags(args);
  const instId = positional[0] || requireFlag(cmdFlags, 'instId');

  const client = createClient(flags);

  // Gather multiple data points for consensus
  const [lsRes, oiRes, frRes] = await Promise.all([
    client.publicGet('/api/v5/rubik/stat/contracts-long-short-account-ratio', {
      instId: instId.replace('-SWAP', '').replace('-USDT', '-USDT'),
      period: '5m',
    }),
    client.publicGet('/api/v5/public/open-interest', { instType: 'SWAP', instId }),
    client.publicGet('/api/v5/public/funding-rate', { instId }),
  ]);

  const lsData = lsRes.data?.[0];
  const oiData = oiRes.data?.[0];
  const frData = frRes.data?.[0];

  const longRatio = lsData ? Number(lsData[1]) : 0.5;
  const fundingRate = frData ? Number(frData.fundingRate) : 0;
  const oi = oiData ? Number(oiData.oiCcy) : 0;

  // Compute consensus score (-100 to +100)
  // Positive = bullish consensus, Negative = bearish consensus
  let score = 0;

  // Long/Short ratio contribution (weight: 40)
  score += (longRatio - 0.5) * 80;

  // Funding rate contribution (weight: 30)
  // Positive funding = longs pay shorts = market is long-biased
  if (fundingRate > 0.001) score += 30;
  else if (fundingRate > 0.0005) score += 15;
  else if (fundingRate < -0.001) score -= 30;
  else if (fundingRate < -0.0005) score -= 15;

  // Clamp score
  score = Math.max(-100, Math.min(100, score));

  const direction = score > 20 ? 'LONG' : score < -20 ? 'SHORT' : 'NEUTRAL';
  const confidence = Math.abs(score) > 60 ? 'HIGH' : Math.abs(score) > 30 ? 'MEDIUM' : 'LOW';

  const result = {
    instId,
    longRatio: longRatio.toFixed(4),
    fundingRate: fundingRate.toFixed(6),
    openInterest: oi.toFixed(0),
    consensusScore: score.toFixed(1),
    direction,
    confidence,
    timestamp: new Date().toISOString(),
  };

  if (flags.json) {
    printResult(result, true);
    return;
  }

  const emoji = direction === 'LONG' ? '🟢' : direction === 'SHORT' ? '🔴' : '⚪';
  console.log(`\n  ${emoji} Consensus Signal — ${instId}\n`);
  console.log(`  Direction:       ${direction}`);
  console.log(`  Confidence:      ${confidence}`);
  console.log(`  Score:           ${score.toFixed(1)} / 100`);
  console.log(`  Long Ratio:      ${(longRatio * 100).toFixed(1)}%`);
  console.log(`  Funding Rate:    ${(fundingRate * 100).toFixed(4)}%`);
  console.log(`  Open Interest:   ${oi.toLocaleString()} USDT`);
  console.log('');

  if (confidence === 'HIGH') {
    console.log(`  💡 强信号：建议配合 h-wallet swap place 执行 ${direction} 方向操作`);
    console.log('');
  }
}

// ─── Signal History ───────────────────────────────────────────────────────────

async function handleHistory(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const period = optionalFlag(cmdFlags, 'period', '1H');
  const limit = optionalFlag(cmdFlags, 'limit', '24');

  const client = createClient(flags);
  const res = await client.publicGet('/api/v5/rubik/stat/contracts-long-short-account-ratio', {
    instId: instId.replace('-SWAP', '').replace('-USDT', '-USDT'),
    period,
    limit,
  });

  const data = res.data || [];

  if (flags.json) {
    printResult(data.map((d: any) => ({
      timestamp: new Date(Number(d[0])).toISOString(),
      longRatio: d[1],
      shortRatio: d[2],
    })), true);
    return;
  }

  console.log(`\n  📜 Signal History — ${instId} (${period})\n`);
  printTable(
    data.slice(0, Number(limit)).map((d: any) => ({
      time: new Date(Number(d[0])).toISOString().slice(5, 16),
      long: (Number(d[1]) * 100).toFixed(1) + '%',
      short: (Number(d[2]) * 100).toFixed(1) + '%',
      bias: Number(d[1]) > 0.55 ? '🟢' : Number(d[1]) < 0.45 ? '🔴' : '⚪',
    })),
    [
      { key: 'time', label: 'Time' },
      { key: 'long', label: 'Long%', align: 'right' },
      { key: 'short', label: 'Short%', align: 'right' },
      { key: 'bias', label: '' },
    ]
  );
  console.log('');
}

// ─── Market Sentiment ─────────────────────────────────────────────────────────

async function handleSentiment(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = cmdFlags['instId'] as string | undefined;

  const client = createClient(flags);

  // Aggregate multiple sentiment indicators
  const results: any = {
    timestamp: new Date().toISOString(),
    indicators: [],
  };

  // 1. Taker buy/sell volume ratio
  if (instId) {
    try {
      const takerRes = await client.publicGet('/api/v5/rubik/stat/taker-volume-contract', {
        instId: instId.replace('-SWAP', ''),
        period: '5m',
      });
      const takerData = takerRes.data?.[0];
      if (takerData) {
        const buyVol = Number(takerData[1]);
        const sellVol = Number(takerData[2]);
        const ratio = buyVol / (buyVol + sellVol);
        results.indicators.push({
          name: 'Taker Buy/Sell',
          value: ratio.toFixed(3),
          signal: ratio > 0.55 ? 'BULLISH' : ratio < 0.45 ? 'BEARISH' : 'NEUTRAL',
        });
      }
    } catch { /* skip */ }
  }

  // 2. Margin lending ratio
  try {
    const marginRes = await client.publicGet('/api/v5/rubik/stat/margin-lending-ratio', {
      ccy: 'USDT',
      period: '5m',
    });
    const marginData = marginRes.data?.[0];
    if (marginData) {
      results.indicators.push({
        name: 'Margin Lending',
        value: Number(marginData[1]).toFixed(3),
        signal: Number(marginData[1]) > 5 ? 'HIGH_LEVERAGE' : 'NORMAL',
      });
    }
  } catch { /* skip */ }

  if (flags.json) {
    printResult(results, true);
    return;
  }

  console.log('\n  🌡️ Market Sentiment\n');
  if (results.indicators.length > 0) {
    printTable(results.indicators, [
      { key: 'name', label: 'Indicator' },
      { key: 'value', label: 'Value', align: 'right' },
      { key: 'signal', label: 'Signal' },
    ]);
  } else {
    console.log('  No sentiment data available.');
  }
  console.log('');
}

// ─── Alert (Signal-based notification) ────────────────────────────────────────

async function handleAlert(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const threshold = optionalFlag(cmdFlags, 'threshold', '0.6'); // long ratio threshold

  const client = createClient(flags);
  const res = await client.publicGet('/api/v5/rubik/stat/contracts-long-short-account-ratio', {
    instId: instId.replace('-SWAP', '').replace('-USDT', '-USDT'),
    period: '5m',
  });

  const latest = res.data?.[0];
  if (!latest) {
    throw new Error('No data available for alert check');
  }

  const longRatio = Number(latest[1]);
  const triggered = longRatio >= Number(threshold) || longRatio <= (1 - Number(threshold));

  const result = {
    instId,
    longRatio: longRatio.toFixed(4),
    threshold,
    triggered,
    direction: longRatio >= Number(threshold) ? 'LONG_EXTREME' : longRatio <= (1 - Number(threshold)) ? 'SHORT_EXTREME' : 'NORMAL',
    timestamp: new Date().toISOString(),
  };

  if (flags.json) {
    printResult(result, true);
    return;
  }

  if (triggered) {
    printWarning(`ALERT: ${instId} — Long ratio ${(longRatio * 100).toFixed(1)}% exceeds threshold ${(Number(threshold) * 100).toFixed(0)}%`);
    console.log(`  Direction: ${result.direction}`);
    console.log(`  Consider: Contrarian trade or position adjustment`);
  } else {
    console.log(`\n  ✅ ${instId} — No alert triggered (Long: ${(longRatio * 100).toFixed(1)}%, Threshold: ${(Number(threshold) * 100).toFixed(0)}%)\n`);
  }
}
