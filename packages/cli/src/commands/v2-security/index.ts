/**
 * H_v2 Security Guard — 链上安全防护
 */
import { parseCommandFlags, requireFlag } from '../../utils/args.js';
import { printKeyValue, printSuccess, printError, printWarning } from '../../utils/output.js';
import { OnchainClient } from '@h-wallet/core';

function oc(): OnchainClient { return new OnchainClient(); }

export async function handleSecurity(argv: string[], json: boolean): Promise<void> {
  const sub = argv[0]; const rest = argv.slice(1);
  switch (sub) {
    case 'token-scan':    { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const addr=requireFlag(flags,'address');const r=oc().securityTokenScan(ch,addr);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess('代币安全扫描:');if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printError(r.error||'扫描失败');} return; }
    case 'contract-scan': { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const addr=requireFlag(flags,'address');const r=oc().securityContractScan(ch,addr);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess('合约安全扫描:');if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printError(r.error||'扫描失败');} return; }
    case 'dapp-scan':     { const url=rest[0];if(!url){printError('用法: security dapp-scan <url>');return;}const r=oc().securityDappScan(url);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess('DApp 安全扫描:');if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printError(r.error||'扫描失败');} return; }
    case 'approvals':     { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const addr=requireFlag(flags,'address');const r=oc().securityApprovals(ch,addr);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess('授权列表:');if(Array.isArray(r.data)){for(const a of r.data){const x=a as Record<string,unknown>;console.log(`  ${x.spender}: ${x.token||x.symbol} (${x.allowance||'unlimited'})`);};}else if(r.data&&typeof r.data==='object'){printKeyValue(r.data as Record<string,unknown>);}else{console.log(`  ${r.data}`);}}else{printError(r.error||'获取授权失败');} return; }
    case 'revoke':        { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const spender=requireFlag(flags,'spender');const tk=flags.token as string|undefined;const r=oc().securityRevoke(ch,spender,tk);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess(`已撤销 ${spender} 的授权`);}else{printError(r.error||'撤销失败');} return; }
    case 'tx-scan':       { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const txData=requireFlag(flags,'tx-data');const r=oc().securityTxScan(ch,txData);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess('交易安全扫描:');if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printError(r.error||'扫描失败');} return; }
    default: console.log(`\nh-wallet security — 安全防护 (H_v2)\n\n子命令: token-scan contract-scan dapp-scan approvals revoke tx-scan\n`);
  }
}
