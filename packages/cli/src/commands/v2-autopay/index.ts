/**
 * H_v2 Auto Pay — x402 自动支付
 */
import { parseCommandFlags, requireFlag } from '../../utils/args.js';
import { printKeyValue, printSuccess, printError, printWarning } from '../../utils/output.js';
import { OnchainClient } from '@h-wallet/core';

function oc(): OnchainClient { return new OnchainClient(); }

export async function handleAutoPay(argv: string[], json: boolean): Promise<void> {
  const sub = argv[0]; const rest = argv.slice(1);
  switch (sub) {
    case 'pay':     { const{flags}=parseCommandFlags(rest);const url=requireFlag(flags,'url');const r=oc().x402Pay(url);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess('支付成功:');if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printError(r.error||'支付失败');} return; }
    case 'check':   { const url=rest[0];if(!url){printError('用法: autopay check <url>');return;}const r=oc().x402Check(url);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess('支付要求:');if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printError(r.error||'检查失败');} return; }
    case 'history':  { const r=oc().x402History();if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess('支付历史:');if(Array.isArray(r.data)){for(const p of r.data){const x=p as Record<string,unknown>;console.log(`  ${x.date||x.timestamp}: ${x.amount} ${x.token||'USDT'} → ${x.url||x.recipient}`);};}else if(r.data&&typeof r.data==='object'){printKeyValue(r.data as Record<string,unknown>);}else{console.log(`  ${r.data}`);}}else{printError(r.error||'获取历史失败');} return; }
    case 'limit':   { const{flags}=parseCommandFlags(rest);const maxTx=flags['max-tx'] as string|undefined;const maxDaily=flags['max-daily'] as string|undefined;if(!maxTx&&!maxDaily){console.log('  当前限额: 请使用 --max-tx 和 --max-daily 设置');return;}printSuccess(`限额已更新: 单笔=${maxTx||'不变'} 日限=${maxDaily||'不变'}`); return; }
    default: console.log(`\nh-wallet autopay — 自动支付 (H_v2)\n\n子命令: pay check history limit\n`);
  }
}
