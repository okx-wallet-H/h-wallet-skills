---
name: h-v2-meme-market
description: "Use this skill when the user asks about 'meme coin', 'trending tokens', 'hot tokens', 'token analysis', 'token holders', 'liquidity', 'market cap', 'volume', 'new token', 'dex token', 'onchain token', 'pump', 'rug pull check', 'token info', 'Meme币', '热门代币', '新币', '链上代币', '代币分析', '持有人', '流动性', '市值', '交易量', '土狗', or any request to discover, search, analyze, or evaluate onchain tokens (especially meme coins) across DEXes. Covers trending discovery, deep token analysis, holder distribution, and liquidity assessment. Do NOT use for CEX market data (h-v1-perp-market), actual trading/sniping (h-v2-meme-sniper), or security scanning (h-v2-security-guard)."
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
        label: "Install H Wallet CLI v2 (npm)"
---

# H Wallet Meme 市场数据 (链上代币分析)

Onchain meme token market intelligence powered by OKX Onchain OS DEX aggregator. Covers trending token discovery, deep fundamental analysis (volume, market cap, liquidity, age), holder distribution analysis, and real-time price feeds across 30+ chains and all major DEXes.

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

## Prerequisites

```bash
npm install -g @h-wallet/trade-cli
# Meme market commands are PUBLIC — no API key required for read operations
```

> **Note**: All meme market commands are READ-only and do not require authentication.

## Skill Routing

| Need | Skill |
|---|---|
| CEX market data (K-line, funding rate) | `h-v1-perp-market` |
| Onchain wallet management | `h-v2-agentic-wallet` |
| Actual meme token buying/selling | `h-v2-meme-sniper` |
| Token security scanning | `h-v2-security-guard` |
| Strategy orchestration | `h-v2-smart-switch` |
| **Meme token discovery & analysis** | **This skill** |

## Design Philosophy

> **核心理念**：Meme 优先，数据驱动决策。

1. **交易量为王**：Vol/MC 比率是判断 Meme 币活跃度的第一指标。
2. **流动性安全**：Liq/MC > 5% 才考虑入场，防止无法退出。
3. **持仓集中度**：Top10 持有人 > 50% 是高风险信号。
4. **新币优先**：< 24h 的新币有最大涨幅潜力，但也最危险。
5. **多链覆盖**：不局限于单链，覆盖 Solana、Base、BSC、ETH 等热门 Meme 链。
6. **安全联动**：发现目标后自动调用 `h-v2-security-guard` 进行风险扫描。

## Command Index (8 commands)

### Token Discovery (3 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 1 | `h-wallet meme trending` | READ | No | Get trending/hot meme tokens across chains |
| 2 | `h-wallet meme new` | READ | No | Get newly launched tokens (< 24h) |
| 3 | `h-wallet meme search` | READ | No | Search tokens by name/symbol/contract |

### Token Analysis (3 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 4 | `h-wallet meme analyze` | READ | No | Deep analysis of a specific token |
| 5 | `h-wallet meme holders` | READ | No | Holder distribution analysis |
| 6 | `h-wallet meme liquidity` | READ | No | Liquidity pool analysis |

### Price & Chart (2 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 7 | `h-wallet meme price` | READ | No | Real-time price and 24h change |
| 8 | `h-wallet meme chart` | READ | No | Price history / OHLCV data |

## CLI Command Reference

### meme trending — 热门 Meme 代币

```bash
h-wallet meme trending [--chain <chainId>] [--period <period>] [--sort <field>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--chain` | No | all | Filter by chain (196, 1, 56, 501, 8453) |
| `--period` | No | `24h` | Time window: `1h`, `6h`, `24h`, `7d` |
| `--sort` | No | `volume` | Sort by: `volume`, `marketCap`, `priceChange`, `txCount`, `holders` |
| `--limit` | No | `20` | Max results (1-100) |

#### Response Fields (array)

| Field | Type | Description |
|---|---|---|
| `name` | String | Token name |
| `symbol` | String | Token symbol |
| `contractAddress` | String | Contract address |
| `chain` | String | Chain name |
| `chainId` | Integer | Chain ID |
| `price` | String | Current price (USD) |
| `priceChange24h` | String | 24h price change (%) |
| `volume24h` | String | 24h trading volume (USD) |
| `marketCap` | String | Market cap (USD) |
| `liquidity` | String | Total liquidity (USD) |
| `holders` | Integer | Number of holders |
| `txCount24h` | Integer | 24h transaction count |
| `age` | String | Token age (e.g. "2h", "3d") |
| `volMcRatio` | String | Volume/MarketCap ratio |

#### Display Priority

1. Sort by `volume24h` descending (default)
2. Highlight tokens with `volMcRatio > 0.5` (extremely active)
3. Flag tokens with `age < 24h` as "新币"
4. Flag tokens with `holders < 100` as "早期"

---

### meme new — 新上线代币

```bash
h-wallet meme new [--chain <chainId>] [--minLiquidity <n>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--chain` | No | all | Filter by chain |
| `--minLiquidity` | No | `1000` | Minimum liquidity in USD (filter scams) |
| `--limit` | No | `20` | Max results |

Returns tokens launched in the last 24 hours, sorted by creation time (newest first).

#### Additional Fields (beyond trending)

| Field | Type | Description |
|---|---|---|
| `createdAt` | String | Token creation timestamp |
| `initialLiquidity` | String | Liquidity at launch |
| `currentLiquidity` | String | Current liquidity |
| `liquidityChange` | String | Liquidity change since launch (%) |
| `buyTxCount` | Integer | Number of buy transactions |
| `sellTxCount` | Integer | Number of sell transactions |
| `buySellRatio` | String | Buy/Sell ratio (> 1 = more buying) |

---

### meme search — 搜索代币

```bash
h-wallet meme search --query <text> [--chain <chainId>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--query` | Yes | - | Search by name, symbol, or contract address |
| `--chain` | No | all | Filter by chain |

> If `--query` is a valid contract address (0x... or base58), performs exact match. Otherwise fuzzy search by name/symbol.

#### Response Fields (array)

| Field | Type | Description |
|---|---|---|
| `name` | String | Token name |
| `symbol` | String | Token symbol |
| `contractAddress` | String | Contract address |
| `chain` | String | Chain name |
| `price` | String | Current price |
| `volume24h` | String | 24h volume |
| `marketCap` | String | Market cap |
| `verified` | Boolean | Whether token is verified |

---

### meme analyze — 深度代币分析

```bash
h-wallet meme analyze --token <address> --chain <chainId> [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--token` | Yes | - | Token contract address |
| `--chain` | Yes | - | Chain ID |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `name` | String | Token name |
| `symbol` | String | Token symbol |
| `contractAddress` | String | Contract address |
| `chain` | String | Chain name |
| `price` | String | Current price (USD) |
| `priceChange1h` | String | 1h price change (%) |
| `priceChange24h` | String | 24h price change (%) |
| `priceChange7d` | String | 7d price change (%) |
| `ath` | String | All-time high price |
| `athDate` | String | ATH date |
| `volume24h` | String | 24h volume |
| `marketCap` | String | Market cap |
| `fdv` | String | Fully diluted valuation |
| `liquidity` | String | Total liquidity |
| `liquidityLocked` | Boolean | Whether liquidity is locked |
| `liquidityLockExpiry` | String | Lock expiry date (if locked) |
| `totalSupply` | String | Total supply |
| `circulatingSupply` | String | Circulating supply |
| `holders` | Integer | Number of holders |
| `holderGrowth24h` | String | Holder growth in 24h (%) |
| `txCount24h` | Integer | 24h transaction count |
| `uniqueBuyers24h` | Integer | Unique buyers in 24h |
| `uniqueSellers24h` | Integer | Unique sellers in 24h |
| `age` | String | Token age |
| `deployer` | String | Deployer address |
| `isVerified` | Boolean | Source code verified |
| `isRenounced` | Boolean | Ownership renounced |
| `taxBuy` | String | Buy tax (%) |
| `taxSell` | String | Sell tax (%) |
| `dexPairs` | Array | Trading pairs and DEX info |

#### Analysis Heuristics (自动评估)

| Metric | Good | Warning | Danger |
|---|---|---|---|
| Vol/MC ratio | > 0.3 | 0.05-0.3 | < 0.05 (dead) |
| Liq/MC ratio | > 5% | 2-5% | < 2% (exit risk) |
| Top10 holders | < 30% | 30-50% | > 50% (whale risk) |
| Buy/Sell ratio | > 1.2 | 0.8-1.2 | < 0.8 (dumping) |
| Holder growth 24h | > 10% | 0-10% | < 0% (declining) |
| Age | > 7d | 1-7d | < 1d (very early) |
| Buy tax | 0% | 1-5% | > 5% (scam risk) |
| Sell tax | 0% | 1-5% | > 5% (honeypot risk) |
| Liquidity locked | Yes | Partial | No (rug risk) |
| Ownership renounced | Yes | - | No (centralized) |

---

### meme holders — 持有人分析

```bash
h-wallet meme holders --token <address> --chain <chainId> [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--token` | Yes | - | Token contract address |
| `--chain` | Yes | - | Chain ID |
| `--limit` | No | `20` | Number of top holders to show |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `totalHolders` | Integer | Total holder count |
| `top10Percentage` | String | Top 10 holders' share (%) |
| `top20Percentage` | String | Top 20 holders' share (%) |
| `holders` | Array | Top holder details |

#### Per-Holder Fields

| Field | Type | Description |
|---|---|---|
| `rank` | Integer | Holder rank |
| `address` | String | Holder address |
| `balance` | String | Token balance |
| `percentage` | String | Share of total supply (%) |
| `valueUsd` | String | USD value |
| `label` | String | Known label: `deployer`, `dex_pool`, `cex`, `whale`, `smart_money` |
| `lastActivity` | String | Last transaction time |
| `isBundled` | Boolean | Whether address is part of a bundled cluster |

#### Bundled Buyer Detection

If multiple top holders share similar:
- Creation time (within 1 block)
- Funding source (same parent wallet)
- Buy timing (within seconds)

Flag as "疑似关联地址 (Bundled)" — high manipulation risk.

---

### meme liquidity — 流动性分析

```bash
h-wallet meme liquidity --token <address> --chain <chainId> [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--token` | Yes | - | Token contract address |
| `--chain` | Yes | - | Chain ID |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `totalLiquidity` | String | Total liquidity (USD) |
| `liquidityMcRatio` | String | Liquidity/MarketCap ratio |
| `pools` | Array | Liquidity pool details |

#### Per-Pool Fields

| Field | Type | Description |
|---|---|---|
| `dex` | String | DEX name (Uniswap, Raydium, PancakeSwap, etc.) |
| `pairAddress` | String | Pool contract address |
| `token0` | String | Token 0 symbol |
| `token1` | String | Token 1 symbol |
| `reserve0` | String | Token 0 reserve |
| `reserve1` | String | Token 1 reserve |
| `liquidityUsd` | String | Pool liquidity (USD) |
| `volume24h` | String | Pool 24h volume |
| `fee` | String | Pool fee tier |
| `isLocked` | Boolean | LP tokens locked |
| `lockExpiry` | String | Lock expiry (if locked) |
| `lockPercentage` | String | Percentage of LP locked |

---

### meme price — 实时价格

```bash
h-wallet meme price --token <address> --chain <chainId> [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--token` | Yes | - | Token contract address |
| `--chain` | Yes | - | Chain ID |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `price` | String | Current price (USD) |
| `priceChange1h` | String | 1h change (%) |
| `priceChange24h` | String | 24h change (%) |
| `high24h` | String | 24h high |
| `low24h` | String | 24h low |
| `volume24h` | String | 24h volume |
| `lastUpdate` | String | Last price update time |

---

### meme chart — 价格历史

```bash
h-wallet meme chart --token <address> --chain <chainId> [--period <period>] [--interval <interval>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--token` | Yes | - | Token contract address |
| `--chain` | Yes | - | Chain ID |
| `--period` | No | `24h` | Time range: `1h`, `6h`, `24h`, `7d`, `30d` |
| `--interval` | No | auto | Candle interval: `1m`, `5m`, `15m`, `1h`, `4h`, `1d` |

#### Response Fields (array of candles)

| Field | Type | Description |
|---|---|---|
| `timestamp` | String | Candle open time |
| `open` | String | Open price |
| `high` | String | High price |
| `low` | String | Low price |
| `close` | String | Close price |
| `volume` | String | Volume |

---

## Quickstart

```bash
# View trending meme tokens (all chains)
h-wallet meme trending

# View trending on Solana only, sorted by price change
h-wallet meme trending --chain 501 --sort priceChange --period 1h

# View newly launched tokens with decent liquidity
h-wallet meme new --minLiquidity 5000

# Search for a specific token
h-wallet meme search --query "PEPE"

# Deep analysis of a token
h-wallet meme analyze --token 0x6982508145454Ce325dDbE47a25d4ec3d2311933 --chain 1

# Check holder distribution
h-wallet meme holders --token 0x6982508145454Ce325dDbE47a25d4ec3d2311933 --chain 1

# Check liquidity pools
h-wallet meme liquidity --token 0x6982508145454Ce325dDbE47a25d4ec3d2311933 --chain 1

# Get current price
h-wallet meme price --token 0x6982508145454Ce325dDbE47a25d4ec3d2311933 --chain 1

# Get price chart (1h candles, last 7 days)
h-wallet meme chart --token 0x6982508145454Ce325dDbE47a25d4ec3d2311933 --chain 1 --period 7d --interval 1h
```

## Cross-Skill Workflows

### Token Discovery → Analysis → Sniping Pipeline
> User: "帮我找几个有潜力的 Meme 币"

```
1. h-v2-meme-market    h-wallet meme trending --sort volume --period 6h --limit 10
   → Get top 10 trending tokens by volume

2. h-v2-meme-market    h-wallet meme analyze --token <top1> --chain <chain>
   → Deep analysis of top candidate

3. h-v2-security-guard h-wallet security scan --token <top1> --chain <chain>
   → Security check (honeypot, tax, etc.)

4. h-v2-meme-market    h-wallet meme holders --token <top1> --chain <chain>
   → Check holder concentration

5. [ANALYZE]           Score the token:
   - Vol/MC > 0.3? ✓
   - Liq/MC > 5%? ✓
   - Top10 < 30%? ✓
   - No honeypot? ✓
   - Ownership renounced? ✓
   → Score: 5/5 — High potential

6. [REPORT]            Present findings with recommendation:
   "推荐关注 $TOKEN:
   - 24h 交易量: $2.3M (Vol/MC = 0.45)
   - 流动性: $500K (Liq/MC = 9.8%)
   - 持有人: 2,341 (24h +15%)
   - 安全检查: 通过
   - 建议: 可以小仓位参与"

7. (if user wants to buy)
   → Hand off to h-v2-meme-sniper
```

### New Token Alert Monitoring
> User: "有什么刚上线的新币值得关注？"

```
1. h-v2-meme-market    h-wallet meme new --minLiquidity 5000 --limit 10
   → Get new tokens with minimum $5K liquidity

2. [FILTER]            Apply quality filters:
   - Liquidity > $5K
   - Buy/Sell ratio > 1.0
   - Holder count growing
   - No obvious scam signals

3. h-v2-security-guard h-wallet security scan --token <each> --chain <chain>
   → Batch security check

4. [REPORT]            Present filtered new tokens:
   "过去 24h 新上线的优质代币：
   | 代币 | 链 | 流动性 | 涨幅 | 安全 |
   |------|---|--------|------|------|
   | $A   | SOL | $50K | +120% | ✓ |
   | $B   | Base | $25K | +80% | ✓ |
   | $C   | BSC | $15K | +45% | ⚠️ |"
```

### Whale Movement Tracking
> User: "这个币的大户在干嘛？"

```
1. h-v2-meme-market    h-wallet meme holders --token <addr> --chain <chain> --limit 20
   → Get top 20 holders

2. [ANALYZE]           Check for:
   - Bundled addresses (manipulation risk)
   - Recent large sells by top holders
   - New whale accumulation
   - Deployer still holding?

3. h-v2-meme-market    h-wallet meme chart --token <addr> --chain <chain> --period 24h
   → Correlate price with holder activity

4. [REPORT]            "持有人分析：
   - Top10 占比: 35% (中等集中)
   - 部署者持仓: 5% (正常)
   - 疑似关联地址: 3 个 (占 8%)
   - 过去 24h: 2 个大户减持，3 个新鲸鱼买入
   - 结论: 筹码在分散化，积极信号"
```

### Comparative Analysis
> User: "对比一下 PEPE 和 DOGE 的链上数据"

```
1. h-v2-meme-market    h-wallet meme analyze --token <PEPE_addr> --chain 1
2. h-v2-meme-market    h-wallet meme analyze --token <DOGE_addr> --chain 1
3. [COMPARE]           Side-by-side comparison table:
   | 指标 | PEPE | DOGE |
   |------|------|------|
   | 市值 | $X | $Y |
   | 24h量 | ... | ... |
   | Vol/MC | ... | ... |
   | 持有人 | ... | ... |
   | 流动性 | ... | ... |
```

## Edge Cases

- **Contract address vs symbol**: If user provides symbol (e.g. "PEPE"), use `meme search` first to resolve contract address. Many tokens share the same symbol — always confirm with user which one
- **Multi-chain same token**: Same token may exist on multiple chains (e.g. PEPE on ETH and BSC). Always specify chain or ask user
- **Dead tokens**: Tokens with Vol/MC < 0.01 and no transactions in 24h are considered dead. Warn user
- **Honeypot tokens**: If `taxSell > 50%` or security scan fails, strongly warn user. Do NOT recommend buying
- **Unverified contracts**: Tokens without verified source code are higher risk. Flag in analysis
- **Price manipulation**: Tokens with < 5 holders or < $1K liquidity may have manipulated prices. Warn about unreliable data
- **Rate limits**: Public endpoints: 20 requests per second. Batch operations should respect this
- **Chain-specific addresses**: Solana tokens use base58 addresses, EVM tokens use 0x addresses. Validate format before querying
- **Stale data**: If `lastUpdate` is > 5 minutes old, warn user that data may be delayed
- **Token with same name**: Multiple tokens can have identical names/symbols. Always use contract address for precision

## Key Rules

1. **Never recommend buying without security check** — always suggest calling `h-v2-security-guard` first
2. **Vol/MC ratio is the primary filter** — dead tokens (< 0.05) should be flagged
3. **Always show risk warnings** for tokens with concerning metrics
4. **Bundled buyer detection** is critical — flag any suspicious holder clusters
5. **Multi-chain disambiguation** — always confirm which chain when token exists on multiple
6. **Liquidity lock status** is a key safety indicator — always highlight
7. **Contract address is the source of truth** — never rely on symbol alone

## Communication Guidelines

- Use "Meme 币" not "模因币" for natural Chinese
- Price changes: 涨用绿色/+，跌用红色/-
- Large numbers: use abbreviations ($2.3M, $500K)
- Always include chain name when showing token info
- For new users: "Vol/MC 就是交易量和市值的比值，越高说明这个币越活跃"
- Address display: shortened format `0x6982...1933`

### Parameter Display Names

| API Field | EN | ZH |
|---|---|---|
| `volume24h` | 24h Volume | 24h 交易量 |
| `marketCap` | Market Cap | 市值 |
| `liquidity` | Liquidity | 流动性 |
| `holders` | Holders | 持有人数 |
| `priceChange24h` | 24h Change | 24h 涨跌幅 |
| `volMcRatio` | Vol/MC | 量值比 |
| `top10Percentage` | Top10 Share | 前10持仓占比 |
| `buySellRatio` | Buy/Sell Ratio | 买卖比 |
| `taxBuy` | Buy Tax | 买入税 |
| `taxSell` | Sell Tax | 卖出税 |
| `liquidityLocked` | LP Locked | 流动性锁定 |
| `isRenounced` | Ownership Renounced | 所有权放弃 |
| `age` | Token Age | 代币年龄 |
| `fdv` | FDV | 完全稀释估值 |
| `circulatingSupply` | Circulating Supply | 流通量 |

## MCP Tool Reference

| CLI Command | MCP Tool | Onchain OS API |
|---|---|---|
| `meme trending` | `meme_get_trending` | `GET /api/v5/dex/token/trending` |
| `meme new` | `meme_get_new` | `GET /api/v5/dex/token/new-listings` |
| `meme search` | `meme_search` | `GET /api/v5/dex/token/search` |
| `meme analyze` | `meme_analyze_token` | `GET /api/v5/dex/token/detail` |
| `meme holders` | `meme_get_holders` | `GET /api/v5/dex/token/holder-distribution` |
| `meme liquidity` | `meme_get_liquidity` | `GET /api/v5/dex/token/liquidity-pools` |
| `meme price` | `meme_get_price` | `GET /api/v5/dex/token/price` |
| `meme chart` | `meme_get_chart` | `GET /api/v5/dex/token/historical-price` |
