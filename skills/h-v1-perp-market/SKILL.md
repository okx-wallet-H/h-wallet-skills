---
name: h-v1-perp-market
description: "Use this skill when the user asks about 'BTC price', 'ETH price', 'perpetual swap price', 'funding rate', 'open interest', 'long short ratio', 'order book', 'candles', 'K-line', 'volume', 'market depth', 'ticker', 'mark price', 'index price', '永续合约价格', '资金费率', '持仓量', '多空比', '订单簿', 'K线', '成交量', '市场深度', '标记价格', '指数价格', or any request to query perpetual swap market data, technical indicators, or price information. Public endpoints — no credentials required. Do NOT use for account balance (h-v1-wallet-auth), placing orders (h-v1-perp-trade), smart money signals (h-v1-perp-signal), or bots (h-v1-perp-grid / h-v1-perp-dca)."
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

永续合约的实时行情、K 线、订单簿、资金费率、持仓量和多空比数据。**公开端点，无需凭证。**

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

---

## Skill Routing

| User intent | Route to skill |
|---|---|
| Account balance, margin, transfers | `h-v1-wallet-auth` |
| Smart money, trader signals | `h-v1-perp-signal` |
| Place / cancel orders, set leverage | `h-v1-perp-trade` |
| Grid bot strategy | `h-v1-perp-grid` |
| DCA / Martingale strategy | `h-v1-perp-dca` |
| Market data, prices, candles, funding rate | **This skill** |

---

## Command Index (8 commands, all READ-only, no auth required)

### Price & Ticker

| Command | Description |
|---|---|
| `market ticker --instId <id>` | Single instrument real-time ticker |
| `market tickers --instType SWAP` | All perpetual swap tickers |

### Candlestick & History

| Command | Description |
|---|---|
| `market candles --instId <id> --bar <period>` | OHLCV candlestick data |
| `market trades --instId <id>` | Recent trade history |

### Order Book

| Command | Description |
|---|---|
| `market orderbook --instId <id> --sz <depth>` | Order book (bids/asks) |

### Perpetual-Specific Data

| Command | Description |
|---|---|
| `market funding-rate --instId <id>` | Current & predicted funding rate |
| `market open-interest --instId <id>` | Open interest (OI) |
| `market long-short-ratio --instId <id> --period <p>` | Long/short account ratio |

---

## Detailed Command Reference

### market ticker

```bash
h-wallet market ticker --instId BTC-USDT-SWAP --json
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | — | Instrument ID (e.g. `BTC-USDT-SWAP`, `ETH-USDT-SWAP`) |

**Response Fields:**

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
| `ts` | String | Timestamp (ms) |

---

### market candles

```bash
h-wallet market candles --instId ETH-USDT-SWAP --bar 1H --limit 100 --json
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | — | Instrument ID |
| `--bar` | No | `1H` | Period: `1m`, `5m`, `15m`, `30m`, `1H`, `4H`, `1D`, `1W` |
| `--limit` | No | `100` | Number of candles (max 300) |
| `--after` | No | — | Pagination: return data before this timestamp |
| `--before` | No | — | Pagination: return data after this timestamp |

**Response:** Array of `[ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]`

---

### market funding-rate

```bash
h-wallet market funding-rate --instId BTC-USDT-SWAP --json
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | — | Perpetual swap instrument ID |

**Response Fields:**

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument ID |
| `fundingRate` | String | Current funding rate |
| `nextFundingRate` | String | Predicted next funding rate |
| `fundingTime` | String | Current funding time (ms) |
| `nextFundingTime` | String | Next funding time (ms) |

> **套利信号**：当 `|fundingRate| > 0.01%` 时，可能存在资金费率套利机会。

---

### market open-interest

```bash
h-wallet market open-interest --instId BTC-USDT-SWAP --json
```

**Response Fields:**

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument ID |
| `oi` | String | Open interest (contracts) |
| `oiCcy` | String | Open interest (coin) |
| `ts` | String | Timestamp (ms) |

---

### market long-short-ratio

```bash
h-wallet market long-short-ratio --instId BTC-USDT-SWAP --period 1H --json
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | — | Instrument ID |
| `--period` | No | `1H` | Period: `5m`, `1H`, `1D` |

**Response Fields:**

| Field | Type | Description |
|---|---|---|
| `ts` | String | Timestamp (ms) |
| `longShortRatio` | String | Long/short account ratio |

---

## Operation Flow

### Step 1 — Identify intent

| User says | Command |
|---|---|
| "BTC 永续价格" / "BTC perp price" | `market ticker --instId BTC-USDT-SWAP` |
| "ETH K线" / "ETH candles" | `market candles --instId ETH-USDT-SWAP` |
| "资金费率" / "funding rate" | `market funding-rate --instId BTC-USDT-SWAP` |
| "持仓量" / "open interest" | `market open-interest --instId BTC-USDT-SWAP` |
| "多空比" / "long short ratio" | `market long-short-ratio --instId BTC-USDT-SWAP` |

### Step 2 — Execute and present

All commands are READ-only — no confirmation needed. Always pass `--json` and render results as Markdown tables.

---

## Display Rules

1. **重点关注交易量和市值**：展示数据时优先突出 24h 交易量、持仓量变化。
2. **资金费率高亮**：异常资金费率（> 0.05% 或 < -0.05%）用醒目方式标注。
3. **技术指标辅助**：在 K 线数据基础上，可计算 MA、RSI 等指标供策略参考。

---

## MCP Tool Reference

| CLI Command | MCP Tool | OKX API Endpoint |
|---|---|---|
| `market ticker` | `market_get_ticker` | `GET /api/v5/market/ticker` |
| `market tickers` | `market_get_tickers` | `GET /api/v5/market/tickers` |
| `market candles` | `market_get_candles` | `GET /api/v5/market/candles` |
| `market trades` | `market_get_trades` | `GET /api/v5/market/trades` |
| `market orderbook` | `market_get_orderbook` | `GET /api/v5/market/books` |
| `market funding-rate` | `market_get_funding_rate` | `GET /api/v5/public/funding-rate` |
| `market open-interest` | `market_get_open_interest` | `GET /api/v5/public/open-interest` |
| `market long-short-ratio` | `market_get_long_short_ratio` | `GET /api/v5/rubik/stat/contracts/long-short-account-ratio` |
