---
name: h-v1-perp-grid
description: "Use this skill when the user asks to 'create grid bot', 'start grid strategy', 'neutral grid', 'contract grid', 'grid trading', 'stop grid', 'grid status', 'grid profit', 'grid parameters', '创建网格', '启动网格策略', '中性网格', '合约网格', '网格交易', '停止网格', '网格状态', '网格收益', '网格参数', '一键启动策略', or any request to create, monitor, adjust, or stop a perpetual swap grid trading bot. Requires API credentials. Do NOT use for market data (h-v1-perp-market), manual trading (h-v1-perp-trade), smart money (h-v1-perp-signal), or DCA bots (h-v1-perp-dca)."
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

# H Wallet 合约中性网格策略

永续合约中性网格机器人的创建、监控、调参和停止。**需要 API 凭证。**

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
| DCA / Martingale strategy | `h-v1-perp-dca` |
| Grid bot strategy | **This skill** |

---

## Design Philosophy

> **核心理念**：策略预先优化，用户只需一键启动。

1. **中性网格优先**：默认以提高收益率为主要优化目标，适合震荡行情。
2. **内置止盈**：默认 30% 总收益止盈，避免长期持有。
3. **策略持续运营**：策略启动后持续运行，不需要用户频繁干预。
4. **环境清理**：部署新策略前，自动停止同一币种的旧网格。

---

## Command Index (6 commands)

### Bot Lifecycle

| Command | Type | Auth | Description |
|---|---|---|---|
| `grid create` | WRITE | Required | Create and start a new contract grid bot |
| `grid stop` | WRITE | Required | Stop a running grid bot |
| `grid close-position` | WRITE | Required | Stop bot and close remaining position |

### Monitoring

| Command | Type | Auth | Description |
|---|---|---|---|
| `grid list` | READ | Required | List all active grid bots |
| `grid detail --algoId <id>` | READ | Required | Get detailed status of a grid bot |
| `grid orders --algoId <id>` | READ | Required | Get sub-orders of a grid bot |

---

## Detailed Command Reference

### grid create — 创建合约网格

```bash
h-wallet grid create --instId <id> --gridType <type> --minPx <price> --maxPx <price> --gridNum <n> --sz <size> --lever <n> [--direction <dir>] [--tpRatio <r>] [--slRatio <r>] [--json]
```

#### Parameters

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | — | Instrument ID (e.g. `ETH-USDT-SWAP`) |
| `--gridType` | No | `neutral` | Grid type: `neutral` / `long` / `short` |
| `--minPx` | Yes | — | Grid lower price boundary |
| `--maxPx` | Yes | — | Grid upper price boundary |
| `--gridNum` | Yes | — | Number of grid levels (2-200) |
| `--sz` | Yes | — | Total investment size (USDT) |
| `--lever` | No | `5` | Leverage (1-125) |
| `--direction` | No | `neutral` | Direction: `long` / `short` / `neutral` |
| `--tpRatio` | No | `0.3` | Take profit ratio (default 30%) |
| `--slRatio` | No | `0.1` | Stop loss ratio (default 10%) |
| `--runType` | No | `1` | Start type: `1` (immediate) / `2` (trigger) |
| `--triggerPx` | Cond. | — | Trigger price (required if runType = 2) |

#### Pre-optimized Defaults (中性网格)

| Setting | Default Value | Rationale |
|---|---|---|
| Grid type | `neutral` | 适合震荡行情，双向获利 |
| Leverage | `5x` | 平衡收益与风险 |
| TP ratio | `30%` | 震荡区间积极获利 |
| SL ratio | `10%` | 控制最大亏损 |
| Grid count | Auto-calculated | 基于价格区间和波动率 |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `algoId` | String | Grid bot unique ID |
| `sCode` | String | Status code (`0` = success) |
| `sMsg` | String | Status message |

---

### grid stop — 停止网格

```bash
h-wallet grid stop --algoId <id> [--json]
```

| Param | Required | Description |
|---|---|---|
| `--algoId` | Yes | Grid bot ID to stop |

> Note: Stopping a grid bot does NOT close the remaining position. Use `grid close-position` to stop and close.

---

### grid close-position — 停止并平仓

```bash
h-wallet grid close-position --algoId <id> [--json]
```

Stops the grid bot AND closes any remaining position at market price.

---

### grid list — 查看活跃网格

```bash
h-wallet grid list [--instId <id>] [--json]
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `algoId` | String | Bot ID |
| `instId` | String | Instrument |
| `gridType` | String | Grid type |
| `state` | String | State: `running` / `stopping` / `stopped` |
| `totalPnl` | String | Total PnL (USDT) |
| `totalPnlRatio` | String | Total PnL ratio |
| `gridProfit` | String | Grid profit (from grid trades) |
| `floatProfit` | String | Floating profit (unrealized) |
| `runDuration` | String | Running duration (seconds) |

---

### grid detail — 网格详情

```bash
h-wallet grid detail --algoId <id> [--json]
```

Returns comprehensive bot status including:
- Grid parameters (price range, grid count, leverage)
- Performance metrics (total PnL, grid profit, float profit)
- Current position info
- TP/SL status

---

### grid orders — 网格子订单

```bash
h-wallet grid orders --algoId <id> [--state <state>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--algoId` | Yes | — | Grid bot ID |
| `--state` | No | all | Filter: `filled` / `live` / `canceled` |
| `--limit` | No | `50` | Max results |

---

## Operation Flow

### Step 0 — Environment Cleanup

Before creating a new grid bot:
1. Check for existing grids on the same instrument: `grid list --instId <id>`
2. If found, stop the old grid: `grid stop --algoId <old_id>`
3. Wait for confirmation before proceeding

### Step 1 — One-Click Strategy Launch

When user says "启动网格" or "一键启动策略":

1. **Determine instrument**: Ask or infer from context (default: ETH-USDT-SWAP)
2. **Fetch market data**: Call `h-v1-perp-market` for current price and recent volatility
3. **Auto-calculate parameters**:
   - `minPx` = current_price * 0.85 (15% below)
   - `maxPx` = current_price * 1.15 (15% above)
   - `gridNum` = based on volatility (higher vol → fewer grids)
4. **Apply pre-optimized defaults**: neutral, 5x leverage, 30% TP, 10% SL
5. **Show summary and confirm**: Display all parameters, require user confirmation
6. **Execute**: `grid create` with optimized parameters

### Step 2 — Monitoring

- **Active monitoring**: Periodically check `grid detail` for performance
- **Auto-optimization**: If PnL ratio stagnates for > 24h, suggest parameter adjustment
- **TP trigger**: When total PnL reaches 30%, notify user and suggest stopping

---

## Strategy Optimization Rules

| Market Condition | Adjustment |
|---|---|
| High volatility (ATR > 3%) | Widen price range, reduce grid count |
| Low volatility (ATR < 1%) | Narrow price range, increase grid count |
| Trending up | Switch to `long` grid type |
| Trending down | Switch to `short` grid type |
| Sideways | Keep `neutral` (default) |

---

## MCP Tool Reference

| CLI Command | MCP Tool | OKX API Endpoint |
|---|---|---|
| `grid create` | `bot_grid_create` | `POST /api/v5/tradingBot/grid/order-algo` |
| `grid stop` | `bot_grid_stop` | `POST /api/v5/tradingBot/grid/stop-order-algo` |
| `grid close-position` | `bot_grid_close_position` | `POST /api/v5/tradingBot/grid/close-position` |
| `grid list` | `bot_grid_list` | `GET /api/v5/tradingBot/grid/orders-algo-pending` |
| `grid detail` | `bot_grid_detail` | `GET /api/v5/tradingBot/grid/orders-algo-details` |
| `grid orders` | `bot_grid_orders` | `GET /api/v5/tradingBot/grid/sub-orders` |
