---
name: h-v1-perp-dca
description: "Use this skill when the user asks to 'create DCA bot', 'start martingale', 'auto buy dip', 'dollar cost averaging', 'recurring buy', 'DCA strategy', 'stop DCA', 'DCA status', 'DCA profit', 'martingale bot', '创建定投', '启动马丁格尔', '自动补仓', '定投策略', '停止定投', '定投状态', '定投收益', '马丁格尔机器人', '智能补仓', or any request to create, monitor, adjust, or stop a perpetual swap DCA / Martingale bot. Requires API credentials. Do NOT use for market data (h-v1-perp-market), manual trading (h-v1-perp-trade), smart money (h-v1-perp-signal), or grid bots (h-v1-perp-grid)."
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

# H Wallet 合约马丁格尔策略 (DCA)

永续合约马丁格尔/DCA 机器人的创建、监控和管理。支持自动补仓、动态止盈和智能加仓。**需要 API 凭证。**

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
| Place / cancel orders manually | `h-v1-perp-trade` |
| Grid bot strategy | `h-v1-perp-grid` |
| DCA / Martingale strategy | **This skill** |

---

## Design Philosophy

> **核心理念**：震荡区间内积极获利，自动补仓摊低成本，动态止盈锁定利润。

1. **马丁格尔逻辑**：价格逆向移动时自动加仓，摊低均价，反弹时止盈。
2. **动态止盈**：根据补仓次数动态调整止盈比例（补仓越多，止盈越低）。
3. **策略持续运营**：止盈后自动重启新一轮，无需人工干预。
4. **风控内置**：最大补仓次数限制 + 总亏损止损保护。

---

## Command Index (6 commands)

### Bot Lifecycle

| Command | Type | Auth | Description |
|---|---|---|---|
| `dca create` | WRITE | Required | Create and start a new DCA/Martingale bot |
| `dca stop` | WRITE | Required | Stop a running DCA bot |
| `dca close-position` | WRITE | Required | Stop bot and close remaining position |

### Monitoring

| Command | Type | Auth | Description |
|---|---|---|---|
| `dca list` | READ | Required | List all active DCA bots |
| `dca detail --algoId <id>` | READ | Required | Get detailed status of a DCA bot |
| `dca orders --algoId <id>` | READ | Required | Get sub-orders (entries + TPs) of a DCA bot |

---

## Detailed Command Reference

### dca create — 创建马丁格尔机器人

```bash
h-wallet dca create --instId <id> --direction <dir> --sz <size> --lever <n> --maxOrders <n> --priceStep <r> --tpRatio <r> --multiplier <m> [--slRatio <r>] [--cycleMode <mode>] [--json]
```

#### Parameters

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | — | Instrument ID (e.g. `ETH-USDT-SWAP`) |
| `--direction` | Yes | — | Direction: `long` / `short` |
| `--sz` | Yes | — | Initial order size (USDT) |
| `--lever` | No | `5` | Leverage (1-125) |
| `--maxOrders` | No | `5` | Max safety orders (补仓次数, 1-50) |
| `--priceStep` | Yes | — | Price deviation for each safety order (e.g. `0.02` = 2%) |
| `--tpRatio` | No | `0.03` | Take profit ratio (default 3%) |
| `--multiplier` | No | `1.5` | Safety order size multiplier (马丁倍数) |
| `--slRatio` | No | `0.15` | Stop loss ratio (default 15%) |
| `--cycleMode` | No | `auto` | After TP: `auto` (restart) / `manual` (stop) |
| `--priceStepScale` | No | `1.0` | Price step scaling factor for deeper entries |

#### Pre-optimized Defaults (合约马丁格尔)

| Setting | Default Value | Rationale |
|---|---|---|
| Direction | `long` | 适合主流币长期看多 |
| Leverage | `5x` | 平衡收益与爆仓风险 |
| Max orders | `5` | 控制最大资金占用 |
| Price step | `2%` | 适合中等波动 |
| TP ratio | `3%` | 快速止盈，频繁循环 |
| Multiplier | `1.5x` | 温和加仓，不过度激进 |
| SL ratio | `15%` | 保护本金 |
| Cycle mode | `auto` | 止盈后自动重启 |

#### Dynamic TP Logic (动态止盈)

| Safety Orders Filled | TP Ratio | Rationale |
|---|---|---|
| 0 (initial only) | 3.0% | 标准止盈 |
| 1 | 2.5% | 略降，加速回本 |
| 2 | 2.0% | 进一步降低 |
| 3 | 1.5% | 快速止盈 |
| 4+ | 1.0% | 最低止盈，优先出局 |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `algoId` | String | DCA bot unique ID |
| `sCode` | String | Status code (`0` = success) |
| `sMsg` | String | Status message |

---

### dca stop — 停止 DCA

```bash
h-wallet dca stop --algoId <id> [--json]
```

> Note: Stopping does NOT close remaining position. Use `dca close-position` to stop and close.

---

### dca close-position — 停止并平仓

```bash
h-wallet dca close-position --algoId <id> [--json]
```

Stops the DCA bot AND closes any remaining position at market price.

---

### dca list — 查看活跃 DCA

```bash
h-wallet dca list [--instId <id>] [--json]
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `algoId` | String | Bot ID |
| `instId` | String | Instrument |
| `direction` | String | Direction: `long` / `short` |
| `state` | String | State: `running` / `stopping` / `stopped` |
| `totalPnl` | String | Total PnL (USDT) |
| `totalPnlRatio` | String | Total PnL ratio |
| `curCycles` | String | Completed cycles count |
| `safetyOrdersFilled` | String | Current cycle safety orders filled |
| `avgPx` | String | Current average entry price |
| `runDuration` | String | Running duration (seconds) |

---

### dca detail — DCA 详情

```bash
h-wallet dca detail --algoId <id> [--json]
```

Returns comprehensive bot status including:
- Strategy parameters (direction, leverage, multiplier, price steps)
- Performance metrics (total PnL, completed cycles, win rate)
- Current cycle status (entries filled, current avg price, distance to TP)
- Risk metrics (margin used, distance to liquidation)

---

### dca orders — DCA 子订单

```bash
h-wallet dca orders --algoId <id> [--state <state>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--algoId` | Yes | — | DCA bot ID |
| `--state` | No | all | Filter: `filled` / `live` / `canceled` |
| `--limit` | No | `50` | Max results |

---

## Operation Flow

### Step 0 — Environment Cleanup

Before creating a new DCA bot:
1. Check for existing DCA bots on same instrument: `dca list --instId <id>`
2. If found, stop the old bot: `dca stop --algoId <old_id>`
3. Wait for confirmation before proceeding

### Step 1 — One-Click Strategy Launch

When user says "启动马丁格尔" or "开始定投":

1. **Determine instrument**: Ask or infer (default: ETH-USDT-SWAP)
2. **Determine direction**: Based on signal data or user preference
3. **Fetch market data**: Call `h-v1-perp-market` for current price and volatility
4. **Auto-calculate parameters**:
   - `priceStep` = based on ATR (higher vol → larger step)
   - `sz` = based on user's available margin / (maxOrders * multiplier sum)
5. **Apply pre-optimized defaults**: 5x leverage, 5 max orders, 1.5x multiplier, auto cycle
6. **Show summary and confirm**: Display all parameters + estimated max investment
7. **Execute**: `dca create` with optimized parameters

### Step 2 — Continuous Monitoring

- **Cycle tracking**: Log each completed cycle (entry → TP) with PnL
- **Performance collection**: Record win rate, avg cycle duration, total profit
- **Auto-optimization**: After 10+ cycles, suggest parameter adjustments based on data
- **Risk alert**: If safety orders > 3 filled, warn user about increasing risk

---

## Strategy Switching Logic

| Condition | Action |
|---|---|
| Market trending strongly (RSI > 70 or < 30) | Suggest switching to `h-v1-perp-grid` or manual trade |
| High volatility + sideways | DCA performs well, continue |
| Funding rate > 0.1% (for longs) | Warn about funding cost |
| Max orders filled + price still dropping | Alert user, suggest manual SL |

---

## Risk Management

| Rule | Value | Description |
|---|---|---|
| Max leverage | `10x` | Hard cap for DCA bots |
| Max investment | Auto-calculated | Sum of all possible entries |
| Stop loss | `15%` | Total investment loss limit |
| Max concurrent bots | `3` | Per account limit |
| Cycle restart delay | `30s` | Cooldown between cycles |

---

## MCP Tool Reference

| CLI Command | MCP Tool | OKX API Endpoint |
|---|---|---|
| `dca create` | `bot_dca_create` | `POST /api/v5/tradingBot/recurring/order-algo` |
| `dca stop` | `bot_dca_stop` | `POST /api/v5/tradingBot/recurring/stop-order-algo` |
| `dca close-position` | `bot_dca_close_position` | `POST /api/v5/tradingBot/recurring/close-position` |
| `dca list` | `bot_dca_list` | `GET /api/v5/tradingBot/recurring/orders-algo-pending` |
| `dca detail` | `bot_dca_detail` | `GET /api/v5/tradingBot/recurring/orders-algo-details` |
| `dca orders` | `bot_dca_orders` | `GET /api/v5/tradingBot/recurring/sub-orders` |
