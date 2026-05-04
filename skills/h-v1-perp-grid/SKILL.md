---
name: h-v1-perp-grid
description: "Use this skill when the user asks to 'create grid bot', 'start grid strategy', 'neutral grid', 'contract grid', 'grid trading', 'stop grid', 'amend grid', 'grid status', 'grid profit', 'grid parameters', 'grid sub-orders', '创建网格', '启动网格策略', '中性网格', '合约网格', '网格交易', '停止网格', '修改网格', '网格状态', '网格收益', '网格参数', '网格子订单', '一键启动策略', or any request to create, monitor, amend, adjust, or stop a perpetual swap grid trading bot. Covers contract grid (USDT-M and coin-M), spot grid, grid amend (price range + TP/SL), and AI-recommended parameters. Requires API credentials. Do NOT use for market data (h-v1-perp-market), manual trading (h-v1-perp-trade), smart money (h-v1-perp-signal), or DCA bots (h-v1-perp-dca)."
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

# H Wallet 合约网格策略

Grid bot management on H Wallet. All bots are **native OKX server-side** — they run on OKX and do not require a local process. Covers contract grid (USDT-M, coin-M), spot grid, grid amend (price range + TP/SL + margin top-up), and monitoring.

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

## Prerequisites

```bash
npm install -g @h-wallet/trade-cli
h-wallet config init   # select site -> follow interactive setup
```

> **Security**: NEVER accept credentials in chat. Guide users to `h-wallet config init` for setup.

## Credential & Profile Check

**Run before every authenticated command.** The auth method is detected during [preflight](../_shared/preflight.md) Step 2 and remembered for the session.

### Step A — Verify credentials

Run **both** commands:

```bash
h-wallet config show --json      # reveals API-key profiles (TOML config)
h-wallet auth status --json      # reveals OAuth session state
```

Apply **in this order** — first match wins:

- `config show --json` has any profile with a non-empty `api_key` field → **API Key mode**. Proceed to Step B.
- No API-key profile **AND** `auth status --json` returns `"status":"logged_in"` → **OAuth mode**. Proceed to Step B.
- No API-key profile **AND** `"status":"pending"` — login is in progress, wait for it to complete.
- No API-key profile **AND** `"status":"not_logged_in"` — stop, load `h-v1-wallet-auth` skill and follow login steps, wait for completion.

### Step B — Confirm trading mode

Resolution:
1. User intent is clear ("real"/"实盘"/"live" → live; "test"/"模拟"/"demo" → demo) → use it, inform user
2. No explicit declaration → check conversation context for previous choice → reuse if found
3. Nothing found → ask: "Live (实盘) or Demo (模拟盘)?" — wait before proceeding

**How to apply the mode depends on auth method (detected in Step A):**

| Auth method | Live (实盘) | Demo (模拟盘) |
|---|---|---|
| **API Key** | `--profile <live-profile>` | `--profile <demo-profile>` |
| **OAuth** | *(no flag needed, live is default)* | `--demo` |

**After every command**: append `[mode: live]` or `[mode: demo]`

### Handling 401 Errors

**Authentication error** (error contains "401", "Session expired", or "Run `h-wallet auth login` first"):
1. Stop immediately
2. Load `h-v1-wallet-auth` skill and follow re-authentication steps
3. Retry original command

## Skill Routing

| Need | Skill |
|---|---|
| Market data, prices, depth, funding rates | `h-v1-perp-market` |
| Account balance, positions, fees | `h-v1-wallet-auth` |
| Regular swap orders (place/cancel/amend) | `h-v1-perp-trade` |
| Smart money signals | `h-v1-perp-signal` |
| DCA / Martingale bots | `h-v1-perp-dca` |
| **Grid bots** | **This skill** |

## Design Philosophy

> **核心理念**：策略预先优化，用户只需一键启动。

1. **中性网格优先**：默认以提高收益率为主要优化目标，适合震荡行情。
2. **内置止盈**：默认 30% 总收益止盈（tpRatio=0.3），避免长期持有。
3. **策略持续运营**：策略启动后持续运行，不需要用户频繁干预。
4. **环境清理**：部署新策略前，检查同一币种的旧网格，提醒用户。
5. **永不自动转账**：余额不足时报告差额，让用户决定。

## Command Index

### Grid Bot (11 commands)

| # | Command | Type | Description |
|---|---|---|---|
| 1 | `h-wallet bot grid create` | WRITE | Create a grid bot (spot or contract) |
| 2 | `h-wallet bot grid amend` | WRITE | Amend price range, grid count, or TP/SL of a running grid bot |
| 3 | `h-wallet bot grid stop` | WRITE | Stop a grid bot |
| 4 | `h-wallet bot grid close-position` | WRITE | Stop bot and close remaining position |
| 5 | `h-wallet bot grid orders` | READ | List active or history grid bots |
| 6 | `h-wallet bot grid details` | READ | Grid bot details + PnL |
| 7 | `h-wallet bot grid sub-orders` | READ | Individual grid fills or pending orders |
| 8 | `h-wallet bot grid ai-params` | READ | Get AI-recommended grid parameters |
| 9 | `h-wallet bot grid estimate` | READ | Estimate grid bot profitability |
| 10 | `h-wallet bot grid margin-balance` | READ | Check grid bot margin balance |
| 11 | `h-wallet bot grid top-up` | WRITE | Add margin to a running contract grid |

## Operation Flow

### Step 1 — Identify bot type and action

Parse user request → determine action (create / amend / stop / list / details).

### Step 2 — Execute

**READ commands** (orders, details, sub-orders, ai-params, estimate, margin-balance): run immediately after profile confirmation.

**WRITE commands** (create, amend, stop, close-position, top-up): confirm key parameters with user once before executing.

### Step 3 — Verify after writes

- After create → run `bot grid orders --algoOrdType contract_grid` to confirm active
- After amend → run `bot grid details` to confirm updated config
- After stop → run `bot grid orders --history` to confirm stopped
- After top-up → run `bot grid margin-balance` to confirm new margin

## CLI Command Reference

### Grid Bot — Create

```bash
h-wallet bot grid create --instId <id> --algoOrdType <type> \
  --maxPx <px> --minPx <px> --gridNum <n> \
  [--runType <1|2>] \
  [--quoteSz <n>] [--baseSz <n>] \
  [--direction <long|short|neutral>] [--lever <n>] [--sz <n>] \
  [--basePos] [--no-basePos] \
  [--tpTriggerPx <px>] [--slTriggerPx <px>] [--tpRatio <ratio>] [--slRatio <ratio>] \
  [--algoClOrdId <id>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument (e.g., `BTC-USDT` for spot, `BTC-USDT-SWAP` for USDT-M contract, `BTC-USD-SWAP` for coin-M contract) |
| `--algoOrdType` | Yes | - | `grid` (spot grid) or `contract_grid` (contract grid, including coin-margined) |
| `--maxPx` | Yes | - | Upper price boundary |
| `--minPx` | Yes | - | Lower price boundary |
| `--gridNum` | Yes | - | Grid levels (2–100) |
| `--runType` | No | `1` | `1`=arithmetic spacing, `2`=geometric spacing |
| `--quoteSz` | Cond. | - | USDT investment — spot grid only (provide `quoteSz` or `baseSz`) |
| `--baseSz` | Cond. | - | Base currency investment — spot grid only |
| `--direction` | Cond. | `neutral` | `long`, `short`, or `neutral` — required for contract grid |
| `--lever` | Cond. | `5` | Leverage (e.g., `5`) — contract grid only |
| `--sz` | Cond. | - | Investment margin in USDT (USDT-M) or coin (coin-M) — contract grid only |
| `--basePos` / `--no-basePos` | No | `true` | Open a base position at creation — contract grid only (ignored for neutral). Use `--no-basePos` to disable |
| `--tpTriggerPx` | No | - | Take-profit trigger price (mutually exclusive with `--tpRatio`) |
| `--slTriggerPx` | No | - | Stop-loss trigger price (mutually exclusive with `--slRatio`) |
| `--tpRatio` | No | `0.3` | Take-profit ratio — contract grid only (mutually exclusive with `--tpTriggerPx`). **H Wallet default: 30%** |
| `--slRatio` | No | `0.1` | Stop-loss ratio — contract grid only (mutually exclusive with `--slTriggerPx`). **H Wallet default: 10%** |
| `--algoClOrdId` | No | - | Client-defined algo order ID (1-32 alphanumeric). Unique per user, enables idempotent creation |

#### H Wallet Pre-optimized Defaults (中性网格)

| Setting | Default | Rationale |
|---|---|---|
| `algoOrdType` | `contract_grid` | 合约网格收益更高 |
| `direction` | `neutral` | 适合震荡行情，双向获利 |
| `lever` | `5` | 平衡收益与风险 |
| `tpRatio` | `0.3` (30%) | 震荡区间积极获利 |
| `slRatio` | `0.1` (10%) | 控制最大亏损 |
| `runType` | `1` (arithmetic) | 等差间距更适合震荡 |
| `basePos` | `true` | 开底仓增加收益 |

---

### Grid Bot — Amend

```bash
h-wallet bot grid amend --algoId <id> \
  [--maxPx <px> --minPx <px> --gridNum <n>] \
  [--instId <id>] \
  [--tpTriggerPx <px>] [--slTriggerPx <px>] \
  [--tpRatio <ratio>] [--slRatio <ratio>] \
  [--topUpAmt <n>] [--json]
```

Supports two modes that can be combined in one call:

**Price-range mode** — triggered when `--maxPx` is provided:

| Param | Required | Description |
|---|---|---|
| `--algoId` | Yes | Grid bot algo order ID |
| `--maxPx` | Yes | New upper price boundary |
| `--minPx` | Yes (with maxPx) | New lower price boundary |
| `--gridNum` | Yes (with maxPx) | New grid count (integer) |
| `--topUpAmt` | No | Extra margin to add (contract grid only; omit to auto-use minimum required) |

**TP/SL mode** — triggered when at least one TP/SL param is provided; `--instId` is also required:

| Param | Required | Description |
|---|---|---|
| `--instId` | Yes | Instrument ID (e.g., `BTC-USDT-SWAP`) |
| `--tpTriggerPx` | No | Take-profit trigger price (absolute). Pass `-1` to clear |
| `--slTriggerPx` | No | Stop-loss trigger price (absolute). Pass `-1` to clear |
| `--tpRatio` | No | Take-profit ratio (e.g., `0.1` = 10%). Contract grid only. Pass `-1` to clear |
| `--slRatio` | No | Stop-loss ratio (e.g., `0.1` = 10%). Contract grid only. Pass `-1` to clear |
| `--topUpAmt` | No | Extra margin to add (contract grid only) |

> **Note**: `tpTriggerPx`/`tpRatio` are mutually exclusive. Same for `slTriggerPx`/`slRatio`.

---

### Grid Bot — Stop

```bash
h-wallet bot grid stop --algoId <id> --algoOrdType <type> --instId <id> \
  [--stopType <1|2>] [--json]
```

> **`--algoId`** and **`--algoOrdType`** must come from `bot grid orders` output. The `algoOrdType` must match the bot's actual type — do not guess.

| `--stopType` | Behavior |
|---|---|
| `1` | Stop + close all positions at market (default) |
| `2` | Stop + keep current assets as-is |

---

### Grid Bot — Close Position

```bash
h-wallet bot grid close-position --algoId <id> --algoOrdType <type> --instId <id> [--json]
```

Stops the grid bot AND closes any remaining position at market price. Equivalent to `stop --stopType 1`.

---

### Grid Bot — List Orders

```bash
h-wallet bot grid orders --algoOrdType <type> [--instId <id>] [--algoId <id>] [--history] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--algoOrdType` | Yes | - | `grid` (spot), `contract_grid` (contract) |
| `--instId` | No | - | Filter by instrument |
| `--algoId` | No | - | Filter by algo order ID. NOT a normal trade order ID |
| `--history` | No | false | Show completed/stopped bots instead of active |

---

### Grid Bot — Details

```bash
h-wallet bot grid details --algoOrdType <type> --algoId <id> [--json]
```

Returns: bot config, current PnL (`pnlRatio`), grid range, number of grids, state, position info, TP/SL status.

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `algoId` | String | Bot ID |
| `instId` | String | Instrument |
| `algoOrdType` | String | Grid type |
| `state` | String | `running` / `stopping` / `stopped` |
| `direction` | String | `long` / `short` / `neutral` |
| `lever` | String | Leverage |
| `minPx` | String | Lower price bound |
| `maxPx` | String | Upper price bound |
| `gridNum` | String | Grid count |
| `totalPnl` | String | Total PnL (USDT) |
| `pnlRatio` | String | Total PnL ratio |
| `gridProfit` | String | Grid profit (from grid trades) |
| `floatProfit` | String | Floating profit (unrealized) |
| `investment` | String | Total investment |
| `runDuration` | String | Running duration (seconds) |
| `tpTriggerPx` | String | TP trigger price (if set) |
| `slTriggerPx` | String | SL trigger price (if set) |
| `tpRatio` | String | TP ratio (if set) |
| `slRatio` | String | SL ratio (if set) |

---

### Grid Bot — Sub-Orders

```bash
h-wallet bot grid sub-orders --algoOrdType <type> --algoId <id> [--live] [--json]
```

| Flag | Effect |
|---|---|
| *(default)* | Filled sub-orders (executed grid trades) |
| `--live` | Pending grid orders currently on the book |

---

### Grid Bot — AI Parameters

```bash
h-wallet bot grid ai-params --instId <id> --algoOrdType <type> [--direction <dir>] [--json]
```

Returns AI-recommended parameters based on recent market conditions:
- Recommended `minPx`, `maxPx`, `gridNum`
- Suggested `lever` and `direction`
- Expected annual yield estimate

---

### Grid Bot — Estimate

```bash
h-wallet bot grid estimate --instId <id> --algoOrdType <type> \
  --minPx <px> --maxPx <px> --gridNum <n> --sz <n> --lever <n> [--json]
```

Returns estimated profitability metrics before creating a bot.

---

### Grid Bot — Margin Balance

```bash
h-wallet bot grid margin-balance --algoId <id> --algoOrdType <type> [--json]
```

Returns current margin balance and utilization for a running contract grid.

---

### Grid Bot — Top Up Margin

```bash
h-wallet bot grid top-up --algoId <id> --algoOrdType <type> --amt <n> [--json]
```

| Param | Required | Description |
|---|---|---|
| `--algoId` | Yes | Grid bot ID |
| `--algoOrdType` | Yes | `contract_grid` |
| `--amt` | Yes | Amount to add (USDT for USDT-M, coin for coin-M) |

---

## Quickstart

```bash
# Contract grid: BTC perp, neutral, 5x, 100 USDT margin, 30% TP (H Wallet defaults)
h-wallet bot grid create --instId BTC-USDT-SWAP --algoOrdType contract_grid \
  --minPx 90000 --maxPx 100000 --gridNum 10 \
  --direction neutral --lever 5 --sz 100 --tpRatio 0.3 --slRatio 0.1

# Contract grid: ETH perp, long direction, 3x
h-wallet bot grid create --instId ETH-USDT-SWAP --algoOrdType contract_grid \
  --minPx 2800 --maxPx 3500 --gridNum 15 \
  --direction long --lever 3 --sz 200

# Coin-margined contract grid: BTC inverse perp
h-wallet bot grid create --instId BTC-USD-SWAP --algoOrdType contract_grid \
  --minPx 90000 --maxPx 100000 --gridNum 10 \
  --direction long --lever 5 --sz 0.01

# Spot grid: BTC $90k–$100k, 10 grids, 1000 USDT
h-wallet bot grid create --instId BTC-USDT --algoOrdType grid \
  --minPx 90000 --maxPx 100000 --gridNum 10 --quoteSz 1000

# Amend grid price range
h-wallet bot grid amend --algoId 3486105572796182528 --maxPx 102000 --minPx 88000 --gridNum 14

# Amend grid TP/SL
h-wallet bot grid amend --algoId 3486105572796182528 --instId BTC-USDT-SWAP --tpRatio 0.4 --slRatio 0.15

# Clear TP/SL (use =-1 syntax for negative values)
h-wallet bot grid amend --algoId 3486105572796182528 --instId BTC-USDT-SWAP --tpRatio=-1 --slRatio=-1

# List all active contract grids
h-wallet bot grid orders --algoOrdType contract_grid

# Get AI-recommended parameters
h-wallet bot grid ai-params --instId BTC-USDT-SWAP --algoOrdType contract_grid --direction neutral

# Stop a grid bot (close positions)
h-wallet bot grid stop --algoId 3486105572796182528 --algoOrdType contract_grid --instId BTC-USDT-SWAP --stopType 1
```

## Cross-Skill Workflows

### One-Click Grid Strategy Launch
> User: "一键启动 BTC 中性网格"

```
1. h-v1-perp-market    h-wallet market ticker BTC-USDT-SWAP              → confirm price is reasonable
2. h-v1-perp-grid      h-wallet bot grid ai-params --instId BTC-USDT-SWAP --algoOrdType contract_grid
                         → get AI-recommended minPx, maxPx, gridNum
3. h-v1-wallet-auth    h-wallet account balance USDT                      → confirm available funds
4. h-v1-perp-grid      h-wallet bot grid orders --algoOrdType contract_grid --instId BTC-USDT-SWAP
                         → check for existing grids on same instrument
        ↓ if existing grid found: ask user whether to stop old one first
        ↓ user approves parameters
5. h-v1-perp-grid      h-wallet bot grid create --instId BTC-USDT-SWAP --algoOrdType contract_grid \
                          --minPx <ai_min> --maxPx <ai_max> --gridNum <ai_num> \
                          --direction neutral --lever 5 --sz <user_amount> --tpRatio 0.3 --slRatio 0.1
6. h-v1-perp-grid      h-wallet bot grid orders --algoOrdType contract_grid → confirm bot is active
7. h-v1-perp-grid      h-wallet bot grid details --algoOrdType contract_grid --algoId <id> → show initial status
```

### Monitor and Adjust
> User: "网格收益怎么样了？"

```
1. h-v1-perp-grid      h-wallet bot grid orders --algoOrdType contract_grid → list all active bots
2. h-v1-perp-grid      h-wallet bot grid details --algoOrdType contract_grid --algoId <id> → detailed PnL
3. h-v1-perp-market    h-wallet market ticker <instId>                     → current price vs grid range
4. [ANALYZE]           Compare current price position within grid range:
                        - Price near maxPx → suggest widening upper bound
                        - Price near minPx → suggest widening lower bound
                        - PnL ratio > 30% → suggest taking profit
                        - PnL ratio stagnant > 24h → suggest parameter adjustment
```

## Edge Cases

### Grid Bot

- **Price out of range**: `--minPx` must be < current price < `--maxPx`; check with `h-v1-perp-market` first
- **Insufficient balance**: check `h-v1-wallet-auth` → `account balance` before creating. If insufficient, **do NOT auto-transfer** — report the shortfall and ask the user for instructions
- **Contract grid direction**: `long` (buys more at lower prices), `short` (sells at higher), `neutral` (both). Direction is required for contract grid
- **Contract grid basePos**: defaults to `true` — long/short grids automatically open a base position at creation. Neutral direction ignores this. Pass `--no-basePos` to disable
- **Contract grid --sz**: investment margin in USDT (USDT-M) or coin (coin-M), not number of contracts
- **Coin-margined grids**: use inverse instruments (e.g., `BTC-USD-SWAP`). Margin unit is the base coin (BTC), not USDT
- **Stop type**: `stopType 1` closes all positions (default); `stopType 2` keeps positions as-is for manual close
- **TP/SL**: `tpTriggerPx`/`tpRatio` and `slTriggerPx`/`slRatio` are mutually exclusive pairs. Ratio-based TP/SL is contract grid only
- **Amend — at least one mode required**: must provide either price-range params (`--maxPx`+`--minPx`+`--gridNum`) or TP/SL params; providing neither returns a validation error
- **Amend — combined mode**: price-range and TP/SL can be combined in one call (two sequential API requests internally)
- **Amend — clear TP/SL**: pass `--tpRatio=-1` or `--slRatio=-1` (use `=` syntax for negative values, not `--flag -1`)
- **Amend — contract grid topUpAmt**: if new range requires more margin, provide `--topUpAmt`; omit to auto-use the minimum required
- **Already stopped bot**: stop returns error — check `bot grid orders --history` first to confirm state
- **Insufficient margin (51340)**: extract required minimum from error, check balance via `h-v1-wallet-auth`, report shortfall to user — do NOT auto-transfer
- **Demo mode**: `h-wallet --demo bot grid create ...` (OAuth) or `h-wallet --profile <demo-profile> bot grid create ...` (API Key) — safe for testing, no real funds
- **algoClOrdId duplicate**: if the same `algoClOrdId` already exists, the API returns error code `51065`
- **Grid count range**: 2–100 grids. More grids = more frequent trades but smaller profit per trade

## Key Rules

- **Never auto-transfer funds.** If balance is insufficient for bot creation, report the shortfall (current available vs required) and ask the user how to proceed: (1) transfer funds manually, (2) reduce size, or (3) cancel.
- **`algoId`** is the bot's algo order ID (from create or list output). It is NOT a normal `ordId`. Never fabricate — always obtain from a prior command.
- **`algoOrdType`** for grid must match the bot's actual type. Always use the value from `bot grid orders` — do not infer from user description alone. Mismatch causes error `50016`.
- When operating on existing bots, **always list first** to get correct IDs, unless the user provides them explicitly.
- **TP/SL constraints**: `tpTriggerPx`/`tpRatio` and `slTriggerPx`/`slRatio` are mutually exclusive pairs.

## Communication Guidelines

- **Grid/DCA**: use "bot" not "strategy" (e.g., "grid bot", "网格机器人")
- **Chinese**: Grid = "网格", Contract Grid = "合约网格", Spot Grid = "现货网格"
- Use natural language for parameters — "What price range?" not "Enter minPx and maxPx"
- If the user already provides values, map directly — don't re-ask

### Parameter Display Names

> `{base}` and `{quote}`: extract from `instId` by splitting on `-`. E.g., `BTC-USDT-SWAP` → base=BTC, quote=USDT.

| API Field | EN | ZH |
|---|---|---|
| `instId` | Trading pair | 交易对 |
| `minPx` | Lower price bound | 网格下限价格 |
| `maxPx` | Upper price bound | 网格上限价格 |
| `gridNum` | Number of grids | 网格数量 |
| `sz` | Investment margin (USDT for USDT-M; {base} for coin-M) | 投入保证金 |
| `direction` | Direction (long / short / neutral) | 方向（做多 / 做空 / 中性） |
| `lever` | Leverage | 杠杆倍数 |
| `runType` | Spacing mode (1=arithmetic, 2=geometric) | 网格间距模式（1=等差, 2=等比） |
| `basePos` | Open base position | 是否开底仓 |
| `tpRatio` | Take-profit ratio | 止盈比例 |
| `slRatio` | Stop-loss ratio | 止损比例 |
| `totalPnl` | Total PnL | 总收益 |
| `pnlRatio` | PnL Ratio | 收益率 |
| `gridProfit` | Grid Profit | 网格利润 |
| `floatProfit` | Float Profit | 浮动盈亏 |

## Strategy Optimization Rules

| Market Condition | Adjustment |
|---|---|
| High volatility (ATR > 3%) | Widen price range, reduce grid count |
| Low volatility (ATR < 1%) | Narrow price range, increase grid count |
| Trending up | Switch to `long` grid type |
| Trending down | Switch to `short` grid type |
| Sideways | Keep `neutral` (default) |
| PnL ratio > 30% | Suggest stopping and taking profit |
| PnL stagnant > 24h | Suggest parameter adjustment |

## Global Notes

- All bots run on OKX servers — stopping the CLI does not affect them
- Auth method and trading mode are determined in "Credential & Profile Check"
- `--json` returns the raw OKX API v5 response by default. Add `--env` to wrap with environment context
- Rate limit: 20 requests per 2 seconds per UID
- Grid `--gridNum` range: 2–100

## MCP Tool Reference

| CLI Command | MCP Tool | OKX API Endpoint |
|---|---|---|
| `bot grid create` | `bot_grid_create` | `POST /api/v5/tradingBot/grid/order-algo` |
| `bot grid amend` | `bot_grid_amend` | `POST /api/v5/tradingBot/grid/amend-order-algo` |
| `bot grid stop` | `bot_grid_stop` | `POST /api/v5/tradingBot/grid/stop-order-algo` |
| `bot grid close-position` | `bot_grid_close_position` | `POST /api/v5/tradingBot/grid/close-position` |
| `bot grid orders` | `bot_grid_orders` | `GET /api/v5/tradingBot/grid/orders-algo-pending` |
| `bot grid details` | `bot_grid_details` | `GET /api/v5/tradingBot/grid/orders-algo-details` |
| `bot grid sub-orders` | `bot_grid_sub_orders` | `GET /api/v5/tradingBot/grid/sub-orders` |
| `bot grid ai-params` | `bot_grid_ai_params` | `GET /api/v5/tradingBot/grid/ai-param` |
| `bot grid estimate` | `bot_grid_estimate` | `POST /api/v5/tradingBot/grid/compute-margin-balance` |
| `bot grid margin-balance` | `bot_grid_margin_balance` | `GET /api/v5/tradingBot/grid/margin-balance` |
| `bot grid top-up` | `bot_grid_top_up` | `POST /api/v5/tradingBot/grid/adjust-investment` |
