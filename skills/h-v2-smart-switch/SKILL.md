---
name: h-v2-smart-switch
description: "Use this skill when the user asks about 'smart switch', 'strategy switch', 'auto adapt', 'change strategy', 'market regime', '智能切换', '策略切换', '动态适应', '更换策略', '市场环境', or any request to automatically switch between trading strategies (Grid, DCA, Sniper) based on market conditions. This skill orchestrates other skills. Do NOT use for manual strategy creation (use specific h-v1 or h-v2 strategy skills)."
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
        label: "Install H Wallet CLI (npm)"
---

# H Wallet 策略智能切换 (Smart Switch)

基于市场环境（趋势、震荡、极度恐慌/贪婪）自动在不同策略（网格、DCA、Meme狙击）之间切换，实现全天候动态适应。

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).

---

## Skill Routing

| User intent | Route to skill |
|---|---|
| Create Perpetual Grid | `h-v1-perp-grid` |
| Create Perpetual DCA | `h-v1-perp-dca` |
| Create Meme Sniper | `h-v2-meme-sniper` |
| Auto-switch strategies based on market | **This skill** |

---

## Design Philosophy

> **核心理念**：策略不能一成不变，必须随市场动态适应。

1. **环境感知**：持续监控市场波动率（ATR）、趋势指标（RSI、MACD）和聪明钱共识（h-v1-perp-signal）。
2. **无缝切换**：
   - **震荡市** -> 切换至 `h-v1-perp-grid` (中性网格)
   - **单边下跌/急跌** -> 切换至 `h-v1-perp-dca` (马丁格尔分批抄底)
   - **链上热点爆发** -> 切换至 `h-v2-meme-sniper` (100U 战神短线冲刺)
3. **资金流转**：自动在 CEX 合约账户与 Onchain Agentic Wallet 之间调拨资金（通过 x402 协议或直接提币）。

---

## Command Index (3 commands)

| Command | Type | Auth | Description |
|---|---|---|---|
| `switch start` | WRITE | Required | Start the smart switch daemon |
| `switch stop` | WRITE | Required | Stop the smart switch daemon |
| `switch status` | READ | Required | View current market regime and active strategy |

---

## Detailed Command Reference

### switch start — 启动智能切换守护进程

```bash
h-wallet switch start [--baseAmount <n>] [--aggressiveness <level>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--baseAmount` | No | `500` | Total USDT allocated to the smart switch pool |
| `--aggressiveness` | No | `medium` | Sensitivity to market changes (`low`, `medium`, `high`) |

**Execution Logic:**
1. Daemon wakes up every 15 minutes.
2. Pulls data from `h-v1-perp-market` (BTC/ETH volatility) and `h-v2-meme-market` (Onchain volume).
3. Evaluates current regime.
4. If regime changed:
   - Gracefully stops current strategy (e.g. `dca stop`).
   - Re-allocates funds.
   - Starts new strategy (e.g. `grid create`).

---

### switch status — 查看当前状态

```bash
h-wallet switch status [--json]
```

**Response Fields:**
- `currentRegime`: `ranging` (震荡), `trending_down` (下跌), `meme_season` (链上热点)
- `activeStrategy`: e.g., `h-v1-perp-grid`
- `lastSwitchTime`: Timestamp of last strategy change
- `totalPnl`: Combined PnL across all strategies managed by this daemon

---

## Decision Matrix (决策矩阵)

| Market Condition | Indicators | Selected Strategy | Rationale |
|---|---|---|---|
| **Sideways / Ranging** | RSI 40-60, Low ATR, Low Onchain Vol | `h-v1-perp-grid` | 震荡区间内积极获利，赚取网格利润 |
| **Downtrend / Panic** | RSI < 30, High CEX Vol | `h-v1-perp-dca` | 越跌越买，摊低成本，反弹即走 |
| **Meme Season** | Onchain Vol spike, High DEX activity | `h-v2-meme-sniper` | CEX 没行情，资金去链上冲土狗 (100U 模式) |

---

## MCP Tool Reference

| CLI Command | MCP Tool | Underlying Action |
|---|---|---|
| `switch start` | `strategy_switch_start` | Orchestrates multiple OKX skills |
| `switch status` | `strategy_switch_status` | Aggregates PnL and regime data |
