/**
 * H_v2 Smart Switch — 策略智能切换
 */
import { parseCommandFlags } from '../../utils/args.js';
import { printKeyValue, printSuccess, printError, printWarning } from '../../utils/output.js';
import { OnchainClient, RestClient, resolveConfig } from '@h-wallet/core';

function oc(): OnchainClient { return new OnchainClient(); }

export async function handleSwitch(argv: string[], json: boolean): Promise<void> {
  const sub = argv[0]; const rest = argv.slice(1);
  switch (sub) {
    case 'assess': {
      printSuccess('市场环境评估:');
      const{flags}=parseCommandFlags(rest);
      const instId=(flags.instId as string)||'BTC-USDT-SWAP';
      try {
        const config=resolveConfig('live');
        const cex=new RestClient(config);
        const ticker=await cex.publicGet('/api/v5/market/ticker',{instId});
        const funding=await cex.publicGet('/api/v5/public/funding-rate',{instId});
        const oi=await cex.publicGet('/api/v5/public/open-interest',{instType:'SWAP',instId});
        if(json){console.log(JSON.stringify({ticker:ticker.data,funding:funding.data,oi:oi.data},null,2));return;}
        const t=ticker.data?.[0] as Record<string,unknown>||{};
        const f=funding.data?.[0] as Record<string,unknown>||{};
        console.log(`  ${instId}:`);
        console.log(`    价格: ${t.last} | 24h涨跌: ${t.sodUtc8}→${t.last}`);
        console.log(`    资金费率: ${f.fundingRate} | 下次: ${f.nextFundingRate||'N/A'}`);
        const vol24h=Number(t.vol24h||0);
        const rate=Number(f.fundingRate||0);
        if(Math.abs(rate)<0.0001&&vol24h>0){printSuccess('建议: 震荡市 → 适合网格策略 (grid)');}
        else if(rate>0.0003){printSuccess('建议: 多头过热 → 适合做空 DCA 或观望');}
        else if(rate<-0.0003){printSuccess('建议: 空头过热 → 适合做多 DCA');}
        else{printSuccess('建议: 中性 → 网格或 DCA 均可');}
      } catch(e:any) {
        printWarning(`CEX 数据获取失败: ${e.message}`);
        printWarning('尝试链上数据...');
      }
      return;
    }
    case 'recommend': {
      printSuccess('策略推荐:');
      console.log('  基于当前市场环境，推荐以下策略:');
      console.log('  1. h-wallet grid create --instId BTC-USDT-SWAP (震荡市)');
      console.log('  2. h-wallet dca create --instId BTC-USDT-SWAP --direction long (看多)');
      console.log('  3. h-wallet sniper buy --chain 501 --token <addr> (Meme 狙击)');
      return;
    }
    case 'portfolio': {
      const{flags}=parseCommandFlags(rest);
      const ch=flags.chain as string|undefined;
      const r=oc().workflowPortfolio(ch);
      if(json){console.log(JSON.stringify(r,null,2));return;}
      if(r.ok){printSuccess('投资组合概览:');if(r.data&&typeof r.data==='object')printKeyValue(r.data as Record<string,unknown>);else console.log(`  ${r.data}`);}
      else{printError(r.error||'获取组合失败');}
      return;
    }
    default: console.log(`\nh-wallet switch — 策略智能切换 (H_v2)\n\n子命令: assess recommend portfolio\n`);
  }
}
