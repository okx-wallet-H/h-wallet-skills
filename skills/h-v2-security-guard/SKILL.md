---
name: h-v2-security-guard
description: "Use this skill when the user asks about 'token risk', 'honeypot check', 'rug pull', 'contract security', 'revoke approval', 'security scan', '安全检查', '貔貅盘', '防Rug', '合约安全', '撤销授权', '风险扫描', or any request to check token safety or manage wallet approvals onchain. This skill connects to OKX Onchain OS. Do NOT use for market data analysis (h-v2-meme-market)."
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

# H Wallet 链上安全守卫 (Security Guard)

Meme 币专属风险拦截器与钱包授权管家。提供交易预执行、貔貅盘检测、恶意授权撤销功能，保护智能钱包资金安全。

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).

---

## Skill Routing

| User intent | Route to skill |
|---|---|
| Search trending Meme coins | `h-v2-meme-market` |
| Execute a snipe/buy | `h-v2-meme-sniper` |
| Check token contract safety, rug risk | **This skill** |

---

## Design Philosophy

> **核心理念**：宁可错过，绝不踩坑。

1. **强制拦截**：在 `h-v2-meme-sniper` 执行任何买入操作前，必须强制调用本模块进行风险扫描。
2. **多维检测**：不仅检测合约代码（是否开源、是否可增发），还要检测链上行为（是否只能买不能卖——貔貅盘）。
3. **主动清理**：定期扫描 Agentic Wallet 的授权记录，提示并自动撤销高风险授权。

---

## Command Index (3 commands)

| Command | Type | Auth | Description |
|---|---|---|---|
| `security scan` | READ | No | Scan a token contract for honeypot and rug risks |
| `security approvals` | READ | Required | List all token approvals for the Agentic Wallet |
| `security revoke` | WRITE | Required | Revoke a specific token approval |

---

## Detailed Command Reference

### security scan — 代币风险扫描

```bash
h-wallet security scan --token <address> [--network <net>] [--json]
```

**Risk Checks Performed:**
- **Is Honeypot**: Can the token be sold?
- **Buy/Sell Tax**: Are taxes excessively high (>10%)?
- **Contract Verified**: Is the source code verified?
- **Mintable**: Can the creator mint more tokens?
- **Ownership Renounced**: Has the creator given up control?

**Response:**
Returns a `riskLevel` (`Safe`, `Warning`, `Danger`) and a list of specific red flags.

> **Rule**: If `riskLevel` is `Danger`, the Agent MUST refuse to execute the snipe.

---

### security approvals — 授权记录扫描

```bash
h-wallet security approvals [--network <net>] [--json]
```

Lists all contracts that have been granted allowance to spend tokens from the Agentic Wallet. Flags contracts that have been reported as malicious.

---

### security revoke — 撤销恶意授权

```bash
h-wallet security revoke --token <address> --spender <address> [--network <net>] [--json]
```

Generates and broadcasts a transaction to set the allowance of a specific spender to 0.

---

## Operation Flow

### Integrated Sniper Flow
1. User: "冲这个币 0x123..."
2. Agent calls `h-v2-security-guard security scan --token 0x123...`
3. If `Danger`: "拦截：该代币存在貔貅风险（无法卖出），已自动取消狙击。"
4. If `Safe`: Proceed to `h-v2-meme-sniper`.

### Routine Maintenance
Agent should proactively suggest checking approvals once a week:
"为了您的资金安全，建议定期扫描并清理不必要的合约授权。"

---

## MCP Tool Reference (Onchain OS)

| CLI Command | MCP Tool | OKX Onchain OS Skill |
|---|---|---|
| `security scan` | `security_token_risk` | `okx-security` |
| `security approvals` | `security_get_approvals` | `okx-security` |
| `security revoke` | `security_revoke_approval` | `okx-security` |
