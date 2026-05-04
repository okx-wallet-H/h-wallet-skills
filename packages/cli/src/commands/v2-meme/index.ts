/**
 * H_v2 Meme Market — 链上 Meme 币市场数据
 */
import { parseCommandFlags, requireFlag } from '../../utils/args.js';
import { printKeyValue, printSuccess, printError } from '../../utils/output.js';
import { OnchainClient } from '@h-wallet/core';

function oc(): OnchainClient { return new OnchainClient(); }

export async function handleMeme(argv: string[], json: boolean): Promise<void> {
  const sub = argv[0]; const rest = argv.slice(1);
  switch (sub) {
    case 'trending':   { const{flags}=parseCommandFlags(rest);const ch=(flags.chain as string)||'501';const lm=flags.limit?Number(flags.limit):20;const r=oc().tokenHotTokens(ch,lm);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok&&Array.isArray(r.data)){printSuccess(`热门 Meme 代币 (chain=${ch}):`);for(const t of r.data){const x=t as Record<string,unknown>;console.log(`  ${x.symbol||x.name}: 价格 ${x.price||'N/A'} | 24h量 ${x.volume24h||'N/A'} | 市值 ${x.marketCap||'N/A'}`);};}else{printError(r.error||'获取热门代币失败');} return; }
    case 'analyze':    { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const addr=requireFlag(flags,'address');const r=oc().tokenPriceInfo(ch,addr);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess(`代币分析 (${addr}):`);if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printError(r.error||'分析失败');} return; }
    case 'holders':    { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const addr=requireFlag(flags,'address');const r=oc().tokenHolders(ch,addr);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess(`持有人分析 (${addr}):`);if(Array.isArray(r.data)){for(const h of r.data){const x=h as Record<string,unknown>;console.log(`  ${x.address}: ${x.balance||x.amount} (${x.percentage||''}%)`);};}else if(r.data&&typeof r.data==='object'){printKeyValue(r.data as Record<string,unknown>);}else{console.log(`  ${r.data}`);}}else{printError(r.error||'获取持有人失败');} return; }
    case 'research':   { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const addr=flags.address as string|undefined;const q=flags.query as string|undefined;const r=oc().workflowTokenResearch(ch,{address:addr,query:q});if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess('代币研究报告:');if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printError(r.error||'研究失败');} return; }
    case 'new-tokens': { const{flags}=parseCommandFlags(rest);const ch=(flags.chain as string)||'501';const r=oc().workflowNewTokens(ch);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess(`新上线代币 (chain=${ch}):`);if(Array.isArray(r.data)){for(const t of r.data){const x=t as Record<string,unknown>;console.log(`  ${x.symbol||x.name}: ${x.address||''} | 创建 ${x.createdAt||''}`);};}else{console.log(`  ${r.data}`);}}else{printError(r.error||'获取新代币失败');} return; }
    case 'smart-money':{ const{flags}=parseCommandFlags(rest);const ch=(flags.chain as string)||'501';const r=oc().workflowSmartMoney(ch);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess(`聪明钱动向 (chain=${ch}):`);if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printError(r.error||'获取聪明钱失败');} return; }
    default: console.log(`\nh-wallet meme — Meme 币市场 (H_v2)\n\n子命令: trending analyze holders research new-tokens smart-money\n`);
  }
}
