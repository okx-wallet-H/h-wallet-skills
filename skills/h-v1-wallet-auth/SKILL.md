---
name: h-v1-wallet-auth
description: "Use this skill when the user asks about 'account balance', 'margin', 'available balance', 'create wallet', 'bind wallet', 'login', 'authenticate', 'my assets', 'USDT balance', 'leverage usage', 'margin ratio', 'account config', 'switch mode', 'set position mode', 'transfer funds', '账户余额', '保证金', '可用余额', '创建钱包', '绑定钱包', '登录', '认证', '我的资产', '杠杆使用率', '保证金率', '账户配置', '切换模式', '划转', or any request to manage account authentication, view balances, check margin status, or configure account settings on H Wallet. Requires API credentials. Do NOT use for market data (h-v1-perp-market), trading (h-v1-perp-trade), or bots (h-v1-perp-grid / h-v1-perp-dca)."
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

# H Wallet 账户认证与保证金管理

账户认证、智能钱包引导、资产概览和保证金管理。**需要 API 凭证。**

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

## Prerequisites

1. Install `h-wallet` CLI:
   ```bash
   npm install -g @h-wallet/trade-cli
   ```
2. Configure credentials:
   ```bash
   h-wallet config init
   ```
3. Verify: `h-wallet account balance --json`

---

## Credential & Profile Check

Run `h-wallet config show --json` before any authenticated command.

- Error or no configuration → **stop**, guide user to run `h-wallet config init`, wait for completion.
- Credentials configured → proceed.

**智能钱包引导**：如果用户未绑定智能钱包，系统应提供友好的中文提示，引导用户：
1. 输入邮箱账号
2. 输入验证码
3. 完成钱包创建

---

## Skill Routing

| User intent | Route to skill |
|---|---|
| Market prices, candles, funding rate | `h-v1-perp-market` |
| Smart money, trader signals | `h-v1-perp-signal` |
| Place / cancel orders, set leverage | `h-v1-perp-trade` |
| Grid bot strategy | `h-v1-perp-grid` |
| DCA / Martingale strategy | `h-v1-perp-dca` |
| Account balance, margin, transfers | **This skill** |

---

## Command Index (6 commands)

### Authentication

| Command | Type | Auth | Description |
|---|---|---|---|
| `auth login` | WRITE | No | Start OAuth login flow (interactive) |
| `auth status` | READ | No | Check current authentication status |
| `config init` | WRITE | No | Initialize API Key configuration |

### Account Data

| Command | Type | Auth | Description |
|---|---|---|---|
| `account balance` | READ | Required | Get account balance (all currencies, USDT-denominated) |
| `account positions` | READ | Required | Get current open positions with margin info |
| `account config` | READ | Required | Get account configuration (position mode, margin mode) |

### Fund Management

| Command | Type | Auth | Description |
|---|---|---|---|
| `account transfer` | WRITE | Required | Transfer funds between accounts (funding ↔ trading) |
| `account set-position-mode` | WRITE | Required | Switch position mode (long/short or net) |
| `account set-leverage` | WRITE | Required | Set leverage for specific instrument |

---

## Operation Flow

### Step 0 — Credential & Profile Check

Before any command: see [Credential & Profile Check](#credential--profile-check). Always use `--profile live` silently.

### Step 1 — Identify intent

**New user / wallet creation:**
- "创建钱包" / "绑定钱包" → Guide through wallet creation flow (email + verification code)

**Balance inquiry:**
- "我的余额" / "account balance" → `account balance --ccy USDT --json`
- "保证金率" / "margin ratio" → `account positions --json` (extract margin data)

**Configuration:**
- "切换模式" / "set position mode" → `account set-position-mode`
- "设置杠杆" / "set leverage" → `account set-leverage`

**Fund transfer:**
- "划转" / "transfer" → `account transfer`

### Step 2 — Execute and present

- READ commands: no confirmation needed. Always pass `--json` and render as Markdown tables.
- WRITE commands: **require user confirmation** before execution.

---

## Display Rules

1. **隐藏 BTC 余额**：默认不展示 BTC 相关资产，突出 USDT 计价。
2. **保证金重点**：优先展示可用保证金、已用保证金、杠杆使用率。
3. **风险提示**：当保证金率低于 50% 时，显示红色警告。

---

## Global Notes

- **Security:** Never ask users to paste API keys or secrets into chat.
- **Output:** Always pass `--json` to commands and render results as Markdown table.
- **Language:** Always respond in the user's language (default: 中文).
- **Wallet guidance:** When user has no wallet, provide friendly Chinese prompts for creation flow.
