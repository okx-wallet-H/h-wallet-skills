/**
 * H_v2 Meme Sniper — 100U 战神自动狙击
 */
import { parseCommandFlags, requireFlag } from '../../utils/args.js';
import { printKeyValue, printSuccess, printError, printWarning } from '../../utils/output.js';
import { OnchainClient } from '@h-wallet/core';

function oc(): OnchainClient { return new OnchainClient(); }

export async function handleSniper(argv: string[], json: boolean): Promise<void> {
  const sub = argv[0]; const rest = argv.slice(1);
  switch (sub) {
    case 'scan':    { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const addr=requireFlag(flags,'address');const r=oc().securityTokenScan(ch,addr);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess('安全扫描结果:');if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printError(r.error||'扫描失败');} return; }
    case 'buy':     { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const token=requireFlag(flags,'token');const amt=(flags.amount as string)||'100';printWarning(`准备买入: ${amt} USDT → ${token} (chain=${ch})`);const scan=oc().securityTokenScan(ch,token);if(scan.ok){const d=scan.data as Record<string,unknown>;if(d&&(d.isHoneypot===true||d.riskLevel==='high')){printError('安全拦截: 该代币存在高风险（貔貅盘/黑名单），已阻止交易');return;}}const r=oc().swapQuote(ch,'USDT',token,amt);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess(`报价成功:`);if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);console.log(`\n  确认执行: h-wallet sniper execute --chain ${ch} --token ${token} --amount ${amt}`);}else{printError(r.error||'获取报价失败');} return; }
    case 'execute': { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const token=requireFlag(flags,'token');const amt=(flags.amount as string)||'100';const slip=(flags.slippage as string)||'0.5';const r=oc().swapExecute(ch,'USDT',token,amt,slip);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess(`狙击成功: ${amt} USDT → ${token}`);if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printError(r.error||'执行失败');} return; }
    case 'sell':    { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const token=requireFlag(flags,'token');const amt=requireFlag(flags,'amount');const slip=(flags.slippage as string)||'0.5';const r=oc().swapExecute(ch,token,'USDT',amt,slip);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess(`卖出成功: ${amt} ${token} → USDT`);if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printError(r.error||'卖出失败');} return; }
    case 'status':  { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const tx=requireFlag(flags,'tx-hash');const r=oc().swapStatus(ch,tx);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess('交易状态:');if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printError(r.error||'查询失败');} return; }
    default: console.log(`\nh-wallet sniper — Meme 狙击 (H_v2)\n\n子命令: scan buy execute sell status\n`);
  }
}
