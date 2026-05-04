/**
 * H_v2 Meme Market — 链上 Meme 币市场数据
 *
 * 子命令: trending | analyze | holders | research | new-tokens | smart-money
 *
 * onchainos token hot-tokens 返回字段映射:
 *   tokenSymbol, tokenContractAddress, price, change, volume,
 *   marketCap, liquidity, holders, txs, txsBuy, txsSell,
 *   uniqueTraders, top10HoldPercent, devHoldPercent, bundleHoldPercent,
 *   inflowUsd, riskLevelControl, tokenLogoUrl, chainIndex
 */
import { parseCommandFlags, requireFlag } from '../../utils/args.js';
import { printKeyValue, printSuccess, printError } from '../../utils/output.js';
import { OnchainClient } from '@h-wallet/core';

function oc(): OnchainClient { return new OnchainClient(); }

function fmtUsd(v: unknown): string {
  if (typeof v !== 'string' && typeof v !== 'number') return 'N/A';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPrice(v: unknown): string {
  if (typeof v !== 'string' && typeof v !== 'number') return 'N/A';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  if (n < 0.0001) return n.toExponential(4);
  if (n < 1) return n.toFixed(6);
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

export async function handleMeme(argv: string[], json: boolean): Promise<void> {
  const sub = argv[0];
  const rest = argv.slice(1);

  switch (sub) {
    case 'trending': {
      const { flags } = parseCommandFlags(rest);
      const ch = (flags.chain as string) || '501';
      const lm = flags.limit ? Number(flags.limit) : 20;
      const r = oc().tokenHotTokens(ch, lm);
      if (json) { console.log(JSON.stringify(r, null, 2)); return; }
      if (r.ok && Array.isArray(r.data)) {
        printSuccess(`热门 Meme 代币 (chain=${ch}, limit=${lm}):`);
        console.log('');
        for (const t of r.data) {
          const x = t as Record<string, unknown>;
          const sym = x.tokenSymbol || x.symbol || x.name || 'UNKNOWN';
          const risk = x.riskLevelControl;
          const riskTag = risk === '1' ? '\u{1F7E2}' : risk === '2' ? '\u{1F7E1}' : risk === '3' ? '\u{1F534}' : '\u{26AA}';
          console.log(`  ${riskTag} ${sym}`);
          console.log(`     价格: ${fmtPrice(x.price)}  |  24h: ${x.change || '0'}%  |  量: ${fmtUsd(x.volume)}`);
          console.log(`     市值: ${fmtUsd(x.marketCap)}  |  流动性: ${fmtUsd(x.liquidity)}  |  持有人: ${x.holders || 'N/A'}`);
          if (x.tokenContractAddress) console.log(`     合约: ${x.tokenContractAddress}`);
          console.log('');
        }
        console.log(`  共 ${r.data.length} 个代币`);
      } else {
        printError(r.error || '获取热门代币失败');
      }
      return;
    }

    case 'analyze': {
      const { flags } = parseCommandFlags(rest);
      const ch = requireFlag(flags, 'chain');
      const addr = requireFlag(flags, 'address');
      const r = oc().tokenPriceInfo(ch, addr);
      if (json) { console.log(JSON.stringify(r, null, 2)); return; }
      if (r.ok) {
        printSuccess(`代币分析 (${addr}):`);
        if (r.data && typeof r.data === 'object') printKeyValue(r.data as Record<string, unknown>);
        else console.log(`  ${r.data}`);
      } else {
        printError(r.error || '分析失败');
      }
      return;
    }

    case 'holders': {
      const { flags } = parseCommandFlags(rest);
      const ch = requireFlag(flags, 'chain');
      const addr = requireFlag(flags, 'address');
      const r = oc().tokenHolders(ch, addr);
      if (json) { console.log(JSON.stringify(r, null, 2)); return; }
      if (r.ok) {
        printSuccess(`持有人分析 (${addr}):`);
        if (Array.isArray(r.data)) {
          for (const h of r.data) {
            const x = h as Record<string, unknown>;
            console.log(`  ${x.holderAddress || x.address}: ${x.amount || x.balance} (${x.percentage || x.holdingPercent || ''}%)`);
          }
        } else if (r.data && typeof r.data === 'object') {
          printKeyValue(r.data as Record<string, unknown>);
        } else {
          console.log(`  ${r.data}`);
        }
      } else {
        printError(r.error || '获取持有人失败');
      }
      return;
    }

    case 'research': {
      const { flags } = parseCommandFlags(rest);
      const ch = requireFlag(flags, 'chain');
      const addr = flags.address as string | undefined;
      const q = flags.query as string | undefined;
      const r = oc().workflowTokenResearch(ch, { address: addr, query: q });
      if (json) { console.log(JSON.stringify(r, null, 2)); return; }
      if (r.ok) {
        printSuccess('代币研究报告:');
        if (r.data && typeof r.data === 'object') printKeyValue(r.data as Record<string, unknown>);
        else console.log(`  ${r.data}`);
      } else {
        printError(r.error || '研究失败');
      }
      return;
    }

    case 'new-tokens': {
      const { flags } = parseCommandFlags(rest);
      const ch = (flags.chain as string) || '501';
      const r = oc().workflowNewTokens(ch);
      if (json) { console.log(JSON.stringify(r, null, 2)); return; }
      if (r.ok) {
        printSuccess(`新上线代币 (chain=${ch}):`);
        if (Array.isArray(r.data)) {
          for (const t of r.data) {
            const x = t as Record<string, unknown>;
            const sym = x.tokenSymbol || x.symbol || x.name || 'UNKNOWN';
            console.log(`  ${sym}: ${x.tokenContractAddress || x.address || ''} | 创建 ${x.createdAt || x.firstTradeTime || ''}`);
          }
        } else {
          console.log(`  ${r.data}`);
        }
      } else {
        printError(r.error || '获取新代币失败');
      }
      return;
    }

    case 'smart-money': {
      const { flags } = parseCommandFlags(rest);
      const ch = (flags.chain as string) || '501';
      const r = oc().workflowSmartMoney(ch);
      if (json) { console.log(JSON.stringify(r, null, 2)); return; }
      if (r.ok) {
        printSuccess(`聪明钱动向 (chain=${ch}):`);
        if (r.data && typeof r.data === 'object') printKeyValue(r.data as Record<string, unknown>);
        else console.log(`  ${r.data}`);
      } else {
        printError(r.error || '获取聪明钱失败');
      }
      return;
    }

    default:
      console.log(`
h-wallet meme — Meme 币市场数据 (H_v2)

子命令:
  trending     热门 Meme 代币排行 (--chain, --limit)
  analyze      代币深度分析 (--chain, --address)
  holders      持有人分布分析 (--chain, --address)
  research     代币综合研究报告 (--chain, --address/--query)
  new-tokens   新上线代币列表 (--chain)
  smart-money  聪明钱动向追踪 (--chain)

示例:
  h-wallet meme trending --chain 501 --limit 10
  h-wallet meme analyze --chain 501 --address <合约地址>
`);
  }
}
