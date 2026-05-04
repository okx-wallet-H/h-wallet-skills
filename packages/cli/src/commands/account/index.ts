/**
 * Account command group — balance, positions, margin, leverage, transfer.
 * Part of h-v1-wallet-auth skill.
 */

import { parseCommandFlags, optionalFlag, requireFlag } from '../../utils/args.js';
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
    case 'balance':
      await handleBalance(subArgs, flags);
      break;
    case 'positions':
      await handlePositions(subArgs, flags);
      break;
    case 'position-risk':
      await handlePositionRisk(subArgs, flags);
      break;
    case 'config':
      await handleConfig(flags);
      break;
    case 'fee-rate':
      await handleFeeRate(subArgs, flags);
      break;
    case 'max-size':
      await handleMaxSize(subArgs, flags);
      break;
    case 'set-leverage':
      await handleSetLeverage(subArgs, flags);
      break;
    case 'set-position-mode':
      await handleSetPositionMode(subArgs, flags);
      break;
    case 'set-margin-mode':
      await handleSetMarginMode(subArgs, flags);
      break;
    case 'transfer':
      await handleTransfer(subArgs, flags);
      break;
    case 'bills':
      await handleBills(subArgs, flags);
      break;
    case 'deposit-address':
      await handleDepositAddress(subArgs, flags);
      break;
    case 'withdraw':
      await handleWithdraw(subArgs, flags);
      break;
    case 'withdraw-status':
      await handleWithdrawStatus(subArgs, flags);
      break;
    default:
      throw new Error(
        `Unknown account subcommand: "${subcommand}". Available: balance, positions, position-risk, config, fee-rate, max-size, set-leverage, set-position-mode, set-margin-mode, transfer, bills, deposit-address, withdraw, withdraw-status`
      );
  }
}

// ─── Balance ──────────────────────────────────────────────────────────────────

async function handleBalance(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const ccy = cmdFlags['ccy'] as string | undefined;

  const client = createClient(flags);
  const params: Record<string, string> = {};
  if (ccy) params.ccy = ccy;

  const res = await client.privateGet('/api/v5/account/balance', params);
  const data = res.data?.[0];

  if (flags.json) {
    printResult(data, true);
    return;
  }

  // Human-readable output — emphasize USDT, hide BTC per user preference
  if (data) {
    console.log('\n  📊 Account Balance\n');
    console.log(`  Total Equity (USDT):  ${Number(data.totalEq).toFixed(2)}`);
    console.log(`  Available Balance:    ${Number(data.adjEq).toFixed(2)}`);
    console.log(`  Frozen (Orders):      ${Number(data.ordFroz).toFixed(2)}`);
    console.log(`  Initial Margin:       ${Number(data.imr).toFixed(2)}`);
    console.log(`  Maintenance Margin:   ${Number(data.mmr).toFixed(2)}`);

    // Margin ratio warning
    const marginRatio = Number(data.mgnRatio);
    if (marginRatio > 0 && marginRatio < 50) {
      printWarning(`保证金率 ${marginRatio.toFixed(1)}% — 低于 50%，请注意风险！`);
    }

    // Currency details (filter out BTC)
    if (data.details && Array.isArray(data.details)) {
      const filtered = data.details.filter((d: any) => d.ccy !== 'BTC');
      if (filtered.length > 0) {
        console.log('\n  Currency Details:');
        printTable(
          filtered.map((d: any) => ({
            ccy: d.ccy,
            eq: Number(d.eq).toFixed(4),
            availBal: Number(d.availBal).toFixed(4),
            frozenBal: Number(d.frozenBal).toFixed(4),
          })),
          [
            { key: 'ccy', label: 'Currency' },
            { key: 'eq', label: 'Equity', align: 'right' },
            { key: 'availBal', label: 'Available', align: 'right' },
            { key: 'frozenBal', label: 'Frozen', align: 'right' },
          ]
        );
      }
    }
    console.log('');
  }
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
    console.log('\n  No open positions.\n');
    return;
  }

  console.log('\n  📈 Open Positions\n');
  printTable(
    positions.map((p: any) => ({
      instId: p.instId,
      posSide: p.posSide,
      pos: p.pos,
      avgPx: Number(p.avgPx).toFixed(2),
      upl: Number(p.upl).toFixed(2),
      uplRatio: (Number(p.uplRatio) * 100).toFixed(2) + '%',
      lever: p.lever + 'x',
      liqPx: p.liqPx ? Number(p.liqPx).toFixed(2) : '-',
      margin: Number(p.margin).toFixed(2),
    })),
    [
      { key: 'instId', label: 'Instrument' },
      { key: 'posSide', label: 'Side' },
      { key: 'pos', label: 'Size', align: 'right' },
      { key: 'avgPx', label: 'Avg Price', align: 'right' },
      { key: 'upl', label: 'UPL', align: 'right' },
      { key: 'uplRatio', label: 'UPL%', align: 'right' },
      { key: 'lever', label: 'Lever', align: 'right' },
      { key: 'liqPx', label: 'Liq Price', align: 'right' },
      { key: 'margin', label: 'Margin', align: 'right' },
    ]
  );
  console.log('');
}

// ─── Position Risk ────────────────────────────────────────────────────────────

async function handlePositionRisk(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instType = (cmdFlags['instType'] as string) || 'SWAP';

  const client = createClient(flags);
  const res = await client.privateGet('/api/v5/account/account-position-risk', { instType });

  printResult(res.data, flags.json);
}

// ─── Account Config ───────────────────────────────────────────────────────────

async function handleConfig(flags: GlobalFlags): Promise<void> {
  const client = createClient(flags);
  const res = await client.privateGet('/api/v5/account/config');
  const data = res.data?.[0];

  if (flags.json) {
    printResult(data, true);
    return;
  }

  if (data) {
    console.log('\n  ⚙️  Account Configuration\n');
    console.log(`  Account Level:    ${data.acctLv}`);
    console.log(`  Position Mode:    ${data.posMode}`);
    console.log(`  Auto Loan:        ${data.autoLoan}`);
    console.log(`  UID:              ${data.uid}`);
    console.log('');
  }
}

// ─── Fee Rate ─────────────────────────────────────────────────────────────────

async function handleFeeRate(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instType = (cmdFlags['instType'] as string) || 'SWAP';

  const client = createClient(flags);
  const res = await client.privateGet('/api/v5/account/trade-fee', { instType });

  printResult(res.data, flags.json);
}

// ─── Max Size ─────────────────────────────────────────────────────────────────

async function handleMaxSize(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const tdMode = (cmdFlags['tdMode'] as string) || 'cross';

  const client = createClient(flags);
  const res = await client.privateGet('/api/v5/account/max-size', { instId, tdMode });

  printResult(res.data, flags.json);
}

// ─── Set Leverage ─────────────────────────────────────────────────────────────

async function handleSetLeverage(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const lever = requireFlag(cmdFlags, 'lever');
  const mgnMode = (cmdFlags['mgnMode'] as string) || 'cross';
  const posSide = cmdFlags['posSide'] as string | undefined;

  const client = createClient(flags);
  const body: Record<string, string> = { instId, lever, mgnMode };
  if (posSide) body.posSide = posSide;

  const res = await client.privatePost('/api/v5/account/set-leverage', body);

  if (flags.json) {
    printResult(res.data, true);
  } else {
    printSuccess(`Leverage set to ${lever}x for ${instId} (${mgnMode})`);
  }
}

// ─── Set Position Mode ────────────────────────────────────────────────────────

async function handleSetPositionMode(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const posMode = requireFlag(cmdFlags, 'posMode'); // long_short_mode or net_mode

  const client = createClient(flags);
  const res = await client.privatePost('/api/v5/account/set-position-mode', { posMode });

  if (flags.json) {
    printResult(res.data, true);
  } else {
    printSuccess(`Position mode set to: ${posMode}`);
  }
}

// ─── Set Margin Mode ──────────────────────────────────────────────────────────

async function handleSetMarginMode(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instId = requireFlag(cmdFlags, 'instId');
  const mgnMode = requireFlag(cmdFlags, 'mgnMode'); // isolated or cross

  const client = createClient(flags);
  // Note: This uses set-leverage endpoint with margin mode change
  const res = await client.privatePost('/api/v5/account/set-leverage', { instId, mgnMode, lever: '3' });

  if (flags.json) {
    printResult(res.data, true);
  } else {
    printSuccess(`Margin mode set to: ${mgnMode} for ${instId}`);
  }
}

// ─── Transfer ─────────────────────────────────────────────────────────────────

async function handleTransfer(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const ccy = requireFlag(cmdFlags, 'ccy');
  const amt = requireFlag(cmdFlags, 'amt');
  const from = (cmdFlags['from'] as string) || '6'; // 6=funding
  const to = (cmdFlags['to'] as string) || '18';    // 18=trading

  const client = createClient(flags);
  const res = await client.privatePost('/api/v5/asset/transfer', { ccy, amt, from, to });

  if (flags.json) {
    printResult(res.data, true);
  } else {
    const fromName = from === '6' ? 'Funding' : 'Trading';
    const toName = to === '18' ? 'Trading' : 'Funding';
    printSuccess(`Transferred ${amt} ${ccy} from ${fromName} to ${toName}`);
  }
}

// ─── Bills ────────────────────────────────────────────────────────────────────

async function handleBills(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const instType = (cmdFlags['instType'] as string) || 'SWAP';
  const limit = (cmdFlags['limit'] as string) || '20';

  const client = createClient(flags);
  const res = await client.privateGet('/api/v5/account/bills', { instType, limit });

  printResult(res.data, flags.json);
}

// ─── Deposit Address ──────────────────────────────────────────────────────────

async function handleDepositAddress(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const ccy = (cmdFlags['ccy'] as string) || 'USDT';

  const client = createClient(flags);
  const res = await client.privateGet('/api/v5/asset/deposit-address', { ccy });

  if (flags.json) {
    printResult(res.data, true);
    return;
  }

  const addresses = res.data || [];
  if (addresses.length === 0) {
    console.log('\n  No deposit addresses found.\n');
    return;
  }

  console.log(`\n  💰 Deposit Addresses for ${ccy}\n`);
  printTable(
    addresses.map((a: any) => ({
      chain: a.chain,
      addr: a.addr,
      memo: a.memo || '-',
      minDep: a.minDep,
    })),
    [
      { key: 'chain', label: 'Chain' },
      { key: 'addr', label: 'Address' },
      { key: 'memo', label: 'Memo/Tag' },
      { key: 'minDep', label: 'Min Deposit', align: 'right' },
    ]
  );
  console.log('');
}

// ─── Withdraw ─────────────────────────────────────────────────────────────────

async function handleWithdraw(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const ccy = requireFlag(cmdFlags, 'ccy');
  const amt = requireFlag(cmdFlags, 'amt');
  const toAddr = requireFlag(cmdFlags, 'toAddr');
  const chain = requireFlag(cmdFlags, 'chain');
  const dest = (cmdFlags['dest'] as string) || '4'; // 4=on-chain
  const fee = (cmdFlags['fee'] as string) || '0';

  const client = createClient(flags);
  const res = await client.privatePost('/api/v5/asset/withdrawal', {
    ccy, amt, toAddr, chain, dest, fee,
  });

  if (flags.json) {
    printResult(res.data, true);
  } else {
    printSuccess(`Withdrawal initiated: ${amt} ${ccy} → ${toAddr} (chain: ${chain})`);
    console.log('  Use "h-wallet account withdraw-status" to track progress.\n');
  }
}

// ─── Withdraw Status ──────────────────────────────────────────────────────────

async function handleWithdrawStatus(args: string[], flags: GlobalFlags): Promise<void> {
  const { flags: cmdFlags } = parseCommandFlags(args);
  const wdId = cmdFlags['wdId'] as string | undefined;

  const client = createClient(flags);
  const params: Record<string, string> = { ccy: 'USDT' };
  if (wdId) params.wdId = wdId;

  const res = await client.privateGet('/api/v5/asset/withdrawal-history', params);

  printResult(res.data, flags.json);
}
