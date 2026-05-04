# H Wallet Skills

H Wallet 的 AI Agent 技能集，完整对接 OKX V5 中心化交易所 API 和 V6 Onchain OS 去中心化生态。

## 架构概览

```
H_v1 (CEX 中心化业务) — 对标 OKX V5
├── h-v1-wallet-auth     账户认证与保证金管理
├── h-v1-perp-market     永续合约市场数据
├── h-v1-perp-signal     交易员信号与聪明钱分析
├── h-v1-perp-trade      永续合约交易执行
├── h-v1-perp-grid       合约中性网格策略
└── h-v1-perp-dca        合约马丁格尔策略

H_v2 (Web3 去中心化生态) — 对标 OKX V6 Onchain OS
├── h-v2-agentic-wallet  TEE 智能钱包与多用户资金池
├── h-v2-meme-market     Meme 币链上市场数据
├── h-v2-meme-sniper     Meme 币自动狙击与套利
├── h-v2-smart-switch    策略动态适应与智能切换
├── h-v2-security-guard  链上安全守卫与貔貅盘拦截
└── h-v2-auto-pay        x402 协议自动支付
```

## 技术栈

- **Runtime**: Node.js >= 18
- **Language**: TypeScript (ESM)
- **API**: OKX REST API v5 + Onchain OS Skills/MCP
- **签名**: ISO 8601 Timestamp + HMAC-SHA256
- **配置**: TOML Profile (`~/.h-wallet/config.toml`)
- **链**: X Layer (优先), Solana, Ethereum, Base

## 快速开始

```bash
# 安装 CLI
npm install -g @h-wallet/trade-cli

# 初始化配置
h-wallet config init

# 验证连接 (CEX)
h-wallet market ticker --instId ETH-USDT-SWAP --json

# 验证连接 (Onchain)
h-wallet wallet balance --json
```

## 签名机制

```
payload = timestamp + METHOD + requestPath + body
signature = Base64(HMAC-SHA256(payload, secretKey))
```

请求头：
- `OK-ACCESS-KEY`: API Key
- `OK-ACCESS-SIGN`: 签名值
- `OK-ACCESS-PASSPHRASE`: 密码短语
- `OK-ACCESS-TIMESTAMP`: ISO 8601 时间戳

## 配置文件

```toml
# ~/.h-wallet/config.toml
default_profile = "live"

[profiles.live]
api_key = "your-api-key"
secret_key = "your-secret-key"
passphrase = "your-passphrase"
demo = false
site = "global"

[profiles.demo]
api_key = "your-demo-key"
secret_key = "your-demo-secret"
passphrase = "your-demo-passphrase"
demo = true
```

## 版本规划

| 版本 | 定位 | 对标 | Skills 数量 |
|------|------|------|-------------|
| H_v1 | CEX 中心化（永续合约为重点） | OKX V5 | 6 |
| H_v2 | Web3 去中心化（Meme 生态） | OKX V6 Onchain OS | 6 |

## H_v1 Skills 详情

| Skill | 命令数 | 核心能力 |
|-------|--------|----------|
| `h-v1-wallet-auth` | 6 | 余额查询、保证金管理、杠杆设置、资金划转 |
| `h-v1-perp-market` | 8 | K线、Ticker、资金费率、持仓量、多空比 |
| `h-v1-perp-signal` | 5 | 交易员排行榜、持仓追踪、共识信号、信号历史 |
| `h-v1-perp-trade` | 9 | 开平仓、止盈止损、追踪止损、一键平仓 |
| `h-v1-perp-grid` | 6 | 中性网格创建/停止/监控，预优化30%止盈 |
| `h-v1-perp-dca` | 6 | 马丁格尔创建/停止/监控，动态止盈+自动循环 |

## H_v2 Skills 详情

| Skill | 命令数 | 核心能力 |
|-------|--------|----------|
| `h-v2-agentic-wallet` | 5 | TEE钱包创建、跨链余额、链上转账、多钱包管理 |
| `h-v2-meme-market` | 4 | 热门Meme发现、代币搜索、深度分析、持有人集群 |
| `h-v2-meme-sniper` | 4 | 全自动狙击、100U战神模式、TP/SL自动平仓 |
| `h-v2-smart-switch` | 3 | 市场环境感知、策略自动切换（Grid/DCA/Sniper） |
| `h-v2-security-guard` | 3 | 貔貅盘检测、合约风险扫描、恶意授权撤销 |
| `h-v2-auto-pay` | 3 | x402协议按需付费、限额控制、支付历史 |

## License

MIT
