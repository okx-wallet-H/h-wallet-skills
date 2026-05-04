---
name: h-v2-agentic-wallet
description: "Use this skill when the user asks about 'create agent wallet', 'TEE wallet', 'onchain balance', 'cross-chain transfer', 'multi-wallet', 'fund pool', 'X Layer wallet', 'send token', 'agentic wallet', '创建智能钱包', 'TEE钱包', '链上余额', '跨链转账', '多钱包', '资金池', 'X Layer钱包', '发送代币', '智能钱包', or any request to manage decentralized Agentic Wallets, view onchain balances, or perform onchain transfers. This skill connects to OKX Onchain OS. Do NOT use for CEX account balance (h-v1-wallet-auth), market data (h-v2-meme-market), or automated sniping (h-v2-meme-sniper)."
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

# H Wallet 智能钱包 (Agentic Wallet)

基于 OKX Onchain OS 和 X Layer 的 TEE 智能钱包管理。支持多用户资金池、跨链资产视图和链上转账。

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Ensure Onchain OS API credentials are configured.

---

## Skill Routing

| User intent | Route to skill |
|---|---|
| CEX Account balance, margin | `h-v1-wallet-auth` |
| Meme coin market data, trends | `h-v2-meme-market` |
| Auto snipe Meme coins | `h-v2-meme-sniper` |
| Agentic Wallet creation, onchain balance, transfers | **This skill** |

---

## Design Philosophy

> **核心理念**：私钥不出域，Agent 自主操作，多用户资金池隔离。

1. **X Layer 优先**：默认在 X Layer 网络上创建和操作钱包，享受低 Gas 和高并发。
2. **TEE 安全**：私钥在可信执行环境（TEE）内生成与签名，任何人（包括开发者）无法触碰。
3. **资金池模式**：支持主钱包+最多50个子钱包架构，实现多策略/多用户分仓隔离。
4. **友好引导**：用户首次使用链上功能时，提供友好的中文引导创建流程。

---

## Command Index (5 commands)

### Wallet Lifecycle

| Command | Type | Auth | Description |
|---|---|---|---|
| `wallet create` | WRITE | Required | Create a new Agentic Wallet in TEE |
| `wallet list` | READ | Required | List all sub-wallets in the fund pool |

### Assets & Transfers

| Command | Type | Auth | Description |
|---|---|---|---|
| `wallet balance` | READ | Required | Get cross-chain token balance and portfolio value |
| `wallet send` | WRITE | Required | Send tokens to an onchain address |
| `wallet history` | READ | Required | Get onchain transaction history |

---

## Detailed Command Reference

### wallet create — 创建智能钱包

```bash
h-wallet wallet create [--network <net>] [--subWallet <bool>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--network` | No | `xlayer` | Target network (`xlayer`, `solana`, `ethereum`, `base`) |
| `--subWallet` | No | `false` | Create as a sub-wallet for multi-strategy isolation |

**Interactive Flow (If no wallet exists):**
1. System detects no wallet.
2. Prompt user in Chinese: "您尚未绑定智能钱包。为了进行链上自动套利，请提供您的邮箱账号进行创建。"
3. User provides email -> Send verification code.
4. User provides code -> Call `wallet create`.

---

### wallet balance — 链上余额与资产组合

```bash
h-wallet wallet balance [--address <addr>] [--network <net>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--address` | No | Agent's | Target address (omit to use Agent's own wallet) |
| `--network` | No | all | Filter by specific network |

**Response Fields:**
- `totalUsdValue`: Total portfolio value in USD
- `tokens`: Array of tokens across chains (symbol, network, balance, usdValue)

> **Display Rule**: Always highlight USDT balance as it's the primary currency for Meme sniping.

---

### wallet send — 发送代币

```bash
h-wallet wallet send --to <addr> --amount <n> --token <address_or_symbol> [--network <net>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--to` | Yes | — | Destination address |
| `--amount` | Yes | — | Amount to send |
| `--token` | Yes | — | Token contract address or symbol (e.g. `USDT`) |
| `--network` | No | `xlayer` | Network to execute transfer |

> **⚠️ Security**: This command signs a transaction in TEE and broadcasts it. ALWAYS require user confirmation.

---

## Operation Flow

### Step 1 — Check Wallet Status

Before any H_v2 (Onchain) operation, check if the Agentic Wallet exists.
If not, trigger the **智能钱包创建引导**:
> "您好！检测到您尚未创建智能钱包。我们的智能钱包基于 TEE 技术，私钥绝对安全。请提供您的邮箱账号，我将为您发送验证码以完成创建。"

### Step 2 — Execute

- **READ commands**: Render cross-chain balances in clear Markdown tables.
- **WRITE commands**: Require explicit confirmation before broadcasting transactions.

---

## MCP Tool Reference (Onchain OS)

| CLI Command | MCP Tool | OKX Onchain OS Skill |
|---|---|---|
| `wallet create` | `wallet_create_agentic` | `okx-agentic-wallet` |
| `wallet list` | `wallet_list_subwallets` | `okx-agentic-wallet` |
| `wallet balance` | `wallet_get_portfolio` | `okx-wallet-portfolio` |
| `wallet send` | `wallet_send_transaction` | `okx-agentic-wallet` |
| `wallet history` | `wallet_get_history` | `okx-agentic-wallet` |
