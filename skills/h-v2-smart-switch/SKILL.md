---
name: h-v2-smart-switch
description: "Use this skill when the user asks about 'smart switch', 'strategy switch', 'auto adapt', 'change strategy', 'market regime', 'auto mode', 'full auto', 'autopilot', '智能切换', '策略切换', '动态适应', '更换策略', '市场环境', '全自动', '自动驾驶', '托管策略', or any request to automatically switch between trading strategies (Grid, DCA, Sniper) based on market conditions, or to run a fully automated trading system. This skill orchestrates other skills as a meta-strategy layer. Do NOT use for manual strategy creation (use specific h-v1 or h-v2 strategy skills directly)."
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

# H Wallet 策略智能切换 (Smart Switch)

Meta-strategy orchestration layer that continuously monitors market conditions and automatically switches between Grid, DCA, and Meme Sniper strategies. Manages fund allocation between CEX (perpetual contracts) and Onchain (DEX tokens) based on real-time market regime detection.

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

## Prerequisites

```bash
npm install -g @h-wallet/trade-cli
```

**Required before first use:**
1. CEX account configured (`h-wallet auth status` → authenticated)
2. Agentic Wallet active (`h-wallet wallet status` → active)
3. Sufficient total capital (minimum 500 USDT recommended)
4. Both CEX and Onchain balances available

> Smart Switch manages capital across BOTH CEX and Onchain. It needs access to both environments.

## Skill Routing

| Need | Skill |
|---|---|
| Create Perpetual Grid manually | `h-v1-perp-grid` |
| Create Perpetual DCA manually | `h-v1-perp-dca` |
| Manual Meme sniping | `h-v2-meme-sniper` |
| Market data (CEX) | `h-v1-perp-market` |
| Market data (Onchain) | `h-v2-meme-market` |
| Signal analysis | `h-v1-perp-signal` |
| **Auto-switch strategies based on market** | **This skill** |

## Design Philosophy

> **核心理念**：策略不能一成不变，必须随市场动态适应。一句话启动，全自动运行。

1. **环境感知**：持续监控 BTC/ETH 波动率（ATR）、趋势指标（RSI、MACD）、聪明钱共识、链上交易量。
2. **三态模型**：市场只有三种状态 — 震荡(Grid)、趋势(DCA)、Meme热潮(Sniper)。
3. **无缝切换**：检测到市场状态变化时，优雅停止当前策略，重新分配资金，启动新策略。
4. **资金流转**：自动在 CEX 合约账户与 Onchain Agentic Wallet 之间调拨资金。
5. **风控优先**：单次切换最大资金移动不超过总资金的 50%，防止极端情况。
6. **人工兜底**：重大切换前通知用户，用户可随时接管或暂停。

## Command Index (7 commands)

### Lifecycle (3 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 1 | `h-wallet switch start` | WRITE | Yes | Start the smart switch daemon |
| 2 | `h-wallet switch stop` | WRITE | Yes | Stop the daemon and optionally close all strategies |
| 3 | `h-wallet switch restart` | WRITE | Yes | Restart with new parameters |

### Monitoring (2 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 4 | `h-wallet switch status` | READ | Yes | View current regime, active strategy, and PnL |
| 5 | `h-wallet switch history` | READ | Yes | View switch history and performance |

### Configuration (2 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 6 | `h-wallet switch config` | READ | Yes | View current configuration |
| 7 | `h-wallet switch amend` | WRITE | Yes | Amend configuration without restart |

---

## CLI Command Reference

### switch start — 启动智能切换

```bash
h-wallet switch start \
  [--totalAmount <n>] \
  [--cexRatio <pct>] \
  [--onchainRatio <pct>] \
  [--aggressiveness <level>] \
  [--checkInterval <min>] \
  [--notifyOnSwitch] \
  [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--totalAmount` | No | `500` | Total USDT allocated to smart switch |
| `--cexRatio` | No | `70` | Max percentage allocated to CEX strategies (%) |
| `--onchainRatio` | No | `30` | Max percentage allocated to Onchain strategies (%) |
| `--aggressiveness` | No | `medium` | Sensitivity: `low` (switch rarely), `medium`, `high` (switch frequently) |
| `--checkInterval` | No | `15` | Market check interval in minutes (5-60) |
| `--notifyOnSwitch` | No | `true` | Notify user when strategy switches |

#### Aggressiveness Levels

| Level | Check Interval | Switch Threshold | Description |
|---|---|---|---|
| `low` | 30 min | Regime must persist 2h | Conservative, fewer switches |
| `medium` | 15 min | Regime must persist 1h | Balanced |
| `high` | 5 min | Regime must persist 30min | Aggressive, quick adaptation |

#### Initial Fund Allocation

```
Total: 500 USDT
├── CEX (70%): 350 USDT
│   ├── Grid allocation: 250 USDT (if ranging)
│   └── DCA allocation: 100 USDT (reserve)
└── Onchain (30%): 150 USDT
    └── Sniper allocation: 150 USDT (if meme season)
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `daemonId` | String | Daemon process ID |
| `status` | String | `running` |
| `totalAmount` | String | Total allocated |
| `cexAmount` | String | CEX allocated |
| `onchainAmount` | String | Onchain allocated |
| `currentRegime` | String | Detected market regime |
| `activeStrategy` | String | Currently running strategy |
| `nextCheckAt` | String | Next market check time |

---

### switch stop — 停止智能切换

```bash
h-wallet switch stop [--closeAll] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--closeAll` | No | `false` | Also close all active strategies and positions |

**Behavior:**
- `--closeAll=false`: Stops the daemon but leaves current strategy running (user takes over manually)
- `--closeAll=true`: Stops daemon + stops Grid/DCA bots + closes Sniper positions

---

### switch restart — 重启（更新参数）

```bash
h-wallet switch restart [--totalAmount <n>] [--aggressiveness <level>] [--json]
```

Stops current daemon and starts a new one with updated parameters. Active strategies are gracefully migrated.

---

### switch status — 查看当前状态

```bash
h-wallet switch status [--json]
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `daemonId` | String | Daemon process ID |
| `status` | String | `running`, `paused`, `stopped` |
| `uptime` | String | How long daemon has been running |
| `currentRegime` | String | `ranging`, `trending_up`, `trending_down`, `meme_season`, `extreme_fear`, `extreme_greed` |
| `regimeSince` | String | When current regime was detected |
| `regimeConfidence` | String | Confidence level (%) |
| `activeStrategy` | String | Currently active strategy skill |
| `activeStrategyDetail` | Object | Strategy-specific status (bot ID, positions, etc.) |
| `totalAmount` | String | Total allocated |
| `cexBalance` | String | Current CEX balance |
| `onchainBalance` | String | Current Onchain balance |
| `totalPnl` | String | Total PnL since start |
| `totalPnlPercentage` | String | Total PnL % |
| `switchCount` | Integer | Number of strategy switches |
| `lastSwitchTime` | String | Last switch timestamp |
| `lastSwitchReason` | String | Why last switch happened |
| `nextCheckAt` | String | Next market check time |

#### Regime Indicators (shown in status)

| Indicator | Source | Current Value | Threshold |
|---|---|---|---|
| BTC RSI (4h) | `h-v1-perp-market` | e.g. "45" | <30=oversold, >70=overbought |
| BTC ATR (4h) | `h-v1-perp-market` | e.g. "2.1%" | <1.5%=low vol, >3%=high vol |
| Funding Rate | `h-v1-perp-market` | e.g. "0.01%" | >0.05%=overheated |
| Smart Money Consensus | `h-v1-perp-signal` | e.g. "62% long" | >70%=strong consensus |
| Onchain DEX Volume | `h-v2-meme-market` | e.g. "$500M" | >$1B=meme season |
| Fear & Greed Index | external | e.g. "35" | <20=extreme fear, >80=extreme greed |

---

### switch history — 切换历史

```bash
h-wallet switch history [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--limit` | No | `20` | Number of history entries |

#### Response Fields (array)

| Field | Type | Description |
|---|---|---|
| `timestamp` | String | Switch time |
| `fromRegime` | String | Previous regime |
| `toRegime` | String | New regime |
| `fromStrategy` | String | Previous strategy |
| `toStrategy` | String | New strategy |
| `reason` | String | Detailed reason for switch |
| `pnlAtSwitch` | String | PnL at time of switch |
| `fundReallocation` | String | Funds moved (e.g. "200U CEX→Onchain") |

---

### switch config — 查看配置

```bash
h-wallet switch config [--json]
```

Shows all current configuration parameters and their values.

---

### switch amend — 修改配置

```bash
h-wallet switch amend [--totalAmount <n>] [--cexRatio <pct>] [--onchainRatio <pct>] [--aggressiveness <level>] [--checkInterval <min>] [--json]
```

Amends configuration without restarting. Changes take effect at next check cycle.

---

## Market Regime Detection (市场状态检测)

### Detection Algorithm

Every `checkInterval` minutes, the daemon:

```
1. Fetch BTC 4h candles → calculate RSI, ATR, MACD
2. Fetch BTC funding rate and OI change
3. Fetch Smart Money consensus (h-v1-perp-signal)
4. Fetch Onchain DEX total volume (h-v2-meme-market)
5. Calculate composite score
6. Determine regime
7. If regime changed AND persisted > threshold → trigger switch
```

### Regime Classification

| Regime | Conditions | Strategy |
|---|---|---|
| **`ranging`** (震荡) | RSI 35-65 AND ATR < 2% AND no strong SM consensus | `h-v1-perp-grid` |
| **`trending_up`** (上涨趋势) | RSI > 60 AND MACD positive AND SM > 65% long | `h-v1-perp-dca` (long bias) |
| **`trending_down`** (下跌趋势) | RSI < 40 AND MACD negative AND SM > 60% short | `h-v1-perp-dca` (short bias) |
| **`meme_season`** (Meme热潮) | DEX Vol > 2x 7d avg AND trending tokens > 20 | `h-v2-meme-sniper` |
| **`extreme_fear`** (极度恐慌) | RSI < 20 AND ATR > 4% AND funding negative | `h-v1-perp-dca` (aggressive long) |
| **`extreme_greed`** (极度贪婪) | RSI > 80 AND funding > 0.1% | Reduce exposure, tighten SL |

### Strategy Parameters per Regime

| Regime | Strategy | Key Parameters |
|---|---|---|
| `ranging` | Grid | pair=BTC-USDT, leverage=3x, gridNum=50, TP=30% |
| `trending_up` | DCA Long | pair=BTC-USDT, direction=long, maxOrders=5, TP=20% |
| `trending_down` | DCA Short | pair=BTC-USDT, direction=short, maxOrders=5, TP=20% |
| `meme_season` | Sniper | amount=100U, TP=30%, SL=20%, timeExit=60min |
| `extreme_fear` | DCA Long (aggressive) | pair=BTC-USDT, direction=long, maxOrders=10, TP=15% |
| `extreme_greed` | Reduce | Close 50% positions, tighten all SL to 5% |

---

## Fund Reallocation Logic (资金调拨)

### CEX → Onchain (when switching to Meme Sniper)

```
1. Stop CEX strategy (Grid/DCA)
2. Wait for positions to close (or force close if urgent)
3. Withdraw USDT from CEX to Onchain wallet
   - Via internal transfer if on X Layer
   - Via chain withdrawal if on Solana/Base
4. Confirm receipt in Agentic Wallet
5. Start Sniper strategy
```

### Onchain → CEX (when switching to Grid/DCA)

```
1. Close all Sniper positions (sell-all)
2. Transfer USDT from Onchain wallet to CEX
   - Via deposit address
3. Confirm receipt in CEX account
4. Start Grid/DCA strategy
```

### Safety Rules

| Rule | Constraint |
|---|---|
| Max single reallocation | 50% of total funds |
| Min CEX reserve | 100 USDT (always keep for emergency) |
| Min Onchain reserve | 50 USDT (always keep for gas + emergency) |
| Transfer confirmation | Wait for on-chain confirmation before starting new strategy |
| Failed transfer | Retry once, then pause daemon and notify user |

---

## Cross-Skill Workflows

### One-Sentence Autopilot
> User: "帮我全自动跑，500U"

```
1. h-v2-smart-switch   h-wallet switch start --totalAmount 500

2. [DAEMON]            Detects current regime: ranging (RSI=48, ATR=1.2%)
   → Allocates 350U to CEX, 150U to Onchain reserve
   → Starts h-v1-perp-grid (BTC-USDT, 3x, 50 grids)

3. [15 min later]      Re-checks market → still ranging → no action

4. [2 hours later]     Detects regime change: meme_season (DEX vol spike)
   → Stops Grid bot (realizes +12U profit)
   → Moves 100U from CEX to Onchain
   → Starts h-v2-meme-sniper (100U per snipe)

5. [1 hour later]      Meme season fading, back to ranging
   → Closes sniper positions (+35U profit)
   → Moves funds back to CEX
   → Restarts Grid

6. [REPORT]            When user asks "怎么样了？":
   "智能切换运行 4 小时：
   - 切换次数: 2 次 (Grid→Sniper→Grid)
   - 总盈亏: +47U (+9.4%)
   - 当前状态: 震荡市，运行网格策略
   - 当前持仓: BTC-USDT 网格 (350U)"
```

### Manual Override
> User: "我觉得现在应该做空，别自动切了"

```
1. h-v2-smart-switch   h-wallet switch stop
   → Daemon stopped, current strategy continues

2. [INFORM]            "已停止智能切换。当前网格策略仍在运行。
   您可以手动操作：
   - 停止网格: h-wallet grid stop --botId xxx
   - 开空单: h-wallet swap open --instId BTC-USDT-SWAP --side sell ...
   
   需要我帮您执行吗？"
```

### Performance Review
> User: "智能切换跑了一周了，表现怎么样？"

```
1. h-v2-smart-switch   h-wallet switch status
2. h-v2-smart-switch   h-wallet switch history --limit 50

3. [ANALYZE]           Aggregate metrics:
   - Total runtime
   - Number of switches
   - PnL per regime
   - Win rate per strategy
   - Best/worst switch decision

4. [REPORT]            "一周智能切换报告：
   | 指标 | 数值 |
   |------|------|
   | 运行时间 | 7 天 |
   | 切换次数 | 12 次 |
   | 总盈亏 | +$156 (+31.2%) |
   | 网格盈亏 | +$89 (占比 57%) |
   | DCA盈亏 | +$32 (占比 21%) |
   | 狙击盈亏 | +$35 (占比 22%) |
   | 胜率 | 75% (9/12 切换盈利) |
   | 最大回撤 | -$28 (5.6%) |
   | 最佳决策 | 周三切入Meme (+$45) |
   | 最差决策 | 周五误判趋势 (-$12) |"
```

## Edge Cases

| Issue | Resolution |
|---|---|
| Market regime unclear (mixed signals) | Stay with current strategy, increase check frequency |
| Rapid regime oscillation (< 30min) | Apply cooldown: min 1h between switches |
| Transfer failed (CEX↔Onchain) | Pause daemon, notify user, retry once |
| Strategy start failed | Retry with reduced amount, notify user if still fails |
| All strategies losing | If total drawdown > 15%, pause daemon, notify user |
| User manually intervenes | Detect external changes, pause daemon, ask user |
| Network congestion | Delay switch, use current strategy until transfer possible |
| Insufficient gas for Onchain | Notify user, stay on CEX strategies |
| CEX API rate limit | Back off, extend check interval temporarily |

## Key Rules

1. **Never switch without confirmation period** — regime must persist for threshold duration
2. **Always notify on switch** (unless user disabled) — transparency is critical
3. **Never move > 50% of funds in single reallocation** — gradual transitions
4. **Keep minimum reserves** — 100U CEX + 50U Onchain always reserved
5. **Cooldown between switches** — minimum 1 hour (low), 30 min (medium), 15 min (high)
6. **Pause on excessive drawdown** — if total PnL < -15%, stop and notify
7. **User can always override** — manual commands take priority over daemon
8. **Log all decisions** — every check and switch is recorded for review

## Display Rules

1. **Regime 显示**：用中文 + 图标 (🔄 震荡 / 📈 上涨 / 📉 下跌 / 🚀 Meme热潮 / 😱 极度恐慌 / 🤑 极度贪婪)
2. **策略显示**：显示当前活跃策略 + 运行时长
3. **资金分布**：显示 CEX/Onchain 比例条
4. **切换历史**：时间线格式，最近在上

### Parameter Display Names

| API Field | EN | ZH |
|---|---|---|
| `currentRegime` | Market Regime | 市场状态 |
| `activeStrategy` | Active Strategy | 当前策略 |
| `totalPnl` | Total PnL | 总盈亏 |
| `switchCount` | Switch Count | 切换次数 |
| `uptime` | Uptime | 运行时间 |
| `regimeConfidence` | Confidence | 置信度 |
| `cexBalance` | CEX Balance | CEX 余额 |
| `onchainBalance` | Onchain Balance | 链上余额 |
| `lastSwitchReason` | Last Switch Reason | 上次切换原因 |
| `nextCheckAt` | Next Check | 下次检查时间 |

## MCP Tool Reference

| CLI Command | MCP Tool | Underlying Action |
|---|---|---|
| `switch start` | `strategy_switch_start` | Start daemon, orchestrate skills |
| `switch stop` | `strategy_switch_stop` | Stop daemon |
| `switch restart` | `strategy_switch_restart` | Restart with new params |
| `switch status` | `strategy_switch_status` | Aggregate regime + PnL data |
| `switch history` | `strategy_switch_history` | Query switch log |
| `switch config` | `strategy_switch_config` | Read config |
| `switch amend` | `strategy_switch_amend` | Update config |
