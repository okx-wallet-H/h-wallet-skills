---
name: h-v1-perp-trade
description: "Use this skill when the user asks to 'open long', 'open short', 'close position', 'place order', 'limit order', 'market order', 'cancel order', 'set TP/SL', 'take profit', 'stop loss', 'trailing stop', 'set leverage', 'amend order', 'check orders', 'fill history', '开多', '开空', '平仓', '下单', '限价单', '市价单', '撤单', '止盈', '止损', '追踪止损', '设置杠杆', '修改订单', '查看订单', '成交记录', '一键平仓', or any request to place, cancel, amend perpetual swap orders, set TP/SL, adjust leverage, or manage positions on H Wallet. Requires API credentials. Do NOT use for market data (h-v1-perp-market), smart money signals (h-v1-perp-signal), account balance (h-v1-wallet-auth), or bots (h-v1-perp-grid / h-v1-perp-dca)."
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

# H Wallet 永续合约交易执行

永续合约的开仓、平仓、止盈止损、杠杆调整和订单管理。**需要 API 凭证。**

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

---

## Skill Routing

| User intent | Route to skill |
|---|---|
| Account balance, margin, transfers | `h-v1-wallet-auth` |
| Market data, prices, candles, funding rate | `h-v1-perp-market` |
| Smart money, trader signals | `h-v1-perp-signal` |
| Grid bot strategy | `h-v1-perp-grid` |
| DCA / Martingale strategy | `h-v1-perp-dca` |
| Place / cancel / amend orders, TP/SL, leverage | **This skill** |

---

## Command Index (9 commands)

### Order Management

| Command | Type | Auth | Description |
|---|---|---|---|
| `trade place` | WRITE | Required | Place a new perpetual swap order |
| `trade cancel` | WRITE | Required | Cancel a pending order |
| `trade amend` | WRITE | Required | Amend an existing order (price/size) |
| `trade close` | WRITE | Required | Close a position (market or limit) |
| `trade close-all` | WRITE | Required | Emergency close all positions |

### Algo Orders (TP/SL/Trailing)

| Command | Type | Auth | Description |
|---|---|---|---|
| `trade algo` | WRITE | Required | Place algo order (TP/SL/trailing stop) |
| `trade cancel-algo` | WRITE | Required | Cancel an algo order |

### Query

| Command | Type | Auth | Description |
|---|---|---|---|
| `trade orders` | READ | Required | List pending orders |
| `trade fills` | READ | Required | Recent fill/trade history |

---

## Detailed Command Reference

### trade place — 下单

```bash
h-wallet trade place --instId <id> --side <buy|sell> --posSide <long|short> --ordType <type> --sz <size> [--px <price>] [--tpTriggerPx <px>] [--tpOrdPx <px>] [--slTriggerPx <px>] [--slOrdPx <px>] [--json]
```

#### Parameters

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | — | Instrument ID (e.g. `ETH-USDT-SWAP`) |
| `--side` | Yes | — | Order side: `buy` / `sell` |
| `--posSide` | Yes* | — | Position side: `long` / `short` (required in long/short mode) |
| `--ordType` | Yes | — | Order type: `market` / `limit` / `post_only` / `fok` / `ioc` |
| `--sz` | Yes | — | Size in contracts |
| `--px` | Cond. | — | Price (required for limit orders) |
| `--tpTriggerPx` | No | — | Take profit trigger price |
| `--tpOrdPx` | No | — | Take profit order price (`-1` for market) |
| `--slTriggerPx` | No | — | Stop loss trigger price |
| `--slOrdPx` | No | — | Stop loss order price (`-1` for market) |

> *`posSide` is required when account is in `long_short_mode`. In `net_mode`, omit it.

#### Order Side Logic (long/short mode)

| Intent | side | posSide |
|---|---|---|
| Open long | `buy` | `long` |
| Close long | `sell` | `long` |
| Open short | `sell` | `short` |
| Close short | `buy` | `short` |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `ordId` | String | Order ID |
| `clOrdId` | String | Client order ID |
| `sCode` | String | Status code (`0` = success) |
| `sMsg` | String | Status message |

---

### trade close — 平仓

```bash
h-wallet trade close --instId <id> --posSide <long|short> [--sz <size>] [--ordType <type>] [--px <price>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | — | Instrument ID |
| `--posSide` | Yes | — | Position side to close: `long` / `short` |
| `--sz` | No | all | Size to close (omit = close all) |
| `--ordType` | No | `market` | Order type for closing |
| `--px` | Cond. | — | Price (required if ordType = limit) |

---

### trade close-all — 一键平仓

```bash
h-wallet trade close-all [--instId <id>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | No | all | Specific instrument (omit = close ALL positions) |

> **⚠️ DANGER**: This command closes all open positions at market price. Always require user confirmation.

---

### trade algo — 止盈止损 / 追踪止损

```bash
h-wallet trade algo --instId <id> --side <buy|sell> --posSide <long|short> --sz <size> --ordType <type> [--tpTriggerPx <px>] [--tpOrdPx <px>] [--slTriggerPx <px>] [--slOrdPx <px>] [--callbackRatio <r>] [--json]
```

#### Algo Order Types

| ordType | Description | Required Params |
|---|---|---|
| `conditional` | TP/SL conditional order | `tpTriggerPx` and/or `slTriggerPx` |
| `oco` | One-cancels-other (TP + SL) | Both `tpTriggerPx` and `slTriggerPx` |
| `trigger` | Trigger order | `triggerPx` |
| `move_order_stop` | Trailing stop | `callbackRatio` (e.g. `0.05` = 5%) |

---

### trade orders — 查看挂单

```bash
h-wallet trade orders [--instId <id>] [--ordType <type>] [--state <state>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | No | all | Filter by instrument |
| `--ordType` | No | all | Filter by order type |
| `--state` | No | `live` | Order state: `live` / `partially_filled` |
| `--limit` | No | `20` | Max results |

---

### trade fills — 成交记录

```bash
h-wallet trade fills [--instId <id>] [--ordId <id>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | No | all | Filter by instrument |
| `--ordId` | No | — | Filter by specific order ID |
| `--limit` | No | `20` | Max results |

---

## Operation Flow

### Step 0 — Credential & Profile Check

Before any command: run `h-wallet config show --json`. Always use `--profile live` silently.

### Step 1 — Identify intent

| User says | Command |
|---|---|
| "开多 ETH 10张" | `trade place --instId ETH-USDT-SWAP --side buy --posSide long --ordType market --sz 10` |
| "开空 BTC 限价 95000" | `trade place --instId BTC-USDT-SWAP --side sell --posSide short --ordType limit --sz 1 --px 95000` |
| "平多仓" | `trade close --instId ETH-USDT-SWAP --posSide long` |
| "设止盈 100000" | `trade algo --instId BTC-USDT-SWAP ... --tpTriggerPx 100000 --tpOrdPx -1` |
| "一键平仓" | `trade close-all` |
| "查看挂单" | `trade orders` |

### Step 2 — Confirmation & Execute

- **READ commands**: no confirmation needed.
- **WRITE commands**: **MUST require user confirmation** before execution. Display order summary:
  - Instrument, direction, size, price, leverage
  - Estimated margin required
  - Risk warning if leverage > 20x

---

## Safety Rules

1. **杠杆警告**：杠杆 > 20x 时，必须显示高风险警告。
2. **大额订单确认**：订单金额 > 1000 USDT 时，要求二次确认。
3. **一键平仓保护**：`trade close-all` 命令必须明确告知用户将平掉所有仓位。
4. **止盈默认**：建议用户在开仓时同时设置 30% 止盈。

---

## MCP Tool Reference

| CLI Command | MCP Tool | OKX API Endpoint |
|---|---|---|
| `trade place` | `swap_place_order` | `POST /api/v5/trade/order` |
| `trade cancel` | `swap_cancel_order` | `POST /api/v5/trade/cancel-order` |
| `trade amend` | `swap_amend_order` | `POST /api/v5/trade/amend-order` |
| `trade close` | `swap_close_position` | `POST /api/v5/trade/close-position` |
| `trade algo` | `swap_place_algo` | `POST /api/v5/trade/order-algo` |
| `trade cancel-algo` | `swap_cancel_algo` | `POST /api/v5/trade/cancel-algos` |
| `trade orders` | `swap_get_orders` | `GET /api/v5/trade/orders-pending` |
| `trade fills` | `swap_get_fills` | `GET /api/v5/trade/fills` |
