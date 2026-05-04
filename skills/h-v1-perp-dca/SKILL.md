---
name: h-v1-perp-dca
description: "Use this skill when the user asks to 'create DCA bot', 'start DCA strategy', 'martingale', 'dollar cost averaging', 'DCA bot', 'stop DCA', 'amend DCA', 'DCA status', 'DCA profit', 'DCA parameters', '创建DCA', '启动DCA策略', '马丁格尔', '定投', 'DCA机器人', '停止DCA', '修改DCA', 'DCA状态', 'DCA收益', 'DCA参数', '自动补仓', '循环策略', or any request to create, monitor, amend, adjust, or stop a DCA / Martingale trading bot on perpetual swaps. Covers contract DCA (USDT-M and coin-M), spot DCA, DCA amend (TP/SL + cycle + max orders), and AI-recommended parameters. Requires API credentials. Do NOT use for market data (h-v1-perp-market), manual trading (h-v1-perp-trade), smart money (h-v1-perp-signal), or grid bots (h-v1-perp-grid)."
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

# H Wallet 合约马丁格尔 / DCA 策略

DCA (Dollar-Cost Averaging) / Martingale bot management on H Wallet. All bots are **native OKX server-side** — they run on OKX and do not require a local process. Covers contract DCA (USDT-M, coin-M), spot DCA, DCA amend (TP/SL + cycle + max orders), and monitoring.

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

## Prerequisites

```bash
npm install -g @h-wallet/trade-cli
h-wallet config init   # select site -> follow interactive setup
```

## Credential & Profile Check

**Run before every authenticated command.** The auth method is detected during [preflight](../_shared/preflight.md) Step 2 and remembered for the session.

### Step A — Verify credentials

Run **both** commands:

```bash
h-wallet config show --json      # reveals API-key profiles (TOML config)
h-wallet auth status --json      # reveals OAuth session state
```

Apply **in this order** — first match wins:

- `config show --json` has any profile with a non-empty `api_key` field → **API Key mode**
- No API-key profile **AND** `auth status --json` returns `"status":"logged_in"` → **OAuth mode**
- No API-key profile **AND** `"status":"pending"` — wait for login completion
- No API-key profile **AND** `"status":"not_logged_in"` — stop, load `h-v1-wallet-auth` skill

### Step B — Confirm trading mode

1. User intent is clear → use it, inform user
2. No explicit declaration → check conversation context → reuse if found
3. Nothing found → ask: "Live (实盘) or Demo (模拟盘)?"

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
| Smart money signals | `h-v1-perp-signal` |
| Grid bots | `h-v1-perp-grid` |
| **DCA / Martingale bots** | **This skill** |

## Design Philosophy

> **核心理念**：震荡行情下自动补仓、动态止盈，循环赚取利润。

1. **马丁格尔策略**：价格逆向移动时自动加仓，摊薄成本。
2. **动态止盈**：基于均价计算止盈价，每次补仓后止盈价自动调整。
3. **自动循环**：止盈后自动重新开始新一轮 DCA，持续运营。
4. **风控内置**：默认最大补仓次数限制 + 止损保护。
5. **永不自动转账**：余额不足时报告差额，让用户决定。

## Command Index

### DCA Bot (10 commands)

| # | Command | Type | Description |
|---|---|---|---|
| 1 | `h-wallet bot dca create` | WRITE | Create a DCA / Martingale bot |
| 2 | `h-wallet bot dca amend` | WRITE | Amend TP/SL, cycle count, or max orders |
| 3 | `h-wallet bot dca stop` | WRITE | Stop a DCA bot |
| 4 | `h-wallet bot dca close-position` | WRITE | Stop bot and close remaining position |
| 5 | `h-wallet bot dca orders` | READ | List active or history DCA bots |
| 6 | `h-wallet bot dca details` | READ | DCA bot details + PnL |
| 7 | `h-wallet bot dca sub-orders` | READ | Individual DCA fills or pending orders |
| 8 | `h-wallet bot dca ai-params` | READ | Get AI-recommended DCA parameters |
| 9 | `h-wallet bot dca margin-balance` | READ | Check DCA bot margin balance |
| 10 | `h-wallet bot dca top-up` | WRITE | Add margin to a running contract DCA |

## Operation Flow

### Step 1 — Identify action

Parse user request → determine action (create / amend / stop / list / details).

### Step 2 — Execute

**READ commands**: run immediately after profile confirmation.

**WRITE commands**: confirm key parameters with user once before executing.

### Step 3 — Verify after writes

- After create → run `bot dca orders --algoOrdType contract_dca` to confirm active
- After amend → run `bot dca details` to confirm updated config
- After stop → run `bot dca orders --history` to confirm stopped
- After top-up → run `bot dca margin-balance` to confirm new margin

## CLI Command Reference

### DCA Bot — Create

```bash
h-wallet bot dca create --instId <id> --algoOrdType <type> --direction <long|short> \
  --maxOrd <n> --initSz <n> --stepSz <n> --stepRatio <r> \
  [--lever <n>] [--tpRatio <r>] [--slRatio <r>] \
  [--tpTriggerPx <px>] [--slTriggerPx <px>] \
  [--priceStep <r>] [--priceStepType <1|2>] \
  [--szMultiplier <n>] \
  [--maxCycles <n>] \
  [--algoClOrdId <id>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument (e.g., `BTC-USDT-SWAP` for USDT-M, `BTC-USD-SWAP` for coin-M, `BTC-USDT` for spot) |
| `--algoOrdType` | Yes | - | `dca` (spot DCA) or `contract_dca` (contract DCA) |
| `--direction` | Yes | - | `long` (buy dips) or `short` (sell rallies) |
| `--maxOrd` | Yes | - | Maximum number of safety orders (补仓次数上限, 2–50) |
| `--initSz` | Yes | - | Initial order size (USDT for USDT-M, coin for coin-M, quote for spot) |
| `--stepSz` | No | same as initSz | Safety order size (each subsequent order before multiplier) |
| `--stepRatio` | Yes | - | Price deviation trigger for each safety order (e.g., `0.01` = 1%) |
| `--lever` | No | `5` | Leverage — contract DCA only |
| `--tpRatio` | No | `0.05` | Take-profit ratio from average price (e.g., `0.05` = 5%). **H Wallet default: 5%** |
| `--slRatio` | No | `0.15` | Stop-loss ratio from average price. **H Wallet default: 15%** |
| `--tpTriggerPx` | No | - | Absolute TP trigger price (mutually exclusive with `--tpRatio`) |
| `--slTriggerPx` | No | - | Absolute SL trigger price (mutually exclusive with `--slRatio`) |
| `--priceStep` | No | same as stepRatio | Price step multiplier between safety orders (e.g., `1.5` = each subsequent order triggers 1.5x further from avg) |
| `--priceStepType` | No | `1` | `1` = arithmetic (constant step), `2` = geometric (increasing step) |
| `--szMultiplier` | No | `1.5` | Size multiplier for each subsequent safety order (e.g., `1.5` = 50% increase per order, Martingale style) |
| `--maxCycles` | No | unlimited | Maximum number of TP cycles before auto-stop. Omit = infinite cycling |
| `--algoClOrdId` | No | - | Client-defined algo order ID (1-32 alphanumeric) |

#### H Wallet Pre-optimized Defaults (合约马丁格尔)

| Setting | Default | Rationale |
|---|---|---|
| `algoOrdType` | `contract_dca` | 合约 DCA 收益更高 |
| `direction` | `long` | 适合震荡偏多行情 |
| `lever` | `5` | 平衡收益与风险 |
| `tpRatio` | `0.05` (5%) | 快速止盈，频繁循环 |
| `slRatio` | `0.15` (15%) | 控制最大亏损 |
| `szMultiplier` | `1.5` | 马丁格尔加仓倍数 |
| `priceStepType` | `2` (geometric) | 越跌越远才补仓，避免过早耗尽资金 |
| `maxCycles` | unlimited | 持续循环赚取利润 |

#### Martingale vs Conservative DCA

| Mode | szMultiplier | priceStepType | Risk | Return |
|---|---|---|---|---|
| **Martingale (激进)** | 1.5–2.0 | `2` (geometric) | Higher — larger positions on deeper dips | Higher — faster cost averaging |
| **Conservative (保守)** | 1.0 | `1` (arithmetic) | Lower — equal-size orders | Lower — slower cost averaging |
| **Custom** | Any | Any | User-defined | User-defined |

#### Max Investment Calculation

Total max investment = `initSz + stepSz × Σ(szMultiplier^i)` for i = 1 to maxOrd

Example (initSz=100, stepSz=100, szMultiplier=1.5, maxOrd=5):
- Order 1 (initial): 100
- Order 2: 100 × 1.5 = 150
- Order 3: 100 × 1.5² = 225
- Order 4: 100 × 1.5³ = 337.5
- Order 5: 100 × 1.5⁴ = 506.25
- Order 6: 100 × 1.5⁵ = 759.38
- **Total max: ~2,178 USDT**

Always show this calculation to the user before creating a bot.

---

### DCA Bot — Amend

```bash
h-wallet bot dca amend --algoId <id> --instId <id> \
  [--tpRatio <r>] [--slRatio <r>] \
  [--tpTriggerPx <px>] [--slTriggerPx <px>] \
  [--maxOrd <n>] [--maxCycles <n>] \
  [--json]
```

| Param | Required | Description |
|---|---|---|
| `--algoId` | Yes | DCA bot algo order ID |
| `--instId` | Yes | Instrument ID |
| `--tpRatio` | No | New TP ratio. Pass `-1` to clear |
| `--slRatio` | No | New SL ratio. Pass `-1` to clear |
| `--tpTriggerPx` | No | New absolute TP price. Pass `-1` to clear |
| `--slTriggerPx` | No | New absolute SL price. Pass `-1` to clear |
| `--maxOrd` | No | New max safety orders |
| `--maxCycles` | No | New max cycles. Pass `0` for unlimited |

---

### DCA Bot — Stop

```bash
h-wallet bot dca stop --algoId <id> --algoOrdType <type> --instId <id> \
  [--stopType <1|2>] [--json]
```

| `--stopType` | Behavior |
|---|---|
| `1` | Stop + close all positions at market (default) |
| `2` | Stop + keep current assets as-is |

---

### DCA Bot — Close Position

```bash
h-wallet bot dca close-position --algoId <id> --algoOrdType <type> --instId <id> [--json]
```

Stops the DCA bot AND closes any remaining position at market price.

---

### DCA Bot — List Orders

```bash
h-wallet bot dca orders --algoOrdType <type> [--instId <id>] [--algoId <id>] [--history] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--algoOrdType` | Yes | - | `dca` (spot) or `contract_dca` (contract) |
| `--instId` | No | - | Filter by instrument |
| `--algoId` | No | - | Filter by algo order ID |
| `--history` | No | false | Show completed/stopped bots |

---

### DCA Bot — Details

```bash
h-wallet bot dca details --algoOrdType <type> --algoId <id> [--json]
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `algoId` | String | Bot ID |
| `instId` | String | Instrument |
| `algoOrdType` | String | DCA type |
| `state` | String | `running` / `stopping` / `stopped` |
| `direction` | String | `long` / `short` |
| `lever` | String | Leverage |
| `initSz` | String | Initial order size |
| `stepSz` | String | Safety order size |
| `szMultiplier` | String | Size multiplier |
| `maxOrd` | String | Max safety orders |
| `curCycle` | String | Current cycle number |
| `maxCycles` | String | Max cycles (0 = unlimited) |
| `totalPnl` | String | Total PnL (all cycles) |
| `pnlRatio` | String | Total PnL ratio |
| `curPnl` | String | Current cycle PnL |
| `avgPx` | String | Current average entry price |
| `curSz` | String | Current total position size |
| `filledOrd` | String | Safety orders filled in current cycle |
| `tpRatio` | String | TP ratio |
| `slRatio` | String | SL ratio |
| `investment` | String | Total investment |
| `runDuration` | String | Running duration (seconds) |

---

### DCA Bot — Sub-Orders

```bash
h-wallet bot dca sub-orders --algoOrdType <type> --algoId <id> [--live] [--json]
```

| Flag | Effect |
|---|---|
| *(default)* | Filled sub-orders (executed DCA trades) |
| `--live` | Pending safety orders on the book |

---

### DCA Bot — AI Parameters

```bash
h-wallet bot dca ai-params --instId <id> --algoOrdType <type> [--direction <dir>] [--json]
```

Returns AI-recommended parameters based on recent market conditions:
- Recommended `initSz`, `stepSz`, `stepRatio`, `maxOrd`
- Suggested `lever`, `direction`, `szMultiplier`
- Expected cycle frequency and annual yield estimate

---

### DCA Bot — Margin Balance

```bash
h-wallet bot dca margin-balance --algoId <id> --algoOrdType <type> [--json]
```

---

### DCA Bot — Top Up Margin

```bash
h-wallet bot dca top-up --algoId <id> --algoOrdType <type> --amt <n> [--json]
```

---

## Quickstart

```bash
# Contract DCA: BTC perp long, 5x, 100U initial, 5 safety orders, 1% step, Martingale 1.5x
h-wallet bot dca create --instId BTC-USDT-SWAP --algoOrdType contract_dca \
  --direction long --lever 5 --initSz 100 --maxOrd 5 --stepRatio 0.01 \
  --szMultiplier 1.5 --priceStepType 2 --tpRatio 0.05 --slRatio 0.15

# Contract DCA: ETH perp short, conservative (equal size, arithmetic step)
h-wallet bot dca create --instId ETH-USDT-SWAP --algoOrdType contract_dca \
  --direction short --lever 3 --initSz 50 --maxOrd 8 --stepRatio 0.015 \
  --szMultiplier 1.0 --priceStepType 1 --tpRatio 0.03 --slRatio 0.1

# Spot DCA: BTC, buy dips
h-wallet bot dca create --instId BTC-USDT --algoOrdType dca \
  --direction long --initSz 200 --maxOrd 5 --stepRatio 0.02 \
  --tpRatio 0.05 --slRatio 0.1

# Get AI-recommended parameters
h-wallet bot dca ai-params --instId BTC-USDT-SWAP --algoOrdType contract_dca --direction long

# List active contract DCA bots
h-wallet bot dca orders --algoOrdType contract_dca

# Get DCA bot details
h-wallet bot dca details --algoOrdType contract_dca --algoId 3486105572796182528

# Amend TP ratio
h-wallet bot dca amend --algoId 3486105572796182528 --instId BTC-USDT-SWAP --tpRatio 0.08

# Stop DCA bot (close positions)
h-wallet bot dca stop --algoId 3486105572796182528 --algoOrdType contract_dca --instId BTC-USDT-SWAP --stopType 1
```

## Cross-Skill Workflows

### One-Click DCA Launch
> User: "启动 BTC 马丁格尔策略，500U"

```
1. h-v1-perp-market    h-wallet market ticker BTC-USDT-SWAP              → confirm price
2. h-v1-perp-dca       h-wallet bot dca ai-params --instId BTC-USDT-SWAP --algoOrdType contract_dca --direction long
                         → get AI-recommended params
3. h-v1-wallet-auth    h-wallet account balance USDT                      → confirm ≥ max investment
4. h-v1-perp-dca       h-wallet bot dca orders --algoOrdType contract_dca --instId BTC-USDT-SWAP
                         → check for existing DCA bots
        ↓ show investment breakdown to user:
          "初始仓 100U + 最多 5 次补仓 (1.5x 递增) = 最大投入约 2,178U"
        ↓ user approves parameters
5. h-v1-perp-dca       h-wallet bot dca create --instId BTC-USDT-SWAP --algoOrdType contract_dca \
                          --direction long --lever 5 --initSz 100 --maxOrd 5 --stepRatio 0.01 \
                          --szMultiplier 1.5 --priceStepType 2 --tpRatio 0.05 --slRatio 0.15
6. h-v1-perp-dca       h-wallet bot dca orders --algoOrdType contract_dca → confirm active
7. h-v1-perp-dca       h-wallet bot dca details --algoOrdType contract_dca --algoId <id> → show status
```

### Signal-Driven DCA Direction
> User: "看看聪明钱方向，然后帮我开个 DCA"

```
1. h-v1-perp-signal    h-wallet signal consensus --instId BTC-USDT-SWAP
   → Determine smart money direction (long/short)
2. [REPORT]            Present signal and suggested direction to user
3. [WAIT]              Wait for user confirmation on direction
4. h-v1-perp-dca       h-wallet bot dca create ... --direction <signal_direction>
```

### Monitor DCA Cycle Progress
> User: "DCA 到第几轮了？"

```
1. h-v1-perp-dca       h-wallet bot dca orders --algoOrdType contract_dca → list all active
2. h-v1-perp-dca       h-wallet bot dca details --algoOrdType contract_dca --algoId <id>
   → Show: curCycle, filledOrd/maxOrd, avgPx, curPnl, totalPnl
3. h-v1-perp-market    h-wallet market ticker <instId> → current price vs avgPx
4. [ANALYZE]           Distance to TP, distance to next safety order, margin utilization
```

### DCA with Grid Combo Strategy
> User: "BTC 用网格 + DCA 组合策略"

```
1. h-v1-perp-market    h-wallet market ticker BTC-USDT-SWAP → current price
2. h-v1-perp-grid      h-wallet bot grid create ... → grid for range-bound profit
3. h-v1-perp-dca       h-wallet bot dca create ... → DCA for dip-buying
   → Grid handles sideways; DCA handles dips. Both run simultaneously.
```

## Edge Cases

- **Insufficient balance**: check before creating. If insufficient, **do NOT auto-transfer** — report shortfall and max investment calculation
- **Direction**: `long` buys dips (price drops trigger safety orders), `short` sells rallies (price rises trigger safety orders)
- **szMultiplier**: `1.0` = equal-size orders (conservative); `1.5`–`2.0` = Martingale (aggressive); `> 2.0` = extreme risk — warn user
- **priceStepType**: `1` = arithmetic (constant percentage step); `2` = geometric (increasing percentage step). Geometric is safer — prevents early exhaustion of safety orders
- **maxOrd**: 2–50. More orders = more capital required but better cost averaging. Always show max investment calculation
- **maxCycles**: `0` or omit = unlimited cycling. Set a number to auto-stop after N profitable cycles
- **TP/SL**: ratio-based (`tpRatio`/`slRatio`) and absolute-price-based (`tpTriggerPx`/`slTriggerPx`) are mutually exclusive
- **Coin-margined DCA**: use inverse instruments (`BTC-USD-SWAP`). `initSz` and `stepSz` are in base coin (BTC). Warn user about coin-margined risk
- **Already stopped bot**: stop returns error — check `bot dca orders --history` first
- **Insufficient margin (51340)**: report shortfall, do NOT auto-transfer
- **Demo mode**: `h-wallet --demo bot dca create ...` (OAuth) or `h-wallet --profile <demo-profile> bot dca create ...` (API Key)
- **algoClOrdId duplicate**: error code `51065`
- **Rate limit**: 20 requests per 2 seconds per UID
- **Dynamic TP**: when safety orders are filled, the system automatically adjusts TP price based on new average entry. No manual intervention needed
- **Cycle restart**: after TP, bot waits briefly then opens a new initial position. If market has moved significantly, new entry may be at a very different price

## Key Rules

- **Never auto-transfer funds.** Report shortfall and max investment breakdown, ask user.
- **Always show max investment calculation** before creating a bot.
- **`algoId`** is the bot's algo order ID — always obtain from `bot dca orders`, never fabricate.
- **`algoOrdType`** must match the bot's actual type from list output.
- When operating on existing bots, **always list first** to get correct IDs.
- **TP/SL constraints**: ratio-based and absolute-price-based are mutually exclusive.

## Communication Guidelines

- Use "DCA bot" or "马丁格尔机器人" for DCA bots
- Explain Martingale concept simply: "价格下跌时自动加仓，摊薄成本，反弹后止盈"
- Always show investment breakdown before creation
- Warn about Martingale risk: "马丁格尔策略在单边下跌行情中风险较高"

### Parameter Display Names

| API Field | EN | ZH |
|---|---|---|
| `instId` | Trading pair | 交易对 |
| `direction` | Direction | 方向（做多 / 做空） |
| `initSz` | Initial order size | 首单金额 |
| `stepSz` | Safety order size | 补仓金额 |
| `stepRatio` | Price deviation trigger | 补仓触发跌幅 |
| `maxOrd` | Max safety orders | 最大补仓次数 |
| `szMultiplier` | Size multiplier | 加仓倍数 |
| `priceStepType` | Step type (1=arithmetic, 2=geometric) | 步进类型（1=等差, 2=等比） |
| `lever` | Leverage | 杠杆倍数 |
| `tpRatio` | Take-profit ratio | 止盈比例 |
| `slRatio` | Stop-loss ratio | 止损比例 |
| `curCycle` | Current cycle | 当前轮次 |
| `maxCycles` | Max cycles | 最大轮次 |
| `avgPx` | Average entry price | 均价 |
| `totalPnl` | Total PnL | 总收益 |
| `pnlRatio` | PnL ratio | 收益率 |
| `filledOrd` | Filled safety orders | 已补仓次数 |

## Strategy Switching Logic

| Condition | Action |
|---|---|
| Market trending strongly (RSI > 70 or < 30) | Suggest switching to `h-v1-perp-grid` or manual trade |
| High volatility + sideways | DCA performs well, continue |
| Funding rate > 0.1% (for longs) | Warn about funding cost |
| Max orders filled + price still dropping | Alert user, suggest manual SL or top-up |
| PnL ratio > 30% after multiple cycles | Suggest reducing size or taking profit |

## MCP Tool Reference

| CLI Command | MCP Tool | OKX API Endpoint |
|---|---|---|
| `bot dca create` | `bot_dca_create` | `POST /api/v5/tradingBot/recurring/order-algo` |
| `bot dca amend` | `bot_dca_amend` | `POST /api/v5/tradingBot/recurring/amend-order-algo` |
| `bot dca stop` | `bot_dca_stop` | `POST /api/v5/tradingBot/recurring/stop-order-algo` |
| `bot dca close-position` | `bot_dca_close_position` | `POST /api/v5/tradingBot/recurring/close-position` |
| `bot dca orders` | `bot_dca_orders` | `GET /api/v5/tradingBot/recurring/orders-algo-pending` |
| `bot dca details` | `bot_dca_details` | `GET /api/v5/tradingBot/recurring/orders-algo-details` |
| `bot dca sub-orders` | `bot_dca_sub_orders` | `GET /api/v5/tradingBot/recurring/sub-orders` |
| `bot dca ai-params` | `bot_dca_ai_params` | `GET /api/v5/tradingBot/recurring/ai-param` |
| `bot dca margin-balance` | `bot_dca_margin_balance` | `GET /api/v5/tradingBot/recurring/margin-balance` |
| `bot dca top-up` | `bot_dca_top_up` | `POST /api/v5/tradingBot/recurring/adjust-investment` |
