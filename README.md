# H Wallet Skills

H Wallet 的 AI Agent 技能集，对接 OKX V5 中心化交易所 API，以**永续合约**为核心业务。

## 架构概览

```
H_v1 (CEX 中心化业务) — 对标 OKX V5
├── h-v1-wallet-auth     账户认证与保证金管理
├── h-v1-perp-market     永续合约市场数据
├── h-v1-perp-signal     交易员信号与聪明钱分析
├── h-v1-perp-trade      永续合约交易执行
├── h-v1-perp-grid       合约中性网格策略
└── h-v1-perp-dca        合约马丁格尔策略
```

## 技术栈

- **Runtime**: Node.js >= 18
- **Language**: TypeScript (ESM)
- **API**: OKX REST API v5
- **签名**: ISO 8601 Timestamp + HMAC-SHA256
- **配置**: TOML Profile (`~/.h-wallet/config.toml`)

## 快速开始

```bash
# 安装 CLI
npm install -g @h-wallet/trade-cli

# 初始化配置
h-wallet config init

# 验证连接
h-wallet market ticker --instId BTC-USDT-SWAP --json
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

| 版本 | 定位 | 对标 |
|------|------|------|
| H_v1 | CEX 中心化（永续合约为重点） | OKX V5 |
| H_v2 | Web3 去中心化（Meme 生态） | OKX V6 Onchain OS |

## License

MIT
