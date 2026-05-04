/**
 * H_v2 Agentic Wallet — TEE 智能钱包管理
 */
import { parseCommandFlags, requireFlag } from '../../utils/args.js';
import { printKeyValue, printSuccess, printError, printWarning } from '../../utils/output.js';
import { OnchainClient } from '@h-wallet/core';

function oc(): OnchainClient { return new OnchainClient(); }

export async function handleWalletV2(argv: string[], json: boolean): Promise<void> {
  const sub = argv[0]; const rest = argv.slice(1);
  switch (sub) {
    case 'login':     { const e = rest[0]; if(!e){printError('用法: wallet login <email>');return;} const r=oc().walletLogin(e); if(json){console.log(JSON.stringify(r,null,2));return;} if(r.ok){printSuccess(`OTP 已发送至 ${e}`);console.log('  下一步: wallet verify <otp>');}else{printError(r.error||'失败');} return; }
    case 'verify':    { const o = rest[0]; if(!o){printError('用法: wallet verify <otp>');return;} const r=oc().walletVerify(o); if(json){console.log(JSON.stringify(r,null,2));return;} if(r.ok){printSuccess('验证成功！钱包已激活');if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);}else{printError(r.error||'验证失败');} return; }
    case 'status':    { const r=oc().walletStatus(); if(json){console.log(JSON.stringify(r,null,2));return;} if(r.ok){printSuccess('钱包状态:');if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}else{printWarning(r.error||'未登录');} return; }
    case 'addresses': { const r=oc().walletAddresses(); if(json){console.log(JSON.stringify(r,null,2));return;} if(r.ok&&Array.isArray(r.data)){console.log('\n  多链地址:');for(const a of r.data){const x=a as Record<string,unknown>;console.log(`  ${x.chain||x.network}: ${x.address}`);}}else if(r.ok){console.log(`  ${r.data}`);}else{printError(r.error||'获取地址失败');} return; }
    case 'balance':   { const{flags}=parseCommandFlags(rest);const ch=flags.chain as string|undefined;const r=oc().walletBalance(ch as string);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess(`余额${ch?` (${ch})`:' (全链)'}:`);if(Array.isArray(r.data)){for(const b of r.data){const x=b as Record<string,unknown>;console.log(`  ${x.symbol||x.token}: ${x.balance||x.amount} (${x.chain||''})`);};}else if(r.data&&typeof r.data==='object'){printKeyValue(r.data as Record<string,unknown>);}else{console.log(`  ${r.data}`);}}else{printError(r.error||'查询余额失败');} return; }
    case 'send':      { const{flags}=parseCommandFlags(rest);const ch=requireFlag(flags,'chain');const to=requireFlag(flags,'to');const amt=requireFlag(flags,'amount');const tk=flags.token as string|undefined;const r=oc().walletSend(ch,to,amt,tk as string);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess(`转账成功: ${amt} ${tk||'ETH'} → ${to}`);if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);}else{printError(r.error||'转账失败');} return; }
    case 'create':    { const{flags}=parseCommandFlags(rest);const nm=requireFlag(flags,'name');const r=oc().walletCreate(nm);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess(`钱包 "${nm}" 创建成功`);}else{printError(r.error||'创建失败');} return; }
    case 'accounts':  { const r=oc().walletAccounts();if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok&&Array.isArray(r.data)){printSuccess('钱包账户:');for(const a of r.data){const x=a as Record<string,unknown>;console.log(`  [${x.id}] ${x.name||'default'} ${x.active?'(活跃)':''}`);};}else{console.log(`  ${r.ok?r.data:r.error}`);} return; }
    case 'switch':    { const{flags}=parseCommandFlags(rest);const id=requireFlag(flags,'account-id');const r=oc().walletSwitch(id);if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess(`已切换到钱包 ${id}`);}else{printError(r.error||'切换失败');} return; }
    case 'logout':    { const r=oc().exec('wallet logout');if(json){console.log(JSON.stringify(r,null,2));return;}if(r.ok){printSuccess('已退出登录');}else{printError(r.error||'退出失败');} return; }
    default: console.log(`\nh-wallet wallet — Agentic Wallet (H_v2)\n\n子命令: login verify status addresses balance send create accounts switch logout\n`);
  }
}
