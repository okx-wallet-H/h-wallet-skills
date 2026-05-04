---
name: h-v2-auto-pay
description: "Use this skill when the user asks about 'auto pay', 'x402 payment', 'pay for data', 'API payment', '自动支付', 'x402协议', '按需付费', '数据付费', or any request to configure the Agent to automatically pay for premium APIs or services onchain using USDT. This skill connects to OKX Onchain OS. Do NOT use for manual token transfers (h-v2-agentic-wallet)."
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

# H Wallet 链上自动支付 (Auto Pay)

基于 x402 协议的按需自动付费机制。允许 Agent 在调用外部高级 API（如深度数据分析、高级情绪模型）时，自动从 Agentic Wallet 扣除 USDT 进行支付，确保策略执行不中断。

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Ensure the Agentic Wallet has sufficient USDT balance.

---

## Skill Routing

| User intent | Route to skill |
|---|---|
| Manually send tokens to an address | `h-v2-agentic-wallet` |
| Check wallet balance | `h-v2-agentic-wallet` |
| Configure auto-payment for APIs | **This skill** |

---

## Design Philosophy

> **核心理念**：为数据和服务按需付费，保证 Agent 的全自动闭环。

1. **x402 协议**：支持标准的 HTTP 402 Payment Required 响应，自动解析发票并完成链上支付。
2. **限额控制**：用户可设置每日/每月的最大支付额度，防止恶意扣费。
3. **USDT 优先**：用户偏好使用 USDT 作为支付方式，系统默认使用 X Layer 上的 USDT。

---

## Command Index (3 commands)

| Command | Type | Auth | Description |
|---|---|---|---|
| `autopay config` | WRITE | Required | Set up auto-pay limits and preferred token (USDT) |
| `autopay status` | READ | Required | View current auto-pay limits and recent payments |
| `autopay history` | READ | Required | List detailed history of x402 payments |

---

## Detailed Command Reference

### autopay config — 配置自动支付

```bash
h-wallet autopay config --dailyLimit <n> [--token <symbol>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--dailyLimit` | Yes | — | Maximum USDT to spend per day (e.g. `10`) |
| `--token` | No | `USDT` | Preferred payment token |

**Interactive Flow:**
"已为您开启高级 API 自动支付功能。每日最高限额设为 10 USDT，资金将从您的 X Layer 智能钱包中自动扣除。当策略需要获取高级市场数据时，将自动完成支付，不会打断您的交易。"

---

### autopay status — 支付状态与限额

```bash
h-wallet autopay status [--json]
```

**Response Fields:**
- `isEnabled`: Boolean
- `dailyLimit`: Daily max limit
- `spentToday`: Amount spent today
- `remainingToday`: Remaining limit for today
- `preferredToken`: e.g. `USDT`

---

## Operation Flow

### Integrated Execution
1. Agent attempts to call an external premium API (e.g., advanced sentiment analysis).
2. API returns HTTP 402 with an x402 invoice in the header.
3. The `okx-x402-payment` MCP tool intercepts the 402 response.
4. Checks against `autopay status` limits.
5. If within limits, uses TEE Wallet to sign and broadcast the payment transaction.
6. Retries the API call with the payment proof.
7. Strategy continues seamlessly.

---

## MCP Tool Reference (Onchain OS)

| CLI Command | MCP Tool | OKX Onchain OS Skill |
|---|---|---|
| `autopay config` | `payment_configure` | `okx-x402-payment` |
| `autopay status` | `payment_get_status` | `okx-x402-payment` |
| `autopay history` | `payment_get_history` | `okx-x402-payment` |
