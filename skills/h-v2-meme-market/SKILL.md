---
name: h-v2-meme-market
description: "Use this skill when the user asks about 'Meme coin', 'pump token', 'token search', 'market cap', 'volume', 'holder analysis', 'top traders', 'trending tokens', 'new pairs', 'dex market', 'Meme币', '土狗币', '代币搜索', '市值', '交易量', '持仓分析', '热门代币', '新池子', '链上行情', or any request to search, analyze, or get data for onchain tokens (especially Meme coins) across DEXes. This skill connects to OKX Onchain OS. Do NOT use for CEX perpetual swaps (h-v1-perp-market) or automated sniping (h-v2-meme-sniper)."
license: MIT
metadata:
  author: h-wallet
  version: "2.0.0"
  homepage: "https://github.com/h-wallet"
  agent:
    requires:
      bins: ["h-wallet"]
    install:
      - id: npm
        kind: node
        package: "@h-wallet/trade-cli@2.0.0"
        bins: ["h-wallet"]
        label: "Install H Wallet CLI (npm)"
---

# H Wallet Meme 币市场数据 (Onchain Market)

链上代币搜索、Meme 币趋势分析、交易量与市值深度解析、持有人集群分析。基于 OKX Onchain OS 的 `okx-dex-token` 和 `okx-dex-market`。

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).

---

## Skill Routing

| User intent | Route to skill |
|---|---|
| CEX Perpetual swap prices | `h-v1-perp-market` |
| Agentic Wallet creation, balances | `h-v2-agentic-wallet` |
| Auto snipe Meme coins | `h-v2-meme-sniper` |
| Onchain token search, Meme coin analysis | **This skill** |

---

## Design Philosophy

> **核心理念**：不只看涨幅，深度挖掘交易量与市值的规律。

1. **Meme 优先**：默认隐藏 BTC 等主流币，专注 Solana、Base、X Layer 等链上的高波动 Meme 币。
2. **多维分析**：除了价格，必须提供 24h 交易量、流动性池深度、持有人数量和前十持仓占比。
3. **聪明钱追踪**：分析该代币的 Top 交易者盈亏情况。

---

## Command Index (4 commands)

### Discovery & Search

| Command | Type | Description |
|---|---|---|
| `meme trending` | READ | Get trending Meme coins across networks |
| `meme search --query <q>` | READ | Search for a token by name, symbol, or contract |

### Deep Analysis

| Command | Type | Description |
|---|---|---|
| `meme analyze --token <addr>` | READ | Comprehensive analysis (Price, Vol, MC, Liquidity) |
| `meme holders --token <addr>` | READ | Holder concentration and cluster analysis |

---

## Detailed Command Reference

### meme trending — 热门 Meme 币发现

```bash
h-wallet meme trending [--network <net>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--network` | No | all | Filter by network (e.g. `solana`, `base`) |
| `--limit` | No | `10` | Max results |

**Response Fields:**
- `tokenAddress`: Contract address
- `symbol`: Token symbol
- `priceUsd`: Current price
- `volume24h`: 24h trading volume
- `marketCap`: Fully diluted valuation (FDV)
- `liquidity`: Total liquidity in DEX pools

---

### meme analyze — 深度代币分析

```bash
h-wallet meme analyze --token <address> [--network <net>] [--json]
```

Provides a deep dive into a specific Meme coin.

**Analysis Focus:**
1. **Volume to Market Cap Ratio (Vol/MC)**: High ratio (>0.5) indicates high activity/turnover.
2. **Liquidity to Market Cap Ratio**: Low ratio (<0.05) indicates high slippage risk.
3. **Age**: Time since pool creation.

---

### meme holders — 持有人分析

```bash
h-wallet meme holders --token <address> [--network <net>] [--json]
```

Returns holder concentration metrics to identify rug-pull risks.

**Response Fields:**
- `totalHolders`: Total number of addresses holding the token
- `top10Percentage`: Percentage of supply held by top 10 wallets
- `creatorBalance`: Percentage held by token creator
- `isBundled`: Boolean indicating if early buyers are clustered/bundled (high risk)

---

## Operation Flow

### Step 1 — User Intent

- "找几个最近火的土狗" -> `meme trending --network solana`
- "帮我分析一下这个代币 0x..." -> `meme analyze --token 0x...`
- "看看这个币的持仓集中度" -> `meme holders --token 0x...`

### Step 2 — Analytical Output

When presenting `meme analyze` results, structure the response to highlight the user's preferences:
1. **基础信息**：价格、网络、合约地址
2. **核心指标（重点）**：交易量 (Volume)、市值 (Market Cap)、Vol/MC 比例
3. **风险评估**：流动性深度、持仓集中度 (Top 10 占比)
4. **结论建议**：基于上述数据的客观评价（例如："交易量极高但流动性极低，存在砸盘风险"）

---

## MCP Tool Reference (Onchain OS)

| CLI Command | MCP Tool | OKX Onchain OS Skill |
|---|---|---|
| `meme trending` | `dex_get_trending_tokens` | `okx-dex-token` |
| `meme search` | `dex_search_token` | `okx-dex-token` |
| `meme analyze` | `dex_get_token_metrics` | `okx-dex-token` |
| `meme holders` | `dex_get_holder_analysis` | `okx-dex-token` |
