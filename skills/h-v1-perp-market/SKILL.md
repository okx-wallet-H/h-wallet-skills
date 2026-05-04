---
name: h-v1-perp-market
description: "Use this skill when the user asks about 'BTC price', 'ETH price', 'perpetual swap price', 'funding rate', 'open interest', 'long short ratio', 'order book', 'candles', 'K-line', 'volume', 'market depth', 'ticker', 'mark price', 'index price', 'liquidation', 'taker volume', 'basis', 'premium', 'contract info', 'instrument info', 'trading pairs', '永续合约价格', '资金费率', '持仓量', '多空比', '订单簿', 'K线', '成交量', '市场深度', '标记价格', '指数价格', '爆仓', '主动买卖量', '基差', '溢价', '合约信息', '交易对', or any request to query perpetual swap market data, technical indicators, instrument info, or price information. Public endpoints — no credentials required. Do NOT use for account balance (h-v1-wallet-auth), placing orders (h-v1-perp-trade), smart money signals (h-v1-perp-signal), or bots (h-v1-perp-grid / h-v1-perp-dca)."
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

# H Wallet 永续合约市场数据

Perpetual swap market data on H Wallet. Covers real-time tickers, candlesticks, order book, funding rates, open interest, long/short ratio, taker volume, liquidation data, and instrument info. **All public endpoints — no credentials required.**

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

## Prerequisites

```bash
npm install -g @h-wallet/trade-cli
```

No API credentials needed for market data commands.

## Skill Routing

| Need | Skill |
|---|---|
| Account balance, positions, fees | `h-v1-wallet-auth` |
| Smart money, trader signals | `h-v1-perp-signal` |
| Regular swap orders (place/cancel/amend) | `h-v1-perp-trade` |
| Grid bots | `h-v1-perp-grid` |
| DCA / Martingale bots | `h-v1-perp-dca` |
| **Market data, prices, candles, funding rate** | **This skill** |

## Design Philosophy

> **核心理念**：为交易决策和策略执行提供全面、实时的市场数据支撑。

1. **数据全面**：覆盖价格、深度、资金费率、持仓量、多空比、爆仓等全维度数据。
2. **技术指标**：在 K 线数据基础上可计算 MA、RSI、ATR 等指标。
3. **套利信号**：资金费率异常时自动提示套利机会。
4. **策略输入**：为 Grid/DCA 策略提供参数计算所需的市场数据。

## Command Index (14 commands, all READ-only, no auth required)

### Price & Ticker

| # | Command | Description |
|---|---|---|
| 1 | `h-wallet market ticker` | Single instrument real-time ticker |
| 2 | `h-wallet market tickers` | All perpetual swap tickers |
| 3 | `h-wallet market index-ticker` | Index price ticker |

### Candlestick & History

| # | Command | Description |
|---|---|---|
| 4 | `h-wallet market candles` | OHLCV candlestick data |
| 5 | `h-wallet market history-candles` | Historical candles (older data) |
| 6 | `h-wallet market trades` | Recent trade history |

### Order Book & Depth

| # | Command | Description |
|---|---|---|
| 7 | `h-wallet market orderbook` | Order book (bids/asks) |

### Perpetual-Specific Data

| # | Command | Description |
|---|---|---|
| 8 | `h-wallet market funding-rate` | Current & predicted funding rate |
| 9 | `h-wallet market funding-rate-history` | Historical funding rates |
| 10 | `h-wallet market open-interest` | Open interest (OI) |
| 11 | `h-wallet market long-short-ratio` | Long/short account ratio |
| 12 | `h-wallet market taker-volume` | Taker buy/sell volume ratio |
| 13 | `h-wallet market liquidations` | Recent liquidation orders |

### Instrument Info

| # | Command | Description |
|---|---|---|
| 14 | `h-wallet market instrument` | Contract specifications (tick size, lot size, etc.) |

## CLI Command Reference

### market ticker — 单合约实时行情

```bash
h-wallet market ticker --instId <id> [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument ID (e.g. `BTC-USDT-SWAP`, `ETH-USDT-SWAP`) |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument ID |
| `last` | String | Last traded price |
| `lastSz` | String | Last traded size |
| `askPx` | String | Best ask price |
| `askSz` | String | Best ask size |
| `bidPx` | String | Best bid price |
| `bidSz` | String | Best bid size |
| `open24h` | String | 24h open price |
| `high24h` | String | 24h high |
| `low24h` | String | 24h low |
| `vol24h` | String | 24h volume (contracts) |
| `volCcy24h` | String | 24h volume (currency) |
| `sodUtc0` | String | Start-of-day price (UTC 0:00) |
| `sodUtc8` | String | Start-of-day price (UTC+8 0:00) |
| `ts` | String | Timestamp (ms) |

---

### market tickers — 全部永续合约行情

```bash
h-wallet market tickers --instType SWAP [--uly <underlying>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instType` | Yes | `SWAP` | Instrument type: `SWAP` |
| `--uly` | No | - | Filter by underlying (e.g. `BTC-USDT`) |

Returns array of ticker objects (same fields as single ticker).

---

### market index-ticker — 指数价格

```bash
h-wallet market index-ticker --instId <id> [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Index instrument (e.g. `BTC-USDT`) |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Index instrument |
| `idxPx` | String | Index price |
| `high24h` | String | 24h high |
| `low24h` | String | 24h low |
| `open24h` | String | 24h open |
| `sodUtc0` | String | SOD price (UTC 0:00) |
| `ts` | String | Timestamp |

---

### market candles — K线数据

```bash
h-wallet market candles --instId <id> [--bar <period>] [--limit <n>] [--after <ts>] [--before <ts>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument ID |
| `--bar` | No | `1H` | Period: `1m`, `3m`, `5m`, `15m`, `30m`, `1H`, `2H`, `4H`, `6H`, `12H`, `1D`, `1W`, `1M` |
| `--limit` | No | `100` | Number of candles (max 300) |
| `--after` | No | - | Pagination: return data before this timestamp (ms) |
| `--before` | No | - | Pagination: return data after this timestamp (ms) |

#### Response Format

Array of `[ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]`

| Index | Field | Description |
|---|---|---|
| 0 | `ts` | Candle open timestamp (ms) |
| 1 | `open` | Open price |
| 2 | `high` | High price |
| 3 | `low` | Low price |
| 4 | `close` | Close price |
| 5 | `vol` | Volume (contracts) |
| 6 | `volCcy` | Volume (base currency) |
| 7 | `volCcyQuote` | Volume (quote currency, USDT) |
| 8 | `confirm` | `1` = candle closed, `0` = still forming |

#### Technical Indicator Calculation

From candle data, calculate:
- **MA (Moving Average)**: `MA(n) = sum(close[0..n-1]) / n`
- **RSI (Relative Strength Index)**: 14-period default
- **ATR (Average True Range)**: for volatility assessment → used in Grid/DCA parameter calculation
- **Bollinger Bands**: for range identification → used in Grid price range

---

### market history-candles — 历史K线

```bash
h-wallet market history-candles --instId <id> [--bar <period>] [--limit <n>] [--after <ts>] [--before <ts>] [--json]
```

Same parameters as `market candles`. Use for data older than the most recent 1,440 candles.

---

### market trades — 最近成交

```bash
h-wallet market trades --instId <id> [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument ID |
| `--limit` | No | `100` | Max trades (max 500) |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument |
| `tradeId` | String | Trade ID |
| `px` | String | Trade price |
| `sz` | String | Trade size |
| `side` | String | `buy` or `sell` (taker side) |
| `ts` | String | Timestamp (ms) |

---

### market orderbook — 订单簿/深度

```bash
h-wallet market orderbook --instId <id> [--sz <depth>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument ID |
| `--sz` | No | `20` | Depth levels: `1`, `5`, `20`, `400` |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `asks` | Array | Ask orders: `[[price, size, liquidationOrders, numOrders], ...]` |
| `bids` | Array | Bid orders: `[[price, size, liquidationOrders, numOrders], ...]` |
| `ts` | String | Timestamp |

---

### market funding-rate — 当前资金费率

```bash
h-wallet market funding-rate --instId <id> [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Perpetual swap instrument ID |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument ID |
| `fundingRate` | String | Current funding rate |
| `nextFundingRate` | String | Predicted next funding rate |
| `fundingTime` | String | Current funding settlement time (ms) |
| `nextFundingTime` | String | Next funding settlement time (ms) |
| `minFundingRate` | String | Minimum funding rate |
| `maxFundingRate` | String | Maximum funding rate |
| `method` | String | Funding rate calculation method |

#### Funding Rate Interpretation

| fundingRate | Interpretation | Implication |
|---|---|---|
| > +0.01% | Longs pay shorts | Market bullish — longs are crowded |
| +0.005% to +0.01% | Normal positive | Slightly bullish |
| -0.005% to +0.005% | Neutral | Balanced market |
| -0.01% to -0.005% | Normal negative | Slightly bearish |
| < -0.01% | Shorts pay longs | Market bearish — shorts are crowded |

> **套利信号**：当 `|fundingRate| > 0.03%` 时，存在显著的资金费率套利机会。

---

### market funding-rate-history — 历史资金费率

```bash
h-wallet market funding-rate-history --instId <id> [--limit <n>] [--before <ts>] [--after <ts>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument ID |
| `--limit` | No | `100` | Max results (max 100) |
| `--before` | No | - | Before this timestamp |
| `--after` | No | - | After this timestamp |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument |
| `fundingRate` | String | Funding rate at settlement |
| `realizedRate` | String | Actual realized rate |
| `fundingTime` | String | Settlement timestamp |

---

### market open-interest — 持仓量

```bash
h-wallet market open-interest --instId <id> [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument ID |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument ID |
| `instType` | String | `SWAP` |
| `oi` | String | Open interest (contracts) |
| `oiCcy` | String | Open interest (coin) |
| `ts` | String | Timestamp (ms) |

#### OI Interpretation

| OI Change | Price Change | Interpretation |
|---|---|---|
| OI ↑ | Price ↑ | New longs entering — bullish trend strengthening |
| OI ↑ | Price ↓ | New shorts entering — bearish trend strengthening |
| OI ↓ | Price ↑ | Shorts closing — short squeeze |
| OI ↓ | Price ↓ | Longs closing — long liquidation |

---

### market long-short-ratio — 多空比

```bash
h-wallet market long-short-ratio --instId <id> [--period <p>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument ID |
| `--period` | No | `1H` | Period: `5m`, `1H`, `1D` |

#### Response Fields (array of time points)

| Field | Type | Description |
|---|---|---|
| `ts` | String | Timestamp (ms) |
| `longShortRatio` | String | Long/short account ratio (> 1 = more longs) |

---

### market taker-volume — 主动买卖量

```bash
h-wallet market taker-volume --instId <id> [--period <p>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument ID (or currency like `BTC`) |
| `--period` | No | `1H` | Period: `5m`, `1H`, `1D` |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `ts` | String | Timestamp |
| `buyVol` | String | Taker buy volume |
| `sellVol` | String | Taker sell volume |
| `ratio` | String | Buy/sell ratio (> 1 = more buying pressure) |

---

### market liquidations — 爆仓数据

```bash
h-wallet market liquidations --instId <id> [--state <state>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument ID |
| `--state` | No | `filled` | `filled` (completed) or `unfilled` (pending) |
| `--limit` | No | `100` | Max results |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument |
| `side` | String | `buy` (short liquidated) or `sell` (long liquidated) |
| `sz` | String | Liquidation size |
| `px` | String | Liquidation price |
| `ts` | String | Timestamp |

---

### market instrument — 合约规格

```bash
h-wallet market instrument --instId <id> [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument ID |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument ID |
| `instType` | String | `SWAP` |
| `uly` | String | Underlying (e.g. `BTC-USDT`) |
| `settleCcy` | String | Settlement currency |
| `ctVal` | String | Contract value |
| `ctMult` | String | Contract multiplier |
| `ctType` | String | `linear` or `inverse` |
| `tickSz` | String | Tick size (minimum price increment) |
| `lotSz` | String | Lot size (minimum order size) |
| `minSz` | String | Minimum order size |
| `maxLever` | String | Maximum leverage |
| `listTime` | String | Listing time |
| `state` | String | `live`, `suspend`, `preopen` |

---

## Quickstart

```bash
# BTC perpetual ticker
h-wallet market ticker --instId BTC-USDT-SWAP

# ETH 4-hour candles (last 100)
h-wallet market candles --instId ETH-USDT-SWAP --bar 4H --limit 100

# BTC funding rate
h-wallet market funding-rate --instId BTC-USDT-SWAP

# BTC open interest
h-wallet market open-interest --instId BTC-USDT-SWAP

# BTC long/short ratio (1H)
h-wallet market long-short-ratio --instId BTC-USDT-SWAP --period 1H

# BTC order book (top 20 levels)
h-wallet market orderbook --instId BTC-USDT-SWAP --sz 20

# BTC taker buy/sell volume
h-wallet market taker-volume --instId BTC-USDT-SWAP --period 1H

# Recent BTC liquidations
h-wallet market liquidations --instId BTC-USDT-SWAP --limit 20

# BTC contract specifications
h-wallet market instrument --instId BTC-USDT-SWAP

# All SWAP tickers
h-wallet market tickers --instType SWAP

# BTC index price
h-wallet market index-ticker --instId BTC-USDT

# Historical funding rates
h-wallet market funding-rate-history --instId BTC-USDT-SWAP --limit 50
```

## Cross-Skill Workflows

### Market Analysis for Grid Strategy
> User: "帮我分析一下 BTC 适不适合开网格"

```
1. h-v1-perp-market    h-wallet market ticker --instId BTC-USDT-SWAP
   → Current price

2. h-v1-perp-market    h-wallet market candles --instId BTC-USDT-SWAP --bar 4H --limit 100
   → Calculate ATR (volatility), Bollinger Bands (range)
   → Determine if market is ranging or trending

3. h-v1-perp-market    h-wallet market funding-rate --instId BTC-USDT-SWAP
   → Check funding cost for grid positions

4. h-v1-perp-market    h-wallet market open-interest --instId BTC-USDT-SWAP
   → Check OI trend (stable OI = ranging market = good for grid)

5. [ANALYZE]           
   - ATR < 2% of price → low volatility → good for grid
   - Price within Bollinger Bands → ranging → good for grid
   - OI stable → no strong trend → good for grid
   - Funding rate < 0.01% → low holding cost → good for grid
   
6. [REPORT]            Present analysis with recommendation
7. h-v1-perp-grid      (if suitable) → suggest grid parameters based on data
```

### Funding Rate Arbitrage Detection
> User: "有没有资金费率套利机会？"

```
1. h-v1-perp-market    h-wallet market tickers --instType SWAP
   → Get all swap tickers

2. [ANALYZE]           Filter instruments with |fundingRate| > 0.03%
   → Sort by absolute funding rate

3. h-v1-perp-market    h-wallet market funding-rate --instId <top_instrument>
   → Get detailed funding info for top candidates

4. h-v1-perp-market    h-wallet market funding-rate-history --instId <top_instrument> --limit 10
   → Check if high rate is persistent or one-time

5. [REPORT]            Present arbitrage opportunities:
   - Instrument, current rate, predicted next rate
   - Annualized yield estimate
   - Risk assessment (liquidation risk, rate reversal risk)
```

### Pre-Trade Market Check
> User: "我想做多 ETH，先看看市场情况"

```
1. h-v1-perp-market    h-wallet market ticker --instId ETH-USDT-SWAP → price
2. h-v1-perp-market    h-wallet market candles --instId ETH-USDT-SWAP --bar 1H --limit 24 → recent trend
3. h-v1-perp-market    h-wallet market funding-rate --instId ETH-USDT-SWAP → funding cost
4. h-v1-perp-market    h-wallet market open-interest --instId ETH-USDT-SWAP → OI
5. h-v1-perp-market    h-wallet market long-short-ratio --instId ETH-USDT-SWAP → crowd positioning
6. h-v1-perp-market    h-wallet market taker-volume --instId ETH-USDT-SWAP → buying pressure
7. h-v1-perp-market    h-wallet market liquidations --instId ETH-USDT-SWAP --limit 10 → recent liquidations
8. [ANALYZE]           Comprehensive market assessment
9. [REPORT]            Present multi-dimensional market view to user
```

## Operation Flow

### Step 1 — Identify intent

| User says | Command(s) |
|---|---|
| "BTC 永续价格" / "BTC perp price" | `market ticker --instId BTC-USDT-SWAP` |
| "ETH K线" / "ETH candles" | `market candles --instId ETH-USDT-SWAP` |
| "资金费率" / "funding rate" | `market funding-rate --instId BTC-USDT-SWAP` |
| "持仓量" / "open interest" | `market open-interest --instId BTC-USDT-SWAP` |
| "多空比" / "long short ratio" | `market long-short-ratio --instId BTC-USDT-SWAP` |
| "市场深度" / "order book" | `market orderbook --instId BTC-USDT-SWAP --sz 20` |
| "爆仓数据" / "liquidations" | `market liquidations --instId BTC-USDT-SWAP` |
| "合约信息" / "contract info" | `market instrument --instId BTC-USDT-SWAP` |
| "主动买卖" / "taker volume" | `market taker-volume --instId BTC-USDT-SWAP` |
| "全面分析" / "full analysis" | Run ticker + candles + funding + OI + L/S ratio |

### Step 2 — Execute and present

All commands are READ-only — no confirmation needed. Always pass `--json` and render results as readable Markdown tables with interpretation.

## Edge Cases

- **Instrument ID format**: USDT-margined = `BTC-USDT-SWAP`; Coin-margined = `BTC-USD-SWAP`. Always clarify with user if ambiguous
- **Rate limit**: 20 requests per 2 seconds for public endpoints
- **Candle pagination**: max 300 per request. For longer history, use `--after` pagination
- **Funding rate settlement**: Every 8 hours (00:00, 08:00, 16:00 UTC). Rate shown is for current period
- **OI units**: `oi` is in contracts, `oiCcy` is in base currency. Use `oiCcy` for cross-instrument comparison
- **Long/short ratio**: This is account ratio (number of accounts), not position ratio. Smart money data from `h-v1-perp-signal` is more reliable for directional signals
- **Liquidation data**: Only shows recent liquidations. Large liquidation clusters indicate potential reversal zones
- **Inverse contracts**: For coin-margined (`BTC-USD-SWAP`), all sizes are in base currency (BTC). Calculations differ from linear contracts

## Display Rules

1. **重点关注交易量和持仓量**：展示数据时优先突出 24h 交易量、持仓量变化
2. **资金费率高亮**：异常资金费率（> 0.03% 或 < -0.03%）用醒目方式标注
3. **技术指标辅助**：在 K 线数据基础上，可计算 MA、RSI、ATR 等指标供策略参考
4. **多维度综合**：单一指标不做判断，结合多个数据源给出综合分析

### Parameter Display Names

| API Field | EN | ZH |
|---|---|---|
| `last` | Last Price | 最新价 |
| `vol24h` | 24h Volume | 24小时成交量 |
| `fundingRate` | Funding Rate | 资金费率 |
| `nextFundingRate` | Next Funding Rate | 预测下期费率 |
| `oi` | Open Interest | 持仓量 |
| `longShortRatio` | Long/Short Ratio | 多空比 |
| `high24h` | 24h High | 24小时最高 |
| `low24h` | 24h Low | 24小时最低 |
| `askPx` | Best Ask | 卖一价 |
| `bidPx` | Best Bid | 买一价 |
| `ctVal` | Contract Value | 合约面值 |
| `tickSz` | Tick Size | 最小价格单位 |
| `lotSz` | Lot Size | 最小下单量 |
| `maxLever` | Max Leverage | 最大杠杆 |

## MCP Tool Reference

| CLI Command | MCP Tool | OKX API Endpoint |
|---|---|---|
| `market ticker` | `market_get_ticker` | `GET /api/v5/market/ticker` |
| `market tickers` | `market_get_tickers` | `GET /api/v5/market/tickers` |
| `market index-ticker` | `market_get_index_ticker` | `GET /api/v5/market/index-tickers` |
| `market candles` | `market_get_candles` | `GET /api/v5/market/candles` |
| `market history-candles` | `market_get_history_candles` | `GET /api/v5/market/history-candles` |
| `market trades` | `market_get_trades` | `GET /api/v5/market/trades` |
| `market orderbook` | `market_get_orderbook` | `GET /api/v5/market/books` |
| `market funding-rate` | `market_get_funding_rate` | `GET /api/v5/public/funding-rate` |
| `market funding-rate-history` | `market_get_funding_rate_history` | `GET /api/v5/public/funding-rate-history` |
| `market open-interest` | `market_get_open_interest` | `GET /api/v5/public/open-interest` |
| `market long-short-ratio` | `market_get_long_short_ratio` | `GET /api/v5/rubik/stat/contracts/long-short-account-ratio` |
| `market taker-volume` | `market_get_taker_volume` | `GET /api/v5/rubik/stat/taker-volume-contract` |
| `market liquidations` | `market_get_liquidations` | `GET /api/v5/public/liquidation-orders` |
| `market instrument` | `market_get_instrument` | `GET /api/v5/public/instruments` |
