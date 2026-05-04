---
name: h-v1-perp-signal
description: "Use this skill when the user asks about 'smart money', 'top traders', 'trader leaderboard', 'trader positions', 'trader PnL', 'consensus signal', 'signal history', 'who is trading', 'recommend traders', 'copy trade', 'follow trader', 'capital flow', 'position conviction', 'sentiment', 'fear greed', 'large position alerts', '聪明钱', '牛人榜', '交易员排行', '交易员持仓', '交易员收益', '共识信号', '信号历史', '谁在交易', '推荐交易员', '跟单', '资金流向', '仓位强度', '行情信号', '交易员信号', '市场情绪', '恐贪指数', '大户异动', or any request to view trader rankings, analyze smart money positions, check consensus signals, track capital flow, monitor sentiment, or track trader behavior on perpetual swaps. Requires API credentials. Do NOT use for market prices (h-v1-perp-market), placing orders (h-v1-perp-trade), or bots (h-v1-perp-grid / h-v1-perp-dca)."
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

Smart money analytics on H Wallet. Track top traders, view their positions and trade history, analyze multi-coin consensus signals, monitor capital flow, market sentiment, and large position alerts. **Requires API credentials.**

> **CRITICAL**: All signal data is **advisory only**. Never auto-execute trades based on signals. Always present analysis to the user and wait for their explicit decision before routing to `h-v1-perp-trade`.

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

## Prerequisites

```bash
npm install -g @h-wallet/trade-cli
h-wallet config init
```

## Credential & Profile Check

**Run before every authenticated command.** Same procedure as other H_v1 skills.

### Step A — Verify credentials

```bash
h-wallet config show --json
h-wallet auth status --json
```

First match wins: API Key mode → OAuth mode → pending → not logged in (load `h-v1-wallet-auth`).

### Step B — Confirm trading mode

Signal commands are READ-only but still require authentication. Apply mode per auth method.

| Auth method | Live | Demo |
|---|---|---|
| **API Key** | `--profile <live-profile>` | `--profile <demo-profile>` |
| **OAuth** | *(default)* | `--demo` |

**After every command**: append `[mode: live]` or `[mode: demo]`

## Skill Routing

| Need | Skill |
|---|---|
| Market data, prices, depth, funding rates | `h-v1-perp-market` |
| Account balance, positions, fees | `h-v1-wallet-auth` |
| Regular swap orders (place/cancel/amend) | `h-v1-perp-trade` |
| Grid bots | `h-v1-perp-grid` |
| DCA / Martingale bots | `h-v1-perp-dca` |
| **Smart money, trader signals, consensus** | **This skill** |

## Design Philosophy

> **核心理念**：聪明钱数据为交易决策提供方向性参考，但不自动执行交易。

1. **信号是参考，不是指令**：所有信号数据仅供分析，不自动触发交易。
2. **多维度验证**：结合交易员排行、共识信号、资金流向、情绪指数多维度确认方向。
3. **时间线追踪**：通过信号历史观察趋势变化，而非依赖单一时间点。
4. **与策略联动**：信号分析结果可作为 Grid/DCA 方向选择的参考输入。

## Command Index (8 commands, all READ-only)

### Trader Data

| # | Command | Type | Description |
|---|---|---|---|
| 1 | `h-wallet signal traders` | READ | Top trader leaderboard with filtering and sorting |
| 2 | `h-wallet signal trader` | READ | Single trader full profile (bio + positions + history) |
| 3 | `h-wallet signal overview` | READ | Multi-coin smart money overview (all instruments) |

### Signal Data

| # | Command | Type | Description |
|---|---|---|---|
| 4 | `h-wallet signal consensus` | READ | Single-coin aggregated consensus signal |
| 5 | `h-wallet signal history` | READ | Signal timeline for trend analysis |

### Extended Analytics

| # | Command | Type | Description |
|---|---|---|---|
| 6 | `h-wallet signal flow` | READ | Capital flow analysis (net inflow/outflow) |
| 7 | `h-wallet signal sentiment` | READ | Market sentiment index (fear/greed) |
| 8 | `h-wallet signal alerts` | READ | Notable position changes by top traders |

## CLI Command Reference

### signal traders — 交易员排行榜

```bash
h-wallet signal traders [--sortType <type>] [--period <d>] [--pnl <n>] [--winRatio <r>] [--maxRetreat <r>] [--asset <n>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--sortType` | No | `pnl` | Sort: `pnl`, `pnl_ratio`, `winRate`, `assets`, `followers` |
| `--period` | No | `30` | Time window: `3`, `7`, `30`, `90`, `180` (days) |
| `--pnl` | No | - | Min PnL (USD) |
| `--winRatio` | No | - | Min win ratio (e.g. `0.8` = 80%) |
| `--maxRetreat` | No | - | Max drawdown (e.g. `0.1` = 10%) |
| `--asset` | No | - | Min total asset (USD) |
| `--limit` | No | `20` | Max results (max 100) |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `authorId` | String | Trader unique ID |
| `nickName` | String | Display name |
| `pnl` | String | Absolute PnL (USD) |
| `pnlRatio` | String | PnL ratio |
| `winRatio` | String | Win ratio (0-1) |
| `maxRetreat` | String | Max drawdown |
| `asset` | String | Total asset (USD) |
| `onboardDuration` | String | Onboard days |
| `followers` | String | Number of followers |
| `tradingDays` | String | Active trading days in period |

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
| `--authorId` | Yes | - | Trader's unique author ID |
| `--period` | No | `30` | Performance period: `3`, `7`, `30`, `90` (days) |
| `--instCcy` | No | - | Filter positions/trades by currency (e.g. `BTC`) |
| `--tradeLimit` | No | `10` | Max trade records to return |

#### Profile Section Response

| Field | Type | Description |
|---|---|---|
| `authorId` | String | Trader unique ID |
| `nickName` | String | Display name |
| `bio` | String | Trader bio/description |
| `pnl` | String | Period PnL |
| `pnlRatio` | String | Period ROI |
| `winRatio` | String | Win rate |
| `maxRetreat` | String | Max drawdown |
| `avgHoldTime` | String | Average position hold time |
| `preferredPairs` | Array | Most traded instruments |

#### Current Positions Section

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument |
| `posSide` | String | `long` or `short` |
| `avgPx` | String | Entry price |
| `upl` | String | Unrealized PnL |
| `uplRatio` | String | UPL ratio |
| `lever` | String | Leverage used |
| `openTime` | String | Position open timestamp |
| `sz` | String | Position size |

#### Recent Trades Section

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument |
| `side` | String | `buy` or `sell` |
| `posSide` | String | `long` or `short` |
| `px` | String | Trade price |
| `sz` | String | Trade size |
| `pnl` | String | Realized PnL |
| `time` | String | Trade timestamp |

---

### signal overview — 多币种聪明钱总览

```bash
h-wallet signal overview [--ts <ms>] [--instCcyList <ccys>] [--topInstruments <n>] [--json]
```

Returns aggregated signal snapshots for top currencies, ranked by tradersWithPosition.

| Param | Required | Default | Description |
|---|---|---|---|
| `--ts` | Recommended | now | Snapshot timestamp (ms UTC). Use `$(date +%s)000` for latest |
| `--instCcyList` | No | - | Comma-separated currencies (e.g. `BTC,ETH,SOL`) |
| `--topInstruments` | No | `20` | Number of top instruments to return |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Full instrument name (e.g. `BTC-USDT-SWAP`) |
| `longRatio` | String | Long ratio, decimal in [0, 1] |
| `weightedLongRatio` | String | Long ratio weighted by notional USD |
| `tradersWithPosition` | Integer | Traders holding a position on this instrument |
| `netNotionalUsdt` | String | Net notional = long − short (USDT) |
| `vs24h` | String | Change vs 24h ago (positive = more long now) |
| `vs7d` | String | Change vs 7d ago |
| `ts` | Long | Snapshot time (UTC ms) |

---

### signal consensus — 单币种共识信号

```bash
h-wallet signal consensus --instId <id> [--ts <ms>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Full instrument name (e.g. `BTC-USDT-SWAP`) |
| `--ts` | Recommended | now | Snapshot timestamp (ms UTC) |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument name |
| `longRatio` | String | Long ratio (0-1) |
| `weightedLongRatio` | String | Weighted long ratio (by position size) |
| `tradersWithPosition` | Integer | Traders with position |
| `netNotionalUsdt` | String | Net notional (long - short) |
| `totalNotionalUsdt` | String | Total notional (long + short) |
| `tradersLong` | Integer | Number of traders long |
| `tradersShort` | Integer | Number of traders short |
| `topLongTraders` | Array | Top traders currently long (authorId, nickname, sz) |
| `topShortTraders` | Array | Top traders currently short (authorId, nickname, sz) |
| `vs24h` | String | 24h change in long ratio |
| `ts` | Long | Timestamp (UTC ms) |

#### Signal Interpretation Guide

| longRatio | weightedLongRatio | vs24h | Interpretation |
|---|---|---|---|
| > 0.65 | > 0.65 | > 0 | **Strong bullish consensus** — smart money heavily long and increasing |
| > 0.55 | > 0.55 | > 0 | **Moderate bullish** — leaning long |
| 0.45–0.55 | 0.45–0.55 | ±0.05 | **Neutral/mixed** — no clear direction |
| < 0.45 | < 0.45 | < 0 | **Moderate bearish** — leaning short |
| < 0.35 | < 0.35 | < 0 | **Strong bearish consensus** — smart money heavily short and increasing |

> **IMPORTANT**: Consensus signals are **advisory only**. Never auto-execute trades based on signals.

---

### signal history — 信号历史时间线

```bash
h-wallet signal history --instId <id> [--ts <ms>] [--granularity <1h|4h|1d>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Full instrument name |
| `--ts` | Recommended | now | Snapshot timestamp (ms UTC) |
| `--granularity` | No | `1h` | Time granularity: `1h`, `4h`, `1d` |
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

Use this for trend analysis: is smart money increasing or decreasing their long exposure over time?

---

### signal flow — 资金流向分析

```bash
h-wallet signal flow [--instId <id>] [--period <1h|4h|1d|7d>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | No | all | Specific instrument or all |
| `--period` | No | `1d` | Analysis period |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument |
| `netInflow` | String | Net capital inflow (USDT, positive = inflow) |
| `longInflow` | String | Capital flowing into long positions |
| `shortInflow` | String | Capital flowing into short positions |
| `vs24h` | String | Change vs 24h ago |
| `topInflows` | Array | Top instruments by inflow |

---

### signal sentiment — 市场情绪指数

```bash
h-wallet signal sentiment [--json]
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `index` | String | Fear/Greed index (0-100) |
| `label` | String | `extreme_fear`, `fear`, `neutral`, `greed`, `extreme_greed` |
| `vs24h` | String | Change vs 24h ago |
| `btcDominance` | String | BTC dominance percentage |
| `altSeasonIndex` | String | Alt season index (0-100) |
| `fundingRateAvg` | String | Average funding rate across top instruments |

#### Sentiment Interpretation

| Index | Label | Trading Implication |
|---|---|---|
| 0–20 | Extreme Fear | Potential bottom — contrarian buy signal |
| 20–40 | Fear | Cautious — may be accumulation zone |
| 40–60 | Neutral | No strong signal |
| 60–80 | Greed | Caution — may be distribution zone |
| 80–100 | Extreme Greed | Potential top — contrarian sell signal |

---

### signal alerts — 大户异动预警

```bash
h-wallet signal alerts [--instId <id>] [--minSize <n>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | No | all | Filter by instrument |
| `--minSize` | No | `100000` | Minimum position change (USDT) |
| `--limit` | No | `20` | Max results |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `authorId` | String | Trader ID |
| `nickName` | String | Trader name |
| `instId` | String | Instrument |
| `action` | String | `open_long`, `open_short`, `close_long`, `close_short`, `increase`, `decrease` |
| `sz` | String | Position change size (USDT) |
| `price` | String | Price at action time |
| `ts` | String | Timestamp |
| `pnl` | String | Realized PnL (for close actions) |

---

## Quickstart

```bash
# View top traders ranked by PnL (30 days)
h-wallet signal traders --sortType pnl --period 30 --limit 10

# View top traders with high win rate and low drawdown
h-wallet signal traders --winRatio 0.7 --maxRetreat 0.15 --period 30

# View a specific trader's full profile
h-wallet signal trader --authorId 12345678

# Multi-coin smart money overview
h-wallet signal overview --ts $(date +%s)000

# BTC consensus signal
h-wallet signal consensus --instId BTC-USDT-SWAP --ts $(date +%s)000

# BTC signal history (1h intervals, last 48 points)
h-wallet signal history --instId BTC-USDT-SWAP --granularity 1h --limit 48

# Capital flow analysis
h-wallet signal flow --instId BTC-USDT-SWAP --period 1d

# Market sentiment
h-wallet signal sentiment

# Large position change alerts (> 500k USDT)
h-wallet signal alerts --instId BTC-USDT-SWAP --minSize 500000
```

## Cross-Skill Workflows

### Signal-Driven Trade Decision
> User: "看看 BTC 的聪明钱信号，如果看多就帮我开多"

```
1. h-v1-perp-signal    h-wallet signal consensus --instId BTC-USDT-SWAP --ts $(date +%s)000
   → Get longRatio, weightedLongRatio, vs24h

2. h-v1-perp-signal    h-wallet signal history --instId BTC-USDT-SWAP --granularity 4h --limit 12
   → Check trend: is long ratio increasing or decreasing?

3. h-v1-perp-signal    h-wallet signal sentiment
   → Check overall market sentiment

4. [ANALYZE]           Multi-dimensional signal analysis:
   - Consensus: longRatio=0.72, weighted=0.68, vs24h=+0.05 → Bullish
   - Trend: increasing over last 48h → Confirmed
   - Sentiment: Greed (72) → Caution (contrarian risk)
   
5. [REPORT]            Present analysis to user:
   "BTC 聪明钱信号分析：
    - 共识: 72% 做多 (加权 68%)，24h 增加 5% → 看多
    - 趋势: 过去 48h 持续增加 → 确认
    - 情绪: 贪婪指数 72 → 注意追高风险
    综合判断: 偏多，但情绪偏贪婪需谨慎。
    是否开多？"

6. [WAIT]              Wait for user confirmation — NEVER auto-execute

7. h-v1-perp-trade     (if user confirms) → execute trade via h-v1-perp-trade
```

### Trader Position Tracking
> User: "看看排名第一的交易员在做什么"

```
1. h-v1-perp-signal    h-wallet signal traders --sortType pnl --period 30 --limit 1
   → Get top trader's authorId

2. h-v1-perp-signal    h-wallet signal trader --authorId <id>
   → Full profile: current positions, recent trades, performance

3. [REPORT]            Present trader analysis:
   - Current positions (instruments, direction, size, PnL)
   - Recent trade patterns (frequency, preferred pairs, avg hold time)
   - Win rate and risk metrics
```

### Signal + Grid Direction
> User: "根据信号帮我选网格方向"

```
1. h-v1-perp-signal    h-wallet signal consensus --instId BTC-USDT-SWAP --ts $(date +%s)000
2. h-v1-perp-signal    h-wallet signal flow --instId BTC-USDT-SWAP
3. [ANALYZE]           Determine direction:
   - Strong bullish (longRatio > 0.65) → suggest `long` grid
   - Strong bearish (longRatio < 0.35) → suggest `short` grid
   - Neutral/mixed → suggest `neutral` grid
4. [REPORT]            Present recommendation with reasoning
5. [WAIT]              Wait for user approval
6. h-v1-perp-grid      Create grid with recommended direction
```

### Alert-Driven Analysis
> User: "有没有大户异动？"

```
1. h-v1-perp-signal    h-wallet signal alerts --minSize 500000 --limit 10
   → Get recent large position changes

2. [ANALYZE]           Pattern recognition:
   - Multiple top traders opening long on same instrument → bullish signal
   - Top trader closing large position → potential reversal
   - Cluster of alerts in short time → significant event

3. [REPORT]            Present findings with context
```

## Operation Flow

### Step 0 — Credential & Profile Check

Before any command: verify credentials (Step A) and trading mode (Step B).

### Step 1 — Identify intent

| User says | Command |
|---|---|
| "推荐交易员" / "top traders" | `signal traders --sortType pnl --period 30 --limit 10` |
| "高胜率交易员" | `signal traders --winRatio 0.7 --maxRetreat 0.15 --period 30` |
| "看看某个交易员" | `signal trader --authorId <id>` |
| "BTC 聪明钱信号" | `signal consensus --instId BTC-USDT-SWAP --ts $(date +%s)000` |
| "聪明钱总览" | `signal overview --ts $(date +%s)000` |
| "信号趋势" | `signal history --instId BTC-USDT-SWAP --granularity 1h --limit 48` |
| "资金流向" | `signal flow --instId BTC-USDT-SWAP` |
| "市场情绪" | `signal sentiment` |
| "大户异动" | `signal alerts --minSize 500000` |

### Step 2 — Execute and present

All commands are READ-only — no confirmation needed. Always pass `--json` and render results as readable Markdown tables with interpretation.

## Edge Cases

- **Signal data lag**: Smart money data may have 5-15 minute delay. Always mention this in analysis
- **Low trader count**: If `tradersWithPosition` < 5, signal reliability is low — warn user
- **Contrarian signals**: When sentiment is extreme (> 80 greed or < 20 fear), consider contrarian interpretation
- **Signal divergence**: When `longRatio` and `weightedLongRatio` diverge significantly (> 0.15 difference), large traders may be positioned differently from small traders — highlight this
- **Historical accuracy**: Signal history is for trend analysis, not prediction. Past consensus does not guarantee future direction
- **Rate limit**: 10 requests per 2 seconds per UID for signal endpoints
- **Timestamp**: Always pass `--ts $(date +%s)000` for latest data. Omitting may return cached/stale data
- **authorId**: Always obtain from `signal traders` output — never fabricate

## Key Rules

1. **Signals are advisory ONLY** — never auto-execute trades based on signals
2. **Always present multi-dimensional analysis** — don't rely on a single metric
3. **Highlight uncertainty** — when signals are mixed or trader count is low
4. **Combine with market data** — cross-reference with `h-v1-perp-market` for price context
5. **Time context matters** — always check `vs24h` and trend direction, not just current value
6. **Contrarian awareness** — extreme sentiment often precedes reversals

## Communication Guidelines

- Present signals in clear, actionable format with visual indicators
- Use percentage and direction arrows for quick scanning
- Always include confidence level (high/medium/low based on trader count and signal strength)
- Explain contrarian risks when sentiment is extreme
- Show both raw data and interpretation

### Signal Strength Display

```
BTC-USDT-SWAP 聪明钱共识
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
多空比: ████████░░ 72% 做多
加权比: ███████░░░ 68% 做多
净头寸: +$2.3M (24h: +5%)
交易员: 45 人持仓 (多:32 / 空:13)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
判断: 偏多 | 置信度: 中高
```

### Parameter Display Names

| API Field | EN | ZH |
|---|---|---|
| `longRatio` | Long Ratio | 做多比例 |
| `weightedLongRatio` | Weighted Long Ratio | 加权做多比例 |
| `netNotionalUsdt` | Net Position | 净头寸 |
| `tradersWithPosition` | Active Traders | 持仓交易员数 |
| `vs24h` | 24h Change | 24小时变化 |
| `winRatio` | Win Rate | 胜率 |
| `maxRetreat` | Max Drawdown | 最大回撤 |
| `pnl` | PnL | 盈亏 |
| `pnlRatio` | ROI | 投资回报率 |
| `index` | Fear/Greed Index | 恐贪指数 |
| `netInflow` | Net Inflow | 净流入 |

## MCP Tool Reference

| CLI Command | MCP Tool | OKX API Endpoint |
|---|---|---|
| `signal traders` | `smartmoney_get_traders` | OKX Smart Money Leaderboard API |
| `signal trader` | `smartmoney_get_trader_detail` | OKX Smart Money Trader Detail (composite) |
| `signal overview` | `smartmoney_get_overview` | OKX Smart Money Overview API |
| `signal consensus` | `smartmoney_get_signal` | OKX Smart Money Signal API |
| `signal history` | `smartmoney_get_signal_history` | OKX Smart Money Signal History API |
| `signal flow` | `smartmoney_get_flow` | OKX Smart Money Flow API |
| `signal sentiment` | `smartmoney_get_sentiment` | OKX Market Sentiment API |
| `signal alerts` | `smartmoney_get_alerts` | OKX Smart Money Alerts API |
