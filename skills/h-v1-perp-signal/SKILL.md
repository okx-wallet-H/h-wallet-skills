---
name: h-v1-perp-signal
description: "Use this skill when the user asks about 'smart money', 'top traders', 'trader leaderboard', 'trader positions', 'trader PnL', 'consensus signal', 'signal history', 'who is trading', 'recommend traders', 'copy trade', 'follow trader', 'capital flow', 'position conviction', '聪明钱', '牛人榜', '交易员排行', '交易员持仓', '交易员收益', '共识信号', '信号历史', '谁在交易', '推荐交易员', '跟单', '资金流向', '仓位强度', '行情信号', '交易员信号', or any request to view trader rankings, analyze smart money positions, check consensus signals, or track trader behavior on perpetual swaps. Requires API credentials. Do NOT use for market prices (h-v1-perp-market), placing orders (h-v1-perp-trade), or bots (h-v1-perp-grid / h-v1-perp-dca)."
license: MIT
metadata:
  author: h-wallet
  version: "1.0.0"
  homepage: "https://github.com/h-wallet"
  agent:
    requires:
      bins: ["h-wallet"]
    install:
      - id: npm
        kind: node
        package: "@h-wallet/trade-cli@1.0.0"
        bins: ["h-wallet"]
        label: "Install H Wallet CLI (npm)"
---

# H Wallet 交易员信号与聪明钱分析

交易员排行榜、持仓追踪、聚合共识信号和信号历史趋势分析。**需要 API 凭证。**

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

---

## Skill Routing

| User intent | Route to skill |
|---|---|
| Account balance, margin, transfers | `h-v1-wallet-auth` |
| Market data, prices, candles, funding rate | `h-v1-perp-market` |
| Place / cancel orders, set leverage | `h-v1-perp-trade` |
| Grid bot strategy | `h-v1-perp-grid` |
| DCA / Martingale strategy | `h-v1-perp-dca` |
| Smart money, trader signals, leaderboard | **This skill** |

---

## Command Index (5 commands, all READ-only)

### Trader Data

| Command | Type | Auth | Description |
|---|---|---|---|
| `signal traders` | READ | Required | List/filter traders from leaderboard |
| `signal trader --authorId <id>` | READ | Required | Trader full portrait (profile + positions + trades) |
| `signal overview` | READ | Required | Multi-currency smart money overview |

### Signal Data

| Command | Type | Auth | Description |
|---|---|---|---|
| `signal consensus --instId <id>` | READ | Required | Single-currency aggregated consensus signal |
| `signal history --instId <id>` | READ | Required | Signal history timeline for trend analysis |

---

## Detailed Command Reference

### signal traders — 交易员排行榜

```bash
h-wallet signal traders [--sortType <type>] [--period <d>] [--pnl <n>] [--winRatio <r>] [--maxRetreat <r>] [--asset <n>] [--limit <n>] [--json]
```

#### Parameters

| Param | Required | Default | Description |
|---|---|---|---|
| `--sortType` | No | `pnl` | Sort: `pnl`, `pnl_ratio` |
| `--period` | No | all | Time window: `3`, `7`, `30`, `90` (days) |
| `--pnl` | No | — | Min PnL (USD) |
| `--winRatio` | No | — | Min win ratio (e.g. `0.8` = 80%) |
| `--maxRetreat` | No | — | Max drawdown (e.g. `0.1` = 10%) |
| `--asset` | No | — | Min total asset (USD) |
| `--limit` | No | `20` | Max results (max 100) |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `authorId` | String | Trader unique ID |
| `nickName` | String | Display name |
| `pnl` | String | Absolute PnL (USD) |
| `pnlRatio` | String | PnL ratio |
| `winRatio` | String | Win ratio |
| `maxRetreat` | String | Max drawdown |
| `asset` | String | Total asset (USD) |
| `onboardDuration` | String | Onboard days |

#### Trader Eligibility Criteria

Traders on the leaderboard must meet all of:
- Public performance status
- Assets >= 10,000 USD
- PnL >= 1,000 USD (for corresponding period)
- Last trade within 14 days
- KYC fully verified

---

### signal trader — 交易员详情（复合查询）

```bash
h-wallet signal trader --authorId <id> [--period <d>] [--instCcy <ccy>] [--tradeLimit <n>] [--json]
```

Aggregates three data sources in parallel:
1. **Profile**: leaderboard stats for this trader
2. **Current positions**: open positions with leverage, entry price, PnL
3. **Trade records**: recent order history

| Param | Required | Default | Description |
|---|---|---|---|
| `--authorId` | Yes | — | Trader's unique author ID |
| `--period` | No | all | Performance period: `3`, `7`, `30`, `90` (days) |
| `--instCcy` | No | — | Filter positions/trades by currency (e.g. `BTC`) |
| `--tradeLimit` | No | `10` | Max trade records to return |

---

### signal overview — 多币种聪明钱总览

```bash
h-wallet signal overview [--ts <ms>] [--instCcyList <ccys>] [--topInstruments <n>] [--json]
```

Returns aggregated signal snapshots for top currencies, ranked by tradersWithPosition.

| Param | Required | Default | Description |
|---|---|---|---|
| `--ts` | Recommended | — | Snapshot timestamp (ms UTC). Use `$(date +%s)000` for latest. |
| `--instCcyList` | No | — | Comma-separated currencies (e.g. `BTC,ETH,SOL`) |
| `--topInstruments` | No | `20` | Number of top instruments to return |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Full instrument name (e.g. `BTC-USDT-SWAP`) |
| `longRatio` | String | Long ratio, decimal in [0, 1] |
| `weightedLongRatio` | String | Long ratio weighted by notional USD |
| `tradersWithPosition` | Integer | Traders holding a position on this instrument |
| `netNotionalUsdt` | String | Net notional = long − short |
| `vs24h` | String | Change vs 24h ago (positive = more long now) |
| `ts` | Long | Snapshot time (UTC ms) |

---

### signal consensus — 单币种共识信号

```bash
h-wallet signal consensus --instId BTC-USDT-SWAP [--ts <ms>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | — | Full instrument name (e.g. `BTC-USDT-SWAP`) |
| `--ts` | Recommended | — | Snapshot timestamp (ms UTC) |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument name |
| `longRatio` | String | Long ratio |
| `weightedLongRatio` | String | Weighted long ratio |
| `tradersWithPosition` | Integer | Traders with position |
| `netNotionalUsdt` | String | Net notional (long - short) |
| `totalNotionalUsdt` | String | Total notional (long + short) |
| `ts` | Long | Timestamp (UTC ms) |

---

### signal history — 信号历史时间线

```bash
h-wallet signal history --instId BTC-USDT-SWAP [--ts <ms>] [--granularity <1h|1d>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | — | Full instrument name |
| `--ts` | Recommended | — | Snapshot timestamp (ms UTC) |
| `--granularity` | No | `1h` | Time granularity: `1h`, `1d` |
| `--limit` | No | `24` | Number of data points (range 1-500) |

#### Response Fields (per item)

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument name |
| `longRatio` | String | Long ratio at this time bucket |
| `weightedLongRatio` | String | Weighted long ratio |
| `tradersWithPosition` | Integer | Traders holding position |
| `netNotionalUsdt` | String | Net notional |
| `totalNotionalUsdt` | String | Total notional |
| `ts` | Long | Time bucket timestamp (UTC ms) |
| `tradersQualified` | Integer | Traders passing all filters |

---

## Operation Flow

### Step 0 — Credential & Profile Check

Before any command: run `h-wallet config show --json`. Always use `--profile live` silently.

### Step 1 — Identify intent

| User says | Command |
|---|---|
| "推荐交易员" / "top traders" | `signal traders --sortType pnl --period 7 --limit 10` |
| "看看某个交易员" / "trader detail" | `signal trader --authorId <id>` |
| "BTC 聪明钱信号" / "BTC smart money" | `signal consensus --instId BTC-USDT-SWAP --ts $(date +%s)000` |
| "聪明钱总览" / "overview" | `signal overview --ts $(date +%s)000` |
| "信号趋势" / "signal trend" | `signal history --instId BTC-USDT-SWAP --granularity 1h --limit 48` |

### Step 2 — Execute and present

All commands are READ-only — no confirmation needed. Always pass `--json` and render results as Markdown tables.

---

## Signal Interpretation Guide

| longRatio | Interpretation | Suggested Action |
|---|---|---|
| > 0.7 | Strong bullish consensus | Consider long positions |
| 0.4 - 0.7 | Neutral / mixed | Wait for clearer signal |
| < 0.4 | Strong bearish consensus | Consider short positions |

| vs24h | Interpretation |
|---|---|
| > +0.1 | Rapidly shifting to long (bullish momentum) |
| -0.1 to +0.1 | Stable sentiment |
| < -0.1 | Rapidly shifting to short (bearish momentum) |

---

## Display Rules

1. **信号强度可视化**：用进度条或颜色标注多空比强度。
2. **交易员筛选**：默认展示 7 天内高胜率（>70%）、低回撤（<15%）的交易员。
3. **趋势分析**：信号历史数据应以时间序列图表形式展示，突出拐点。

---

## MCP Tool Reference

| CLI Command | MCP Tool | OKX API Endpoint |
|---|---|---|
| `signal traders` | `smartmoney_get_traders` | OKX Smart Money Leaderboard API |
| `signal trader` | `smartmoney_get_trader_detail` | OKX Smart Money Trader Detail (composite) |
| `signal overview` | `smartmoney_get_overview` | OKX Smart Money Overview API |
| `signal consensus` | `smartmoney_get_signal` | OKX Smart Money Signal API |
| `signal history` | `smartmoney_get_signal_history` | OKX Smart Money Signal History API |
