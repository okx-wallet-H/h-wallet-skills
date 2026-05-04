---
name: h-v2-meme-sniper
description: "Use this skill when the user asks about 'snipe token', 'buy meme', 'auto buy', 'quick buy', 'meme sniper', 'swap token', 'dex swap', 'sell token', 'take profit', 'stop loss', 'auto trade meme', '狙击', '买入Meme', '自动买入', '快速买入', 'Meme狙击', '兑换代币', 'DEX兑换', '卖出代币', '止盈', '止损', '自动交易Meme', '打新', '冲土狗', '100U战神', '短期套利', '链上自动交易', or any request to automatically buy, sell, or manage positions in onchain meme tokens via DEX aggregator. Covers automated sniping with configurable TP/SL, manual DEX swaps, position monitoring, and batch operations. Requires an active Agentic Wallet (h-v2-agentic-wallet). Do NOT use for CEX trading (h-v1-perp-trade), market data only (h-v2-meme-market), or wallet management (h-v2-agentic-wallet)."
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

# H Wallet Meme 狙击器 (Onchain Auto-Sniper)

Automated meme token sniping and position management via OKX Onchain OS DEX aggregator. Supports one-click buy with preset TP/SL, continuous monitoring, batch position management, and intelligent exit strategies. All trades execute through DEX aggregation for best price routing across 30+ chains.

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

## Prerequisites

```bash
npm install -g @h-wallet/trade-cli
```

**Required before first use:**
1. Active Agentic Wallet (`h-wallet wallet status` → `active`)
2. Sufficient USDT balance in a sub-wallet with purpose `sniper`
3. Native token for gas (OKB on X Layer, SOL on Solana, ETH on Base, etc.)

> If no sniper sub-wallet exists, guide user to create one via `h-v2-agentic-wallet`.

## Credential & Profile Check

### Step A — Verify wallet and balance

```bash
h-wallet wallet status --json                    # wallet must be active
h-wallet wallet sub-list --purpose sniper --json # must have sniper sub-wallet
h-wallet wallet balance-detail --chain <chainId> --json  # check USDT + gas balance
```

| Check | Pass | Fail Action |
|---|---|---|
| Wallet active | `status: active` | → `h-v2-agentic-wallet` for creation |
| Sniper sub-wallet exists | Found in sub-list | → Create: `wallet sub-create --name "Sniper" --purpose sniper` |
| USDT balance ≥ trade amount | balance ≥ amount | → Report shortfall, suggest deposit |
| Gas balance > 0 | native > 0 | → Suggest bridging native token |

### Step B — Security pre-check (MANDATORY)

Before ANY buy operation, automatically run:
```bash
h-wallet security scan --token <address> --chain <chainId> --json
```

| Risk Level | Action |
|---|---|
| `Safe` | Proceed with trade |
| `Warning` | Show warnings, ask user to confirm |
| `Danger` | **BLOCK trade**, show reasons, refuse to execute |

## Skill Routing

| Need | Skill |
|---|---|
| Token discovery and analysis | `h-v2-meme-market` |
| Wallet creation and balance | `h-v2-agentic-wallet` |
| Token security scanning | `h-v2-security-guard` |
| CEX perpetual trading | `h-v1-perp-trade` |
| Strategy orchestration | `h-v2-smart-switch` |
| **Meme token buying/selling** | **This skill** |

## Design Philosophy

> **核心理念**：100U 战神模式，全自动狙击，严格风控。

1. **默认 100U**：每次狙击默认投入 100 USDT，小仓位高频操作。
2. **自动止盈止损**：默认 TP=30%, SL=20%，到达即自动卖出。
3. **安全前置**：每次买入前自动调用安全扫描，拒绝貔貅盘。
4. **子钱包隔离**：所有狙击操作在 sniper 子钱包中执行，不影响主钱包。
5. **最优路由**：通过 DEX 聚合器自动选择最优交易路径，最小化滑点。
6. **持续监控**：买入后持续监控价格，达到 TP/SL 自动执行卖出。
7. **时间止损**：超过最大持仓时间（默认 60 分钟）自动退出。
8. **多链支持**：优先 Solana/Base/X Layer，利用低 Gas 和高速度。

## Command Index (10 commands)

### Buy Operations (3 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 1 | `h-wallet sniper buy` | WRITE | Yes | Buy a meme token (with auto TP/SL) |
| 2 | `h-wallet sniper quick-buy` | WRITE | Yes | One-click buy with all defaults (100U, 30% TP, 20% SL) |
| 3 | `h-wallet sniper batch-buy` | WRITE | Yes | Buy multiple tokens at once |

### Sell Operations (3 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 4 | `h-wallet sniper sell` | WRITE | Yes | Sell a token position (partial or full) |
| 5 | `h-wallet sniper sell-all` | WRITE | Yes | Sell all positions (emergency exit) |
| 6 | `h-wallet sniper close` | WRITE | Yes | Close a specific position (sell 100% + remove monitor) |

### Position Management (3 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 7 | `h-wallet sniper positions` | READ | Yes | List all open positions with PnL |
| 8 | `h-wallet sniper position-detail` | READ | Yes | Detailed view of a single position |
| 9 | `h-wallet sniper amend` | WRITE | Yes | Amend TP/SL/time-exit of an open position |

### System (1 command)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 10 | `h-wallet sniper status` | READ | Yes | Sniper system status and active monitors |

---

## CLI Command Reference

### sniper buy — 买入代币

```bash
h-wallet sniper buy --token <address> --chain <chainId> \
  [--amount <n>] [--tp <pct>] [--sl <pct>] [--timeExit <min>] \
  [--slippage <pct>] [--wallet <subWalletId>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--token` | Yes | - | Token contract address |
| `--chain` | Yes | - | Chain ID (501=Solana, 8453=Base, 196=X Layer, 1=ETH, 56=BSC) |
| `--amount` | No | `100` | Investment amount in USDT |
| `--tp` | No | `30` | Take-profit percentage (%) |
| `--sl` | No | `20` | Stop-loss percentage (%) |
| `--timeExit` | No | `60` | Max holding time in minutes (0=disabled) |
| `--slippage` | No | `1.0` | Max slippage tolerance (%) |
| `--wallet` | No | first sniper wallet | Sub-wallet ID to use |

#### Execution Flow (internal)

```
1. Validate wallet + balance
2. Security scan → PASS/BLOCK
3. Get best swap route via DEX aggregator (multi-hop if needed)
4. Estimate output amount and price impact
5. Show trade preview to user (MANDATORY)
6. (user confirms or --quick flag)
7. Execute swap transaction via TEE wallet
8. Register TP/SL/Time-exit monitor
9. Return position details + explorer link
```

#### Pre-Trade Preview (MUST show before executing)

```
┌─────────────────────────────────────────┐
│ 买入确认                                  │
├─────────────────────────────────────────┤
│ 代币: $PEPE (0x6982...1933)              │
│ 链: Ethereum                             │
│ 投入: 100 USDT                           │
│ 预计获得: 12,345,678 PEPE                │
│ 价格影响: 0.3%                           │
│ 滑点保护: 1.0%                           │
│ 路由: USDT → WETH → PEPE (Uniswap V3)   │
│ Gas 费: ~$2.50                           │
│ 止盈: +30% (自动卖出)                    │
│ 止损: -20% (自动卖出)                    │
│ 时间止损: 60 分钟后自动退出               │
│ 安全检查: ✓ 通过                          │
└─────────────────────────────────────────┘
确认买入？(Y/N)
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `positionId` | String | Position tracking ID |
| `txHash` | String | Buy transaction hash |
| `token` | String | Token symbol |
| `tokenAddress` | String | Contract address |
| `chain` | String | Chain name |
| `chainId` | Integer | Chain ID |
| `amountIn` | String | USDT spent |
| `amountOut` | String | Tokens received |
| `avgPrice` | String | Average buy price (USDT per token) |
| `priceImpact` | String | Actual price impact (%) |
| `route` | String | Swap route description |
| `gasFee` | String | Gas fee paid (native + USD) |
| `tp` | String | Take-profit target (%) |
| `sl` | String | Stop-loss target (%) |
| `timeExit` | String | Time-exit deadline (ISO timestamp) |
| `status` | String | `monitoring` |
| `explorerUrl` | String | Transaction explorer link |
| `monitorId` | String | TP/SL monitor ID |

---

### sniper quick-buy — 一键快速买入

```bash
h-wallet sniper quick-buy --token <address> --chain <chainId> [--json]
```

Identical to `sniper buy` but uses ALL defaults without additional prompting:
- Amount: 100 USDT
- TP: 30%
- SL: 20%
- Time-exit: 60 minutes
- Slippage: 1.0%
- Wallet: first sniper sub-wallet

> Still performs security scan and shows preview. Only skips parameter questions.

---

### sniper batch-buy — 批量买入

```bash
h-wallet sniper batch-buy --tokens <addr1,addr2,...> --chain <chainId> \
  [--amount <n>] [--tp <pct>] [--sl <pct>] [--timeExit <min>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--tokens` | Yes | - | Comma-separated token addresses (max 10) |
| `--chain` | Yes | - | Chain ID (all tokens must be on same chain) |
| `--amount` | No | `100` | Amount per token (USDT) |
| `--tp` | No | `30` | TP for all positions |
| `--sl` | No | `20` | SL for all positions |
| `--timeExit` | No | `60` | Time-exit for all positions |

**Batch Logic:**
1. Security scan on EACH token
2. Skip any that fail (report which ones)
3. Show batch summary before executing
4. Execute sequentially (not parallel, to avoid nonce issues)
5. Report results for each

---

### sniper sell — 卖出代币

```bash
h-wallet sniper sell --positionId <id> [--percentage <pct>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--positionId` | Yes | - | Position ID (from `sniper positions`) |
| `--percentage` | No | `100` | Percentage of position to sell (25, 50, 75, 100) |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `txHash` | String | Sell transaction hash |
| `token` | String | Token symbol |
| `amountSold` | String | Tokens sold |
| `amountReceived` | String | USDT received |
| `pnl` | String | Realized PnL (USDT) |
| `pnlPercentage` | String | PnL percentage |
| `gasFee` | String | Gas fee |
| `remainingAmount` | String | Remaining tokens (if partial) |
| `remainingValue` | String | Remaining value (USDT) |
| `explorerUrl` | String | Transaction explorer link |

---

### sniper sell-all — 全部卖出 (紧急退出)

```bash
h-wallet sniper sell-all [--chain <chainId>] [--confirm] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--chain` | No | all | Only sell positions on specific chain |
| `--confirm` | No | false | Skip confirmation prompt |

Sells ALL open positions at market price. Use for emergency exit.

> **WARNING**: This sells everything immediately at market. Must confirm with user unless `--confirm` flag.

---

### sniper close — 关闭仓位

```bash
h-wallet sniper close --positionId <id> [--json]
```

Equivalent to `sniper sell --positionId <id> --percentage 100` + removes the TP/SL/time-exit monitor.

---

### sniper positions — 持仓列表

```bash
h-wallet sniper positions [--chain <chainId>] [--status <status>] [--sort <field>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--chain` | No | all | Filter by chain |
| `--status` | No | `open` | Filter: `open`, `closed`, `all` |
| `--sort` | No | `pnl` | Sort by: `pnl`, `value`, `time`, `token`, `chain` |

#### Response Fields (array)

| Field | Type | Description |
|---|---|---|
| `positionId` | String | Position ID |
| `token` | String | Token symbol |
| `tokenAddress` | String | Contract address |
| `chain` | String | Chain name |
| `chainId` | Integer | Chain ID |
| `amount` | String | Token quantity held |
| `avgBuyPrice` | String | Average buy price |
| `currentPrice` | String | Current price |
| `costBasis` | String | Total cost (USDT) |
| `currentValue` | String | Current value (USDT) |
| `pnl` | String | Unrealized PnL (USDT) |
| `pnlPercentage` | String | PnL percentage |
| `tp` | String | TP target (%) |
| `sl` | String | SL target (%) |
| `tpPrice` | String | TP trigger price |
| `slPrice` | String | SL trigger price |
| `timeExit` | String | Time-exit deadline |
| `status` | String | `monitoring`, `tp_triggered`, `sl_triggered`, `time_exited`, `manual_closed` |
| `buyTime` | String | Buy timestamp |
| `holdDuration` | String | How long held |
| `buyTxHash` | String | Buy transaction hash |

#### Summary Fields (appended)

| Field | Type | Description |
|---|---|---|
| `totalPositions` | Integer | Total open positions |
| `totalInvested` | String | Total USDT invested |
| `totalCurrentValue` | String | Total current value |
| `totalPnl` | String | Total unrealized PnL |
| `totalPnlPercentage` | String | Total PnL percentage |

---

### sniper position-detail — 仓位详情

```bash
h-wallet sniper position-detail --positionId <id> [--json]
```

Returns full position details including:
- All buy/sell transactions with timestamps
- Price chart since entry (mini sparkline)
- Current distance to TP and SL
- Estimated sell output at current price (after slippage)
- Token's current security status
- Holder changes since buy

---

### sniper amend — 修改止盈止损

```bash
h-wallet sniper amend --positionId <id> [--tp <pct>] [--sl <pct>] [--timeExit <min>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--positionId` | Yes | - | Position ID |
| `--tp` | No | unchanged | New take-profit (%) |
| `--sl` | No | unchanged | New stop-loss (%) |
| `--timeExit` | No | unchanged | New time-exit (minutes from now, 0=disable) |

> At least one of `--tp`, `--sl`, or `--timeExit` must be provided.

#### Validation Rules

| Rule | Constraint |
|---|---|
| TP must be positive | `tp > 0` |
| SL must be positive | `sl > 0` |
| TP cannot be below current PnL | If position is +25%, TP cannot be set to 20% |
| SL cannot be above current PnL | If position is -15%, SL cannot be set to 10% |
| Time-exit minimum | `timeExit >= 5` minutes (or 0 to disable) |

---

### sniper status — 狙击系统状态

```bash
h-wallet sniper status [--json]
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `activePositions` | Integer | Number of open positions |
| `totalInvested` | String | Total USDT invested across all positions |
| `totalCurrentValue` | String | Total current value |
| `totalPnl` | String | Total unrealized PnL |
| `totalPnlPercentage` | String | Total PnL percentage |
| `activeMonitors` | Integer | Active TP/SL/time monitors |
| `walletBalance` | String | Sniper wallet remaining USDT |
| `walletGas` | String | Remaining gas balance |
| `todayTrades` | Integer | Trades executed today |
| `todayPnl` | String | Today's realized PnL |
| `winRate` | String | Win rate (%) of closed positions |
| `avgHoldTime` | String | Average hold duration |
| `recentTrades` | Array | Last 10 completed trades |

#### Per-Recent-Trade Fields

| Field | Type | Description |
|---|---|---|
| `token` | String | Token symbol |
| `chain` | String | Chain name |
| `pnl` | String | Realized PnL |
| `pnlPercentage` | String | PnL % |
| `holdDuration` | String | Hold duration |
| `exitReason` | String | `tp`, `sl`, `time_exit`, `manual` |
| `closedAt` | String | Close timestamp |

---

## Quickstart

```bash
# Quick buy: 100U into a token with default TP/SL
h-wallet sniper quick-buy --token 0x6982508145454Ce325dDbE47a25d4ec3d2311933 --chain 1

# Custom buy: 200U, 50% TP, 15% SL, 2h time-exit
h-wallet sniper buy --token 0x6982... --chain 1 --amount 200 --tp 50 --sl 15 --timeExit 120

# Batch buy: multiple tokens at once (50U each)
h-wallet sniper batch-buy --tokens 0xaaa...,0xbbb...,0xccc... --chain 501 --amount 50

# View all open positions sorted by PnL
h-wallet sniper positions --sort pnl

# View closed positions
h-wallet sniper positions --status closed

# Sell 50% of a position (partial exit / lock profits)
h-wallet sniper sell --positionId pos_abc123 --percentage 50

# Close a position entirely
h-wallet sniper close --positionId pos_abc123

# Amend TP to 50%, keep SL unchanged
h-wallet sniper amend --positionId pos_abc123 --tp 50

# Disable time-exit for a position
h-wallet sniper amend --positionId pos_abc123 --timeExit 0

# Emergency: sell everything on Solana
h-wallet sniper sell-all --chain 501

# Check overall sniper performance
h-wallet sniper status
```

## Cross-Skill Workflows

### Full Sniping Pipeline (完整狙击流程)
> User: "帮我冲一个 Solana 上的 Meme 币"

```
1. h-v2-meme-market    h-wallet meme trending --chain 501 --period 1h --sort volume --limit 5
   → Find top 5 hot tokens on Solana by volume

2. h-v2-meme-market    h-wallet meme analyze --token <top1> --chain 501
   → Deep analysis: Vol/MC, liquidity, holders, age

3. h-v2-security-guard h-wallet security scan --token <top1> --chain 501
   → Security check (MUST pass)

4. h-v2-meme-market    h-wallet meme holders --token <top1> --chain 501
   → Check holder concentration (Top10 < 30%?)

5. h-v2-agentic-wallet h-wallet wallet balance-detail --chain 501
   → Verify sniper wallet has 100+ USDT + SOL for gas

6. [REPORT]            Present analysis + recommendation:
   "发现目标: $TOKEN
   - Vol/MC: 0.52 (极度活跃)
   - 流动性: $200K (Liq/MC = 8%)
   - 持有人: 1,200 (24h +25%)
   - 安全: ✓ 通过
   - 建议: 可以 100U 冲"

7. (user confirms "冲!")
   h-v2-meme-sniper   h-wallet sniper buy --token <addr> --chain 501 --amount 100

8. h-v2-meme-sniper   h-wallet sniper positions
   → Confirm position active, show entry price and TP/SL levels
```

### Position Review and Adjustment
> User: "我的 Meme 持仓怎么样了？"

```
1. h-v2-meme-sniper   h-wallet sniper positions --sort pnl
   → List all positions with PnL

2. h-v2-meme-sniper   h-wallet sniper status
   → Overall performance metrics

3. [ANALYZE]           Categorize positions:
   - Near TP (> 25%): suggest tightening SL or partial exit
   - Profitable (10-25%): suggest holding
   - Flat (±5%): monitor, check if token still active
   - Near SL (< -15%): suggest cutting or holding
   - Time-exit approaching: review if worth extending

4. [REPORT]            "持仓概览 (3 个活跃仓位):
   | 代币 | 链 | 成本 | 当前值 | 盈亏 | 距TP | 距SL | 时间 |
   |------|---|------|--------|------|------|------|------|
   | $A | SOL | 100U | 142U | +42% | 接近! | 远 | 35min |
   | $B | Base | 100U | 88U | -12% | 远 | 8% | 50min |
   | $C | SOL | 100U | 103U | +3% | 远 | 远 | 15min |
   
   建议：
   - $A: 已超过30%止盈线，建议立即止盈或提高TP到60%
   - $B: 距止损还有8%，时间还剩10min，建议等时间止损
   - $C: 刚买入15min，继续观察"
```

### Trailing Stop Strategy
> User: "这个币涨了50%了，我想保住利润但还想继续拿"

```
1. h-v2-meme-sniper   h-wallet sniper amend --positionId pos_abc --sl 30
   → Move SL up to +30% (lock in 30% profit minimum)

2. [REPORT]            "已将止损提高到 +30%。
   - 当前盈利: +50%
   - 新止损: +30% (最少保住 30% 利润)
   - 止盈: 保持原设置
   - 如果继续涨，可以再次提高止损"
```

### Emergency Exit
> User: "市场崩了，全部卖掉！"

```
1. h-v2-meme-sniper   h-wallet sniper positions
   → Get all open positions

2. [WARN]              "确认要卖出所有 X 个持仓吗？
   当前总价值: $XXX
   总未实现盈亏: -$XX (-X%)
   卖出后将收回约 $XXX USDT (扣除 Gas)"

3. (user confirms)
   h-v2-meme-sniper   h-wallet sniper sell-all --confirm

4. h-v2-meme-sniper   h-wallet sniper status
   → Confirm all positions closed, show final PnL
```

### Auto-Sniper Mode (全自动模式)
> User: "我不想手动选币，帮我全自动跑"

```
This is handled by h-v2-smart-switch, which orchestrates:
1. Continuous monitoring of h-v2-meme-market trending
2. Auto-filtering by Vol/MC, liquidity, security
3. Auto-calling h-v2-meme-sniper for qualified targets
4. Managing portfolio-level risk (max 5 positions, max 500U total)

→ Route to h-v2-smart-switch for fully automated mode
```

## Edge Cases

### Trade Execution

| Issue | Resolution |
|---|---|
| Security scan returns `Danger` | **BLOCK trade**, show reasons, refuse even if user insists |
| Security scan returns `Warning` | Show warnings, require explicit "我了解风险，继续" confirmation |
| Insufficient USDT | Report shortfall, show exact amount needed |
| Insufficient gas | Suggest bridging native token, show estimated gas cost |
| High price impact (> 3%) | Warn user, suggest smaller amount or different token |
| High price impact (> 10%) | **BLOCK trade**, liquidity too thin |
| Slippage exceeded | Tx reverts automatically, report to user, suggest higher slippage |
| Token not found on DEX | Verify contract address and chain, suggest searching first |
| No liquidity pool | Cannot trade, inform user token is not tradeable |
| Nonce conflict (batch) | Sequential execution, retry failed tx once |

### Position Management

| Issue | Resolution |
|---|---|
| TP triggered while user offline | Auto-sold, record in history, report when user returns |
| SL triggered while user offline | Auto-sold, record in history, report when user returns |
| Time-exit triggered | Auto-sold at market, record exit reason |
| Token becomes honeypot after buy | Detect via failed sell simulation, warn user immediately |
| Liquidity removed (rug pull) | Detect via price crash > 90%, attempt emergency sell |
| Position value < $1 | Mark as "dust", suggest closing to recover gas |
| Multiple partial sells | Track remaining amount and adjusted cost basis |

### System Issues

| Issue | Resolution |
|---|---|
| Monitor disconnected | Auto-reconnect, warn user if gap > 5 minutes |
| Chain congestion | Increase gas priority, retry up to 3 times |
| DEX aggregator timeout | Try alternative route, report if all fail |
| Wallet nonce desync | Auto-resync nonce before next tx |
| RPC node failure | Failover to backup RPC endpoint |

## Key Rules

1. **ALWAYS run security scan before buying** — no exceptions, even for quick-buy
2. **Never execute buy on tokens flagged as Danger** — even if user insists
3. **Default 100U per trade** — prevent over-investment in single token
4. **Sub-wallet isolation mandatory** — never trade from main wallet
5. **Show preview before every trade** — user must confirm (except auto-mode via smart-switch)
6. **TP/SL/Time-exit are automatic** — once set, system executes without further confirmation
7. **Partial exits are allowed** — user can sell 25%, 50%, 75% of position
8. **Emergency sell-all requires confirmation** — prevent accidental liquidation
9. **Max 10 concurrent positions** — portfolio-level risk control
10. **Max single position 500U** — prevent concentration risk
11. **Gas estimation before trade** — ensure sufficient gas, include in preview

## Display Rules

1. **PnL 颜色**：盈利绿色(+)，亏损红色(-)
2. **金额显示**：始终显示 USDT 等价
3. **地址缩写**：`0x6982...1933`
4. **时间显示**：相对时间（"35分钟前"）+ 绝对时间
5. **状态标识**：🟢 监控中 / 🟡 接近止盈 / 🔴 接近止损 / ⏰ 接近时间止损
6. **链标识**：始终显示链名 (SOL / Base / ETH / BSC / X Layer)

### Parameter Display Names

| API Field | EN | ZH |
|---|---|---|
| `positionId` | Position ID | 仓位 ID |
| `avgBuyPrice` | Avg Buy Price | 平均买入价 |
| `currentPrice` | Current Price | 当前价格 |
| `costBasis` | Cost Basis | 成本 |
| `currentValue` | Current Value | 当前价值 |
| `pnl` | PnL | 盈亏 |
| `pnlPercentage` | PnL % | 盈亏比例 |
| `tp` | Take Profit | 止盈 |
| `sl` | Stop Loss | 止损 |
| `timeExit` | Time Exit | 时间止损 |
| `priceImpact` | Price Impact | 价格影响 |
| `slippage` | Slippage | 滑点 |
| `holdDuration` | Hold Duration | 持仓时长 |
| `route` | Swap Route | 兑换路径 |
| `gasFee` | Gas Fee | Gas 费用 |
| `winRate` | Win Rate | 胜率 |
| `exitReason` | Exit Reason | 退出原因 |

## MCP Tool Reference

| CLI Command | MCP Tool | Onchain OS API |
|---|---|---|
| `sniper buy` | `sniper_buy` | `POST /api/v5/dex/swap/execute` |
| `sniper quick-buy` | `sniper_quick_buy` | `POST /api/v5/dex/swap/execute` (defaults) |
| `sniper batch-buy` | `sniper_batch_buy` | `POST /api/v5/dex/swap/batch-execute` |
| `sniper sell` | `sniper_sell` | `POST /api/v5/dex/swap/execute` (reverse) |
| `sniper sell-all` | `sniper_sell_all` | `POST /api/v5/dex/swap/batch-execute` (all) |
| `sniper close` | `sniper_close` | `POST /api/v5/dex/swap/execute` + monitor remove |
| `sniper positions` | `sniper_get_positions` | `GET /api/v5/dex/portfolio/positions` |
| `sniper position-detail` | `sniper_get_position_detail` | `GET /api/v5/dex/portfolio/position/{id}` |
| `sniper amend` | `sniper_amend_monitor` | `PUT /api/v5/dex/monitor/{id}` |
| `sniper status` | `sniper_get_status` | `GET /api/v5/dex/monitor/status` |
