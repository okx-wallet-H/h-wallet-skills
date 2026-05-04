---
name: h-v2-meme-sniper
description: "Use this skill when the user asks about 'snipe meme coin', 'auto buy token', 'short term arbitrage', 'pump and dump', '100U strategy', 'Meme币狙击', '自动套利', '冲土狗', '100U战神', '短期套利', '链上自动交易', or any request to automatically snipe, buy, or arbitrage Meme coins onchain. This skill requires Agentic Wallet and connects to OKX Onchain OS. Do NOT use for CEX perpetual grid (h-v1-perp-grid) or manual CEX trading (h-v1-perp-trade)."
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

# H Wallet Meme 币链上狙击与套利 (Meme Sniper)

全自动链上 Meme 币狙击策略。支持小额（如 100U）全自动冲刺、短期套利、动态止盈止损，完全依托 TEE Agentic Wallet 运行。

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Ensure the Agentic Wallet has sufficient USDT/Native Token balance on the target network.

---

## Skill Routing

| User intent | Route to skill |
|---|---|
| Search trending Meme coins without buying | `h-v2-meme-market` |
| Create Agentic Wallet, check balance | `h-v2-agentic-wallet` |
| CEX Perpetual Grid Strategy | `h-v1-perp-grid` |
| Onchain auto-snipe, short-term arbitrage | **This skill** |

---

## Design Philosophy

> **核心理念**：100U 战神模式，快进快出，绝对不长拿。

1. **自动化执行**：用户转入资金（例如 100U）后，策略自动监控链上信号，发现机会立即执行 DEX Swap。
2. **极速套利**：目标是短期套利，利润达到预设阈值（如 30%）或触发止损（如 -20%）立即自动平仓。
3. **防 Rug 机制**：开仓前强制调用 `h-v2-security-guard` 检查合约是否开源、是否有貔貅风险、持仓是否过度集中。
4. **多链支持**：优先在 X Layer 和 Solana 上执行，利用其低延迟和低 Gas 优势。

---

## Command Index (4 commands)

### Sniper Lifecycle

| Command | Type | Auth | Description |
|---|---|---|---|
| `sniper start` | WRITE | Required | Start the auto-sniping strategy |
| `sniper stop` | WRITE | Required | Stop the strategy and optionally close positions |
| `sniper status` | READ | Required | View running sniper bots and their PnL |

### Manual Execution

| Command | Type | Auth | Description |
|---|---|---|---|
| `sniper buy` | WRITE | Required | Manually trigger a snipe on a specific token |

---

## Detailed Command Reference

### sniper start — 启动全自动狙击

```bash
h-wallet sniper start --amount <n> [--network <net>] [--tpRatio <r>] [--slRatio <r>] [--maxDuration <m>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--amount` | Yes | — | USDT amount to use per snipe (e.g. `100`) |
| `--network` | No | `xlayer` | Target network (`xlayer`, `solana`, `base`) |
| `--tpRatio` | No | `0.3` | Take profit ratio (default 30%) |
| `--slRatio` | No | `0.2` | Stop loss ratio (default 20%) |
| `--maxDuration` | No | `60` | Max holding time in minutes (time-based exit) |

**Execution Logic:**
1. Agent monitors `h-v2-meme-market` for trending tokens with high Vol/MC ratio.
2. Runs security check (`h-v2-security-guard`).
3. Uses `dex-quote` to find best route.
4. Uses `dex-swap` to execute buy via TEE Wallet.
5. Sets up TP/SL and Time-exit monitors.
6. Auto-sells when any exit condition is met.

---

### sniper buy — 手动触发狙击

```bash
h-wallet sniper buy --token <address> --amount <n> [--network <net>] [--json]
```

Immediately executes a buy on a specific token using the default TP/SL rules.

---

## Operation Flow

### Step 1 — Balance & Wallet Check
Before starting the sniper:
1. Call `wallet balance` to ensure the Agentic Wallet exists and has sufficient USDT.
2. If no wallet exists, guide the user to create one (see `h-v2-agentic-wallet`).
3. If balance < 100U, prompt the user: "您的智能钱包余额不足，请转入至少 100 USDT 以启动狙击策略。"

### Step 2 — Pre-optimization & Launch
When the user says "冲土狗" or "启动 100U 套利":
1. Apply the pre-optimized defaults: 30% TP, 20% SL, 60-minute max hold.
2. Start the strategy.
3. Inform the user: "已为您启动 Meme 币全自动套利策略。每次投入 100U，目标收益 30%，严格止损 20%，最长持仓 60 分钟。我会持续监控并向您汇报战况。"

### Step 3 — Continuous Operation
- The strategy runs continuously. After closing a position, it resumes scanning for the next opportunity.
- Logs all actions to the project files for future optimization.

---

## MCP Tool Reference (Onchain OS)

| CLI Command | MCP Tool | OKX Onchain OS Skill |
|---|---|---|
| `sniper start` | `dex_swap_execute` | `okx-dex-swap` |
| `sniper buy` | `dex_swap_execute` | `okx-dex-swap` |
| `sniper status` | `wallet_get_portfolio` | `okx-wallet-portfolio` |
