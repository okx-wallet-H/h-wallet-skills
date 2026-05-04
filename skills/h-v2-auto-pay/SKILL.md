---
name: h-v2-auto-pay
description: "Use this skill when the user asks about 'auto pay', 'x402 payment', 'pay for data', 'API payment', 'payment limit', 'payment history', 'subscription', 'pay per use', '自动支付', 'x402协议', '按需付费', '数据付费', '支付限额', '支付历史', '订阅', '按次付费', or any request to configure, manage, or query the Agent's automatic payment system for premium APIs and services onchain using USDT. Supports x402 protocol for seamless pay-per-use. Do NOT use for manual token transfers (h-v2-agentic-wallet) or DEX swaps (h-v2-meme-sniper)."
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

# H Wallet 链上自动支付 (Auto Pay)

x402 protocol-based automatic payment system enabling the Agent to seamlessly pay for premium APIs, data services, and onchain tools without interrupting strategy execution. Supports per-request billing, daily/monthly limits, whitelist management, and detailed payment analytics.

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

## Prerequisites

```bash
npm install -g @h-wallet/trade-cli
```

**Required before first use:**
1. Active Agentic Wallet (`h-wallet wallet status` → active)
2. Sufficient USDT balance on X Layer (primary payment chain)
3. Auto-pay must be explicitly enabled by user (security requirement)

## Skill Routing

| Need | Skill |
|---|---|
| Manual token transfers | `h-v2-agentic-wallet` |
| DEX token swaps | `h-v2-meme-sniper` |
| Wallet balance check | `h-v2-agentic-wallet` |
| **Auto-payment for APIs/services** | **This skill** |

## Design Philosophy

> **核心理念**：为数据和服务按需付费，保证 Agent 的全自动闭环不中断。

1. **x402 协议**：标准 HTTP 402 Payment Required 自动响应，无需人工干预。
2. **限额控制**：多层限额（单次/每日/每月），防止恶意或异常扣费。
3. **白名单机制**：只对已授权的服务商自动付费，未知服务商需用户确认。
4. **USDT 优先**：默认使用 X Layer 上的 USDT，Gas 费极低。
5. **透明记账**：每笔支付都有完整记录，可随时审计。
6. **即时暂停**：用户可随时暂停自动支付，不影响已有策略。

## Command Index (7 commands)

### Configuration (3 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 1 | `h-wallet autopay enable` | WRITE | Yes | Enable auto-pay with limits |
| 2 | `h-wallet autopay disable` | WRITE | Yes | Disable auto-pay |
| 3 | `h-wallet autopay amend` | WRITE | Yes | Amend limits and settings |

### Whitelist (2 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 4 | `h-wallet autopay whitelist` | READ | Yes | View whitelisted services |
| 5 | `h-wallet autopay whitelist-add` | WRITE | Yes | Add a service to whitelist |

### Monitoring (2 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 6 | `h-wallet autopay status` | READ | Yes | View current status, limits, and spending |
| 7 | `h-wallet autopay history` | READ | Yes | View detailed payment history |

---

## CLI Command Reference

### autopay enable — 启用自动支付

```bash
h-wallet autopay enable \
  --dailyLimit <n> \
  [--monthlyLimit <n>] \
  [--perRequestLimit <n>] \
  [--token <symbol>] \
  [--chain <chainId>] \
  [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--dailyLimit` | Yes | - | Maximum USDT per day |
| `--monthlyLimit` | No | `dailyLimit * 30` | Maximum USDT per month |
| `--perRequestLimit` | No | `1.0` | Maximum USDT per single request |
| `--token` | No | `USDT` | Payment token |
| `--chain` | No | `196` (X Layer) | Payment chain |

#### Limit Hierarchy

```
Per-Request Limit (e.g. $1.0)
  └── Daily Limit (e.g. $10)
       └── Monthly Limit (e.g. $200)
```

All three must pass for payment to execute. If any limit is exceeded, payment is blocked and user is notified.

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `enabled` | Boolean | true |
| `dailyLimit` | String | Daily limit (USDT) |
| `monthlyLimit` | String | Monthly limit (USDT) |
| `perRequestLimit` | String | Per-request limit (USDT) |
| `token` | String | Payment token |
| `chain` | String | Payment chain |
| `walletAddress` | String | Wallet used for payments |

---

### autopay disable — 禁用自动支付

```bash
h-wallet autopay disable [--json]
```

Immediately disables all automatic payments. Pending payments are cancelled. Running strategies that depend on paid APIs will receive errors (and should gracefully degrade).

---

### autopay amend — 修改设置

```bash
h-wallet autopay amend [--dailyLimit <n>] [--monthlyLimit <n>] [--perRequestLimit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--dailyLimit` | No | unchanged | New daily limit |
| `--monthlyLimit` | No | unchanged | New monthly limit |
| `--perRequestLimit` | No | unchanged | New per-request limit |

> At least one parameter must be provided.

---

### autopay whitelist — 查看白名单

```bash
h-wallet autopay whitelist [--json]
```

#### Response Fields (array)

| Field | Type | Description |
|---|---|---|
| `serviceId` | String | Service identifier |
| `serviceName` | String | Human-readable name |
| `serviceUrl` | String | Service endpoint |
| `addedAt` | String | When added |
| `totalPaid` | String | Total paid to this service |
| `lastPayment` | String | Last payment time |
| `avgCostPerRequest` | String | Average cost per request |

#### Default Whitelist (pre-approved)

| Service | Description | Avg Cost |
|---|---|---|
| OKX Onchain OS Premium | Advanced market data | $0.01/req |
| H Wallet Analytics | Internal analytics | $0.005/req |

---

### autopay whitelist-add — 添加白名单

```bash
h-wallet autopay whitelist-add --serviceUrl <url> --name <name> [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--serviceUrl` | Yes | - | Service endpoint URL |
| `--name` | Yes | - | Human-readable name |

> New services added to whitelist will be auto-paid. User must explicitly add — never auto-add unknown services.

---

### autopay status — 支付状态

```bash
h-wallet autopay status [--json]
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `enabled` | Boolean | Auto-pay enabled? |
| `token` | String | Payment token |
| `chain` | String | Payment chain |
| `walletBalance` | String | Available balance for payments |
| `dailyLimit` | String | Daily limit |
| `spentToday` | String | Spent today |
| `remainingToday` | String | Remaining today |
| `monthlyLimit` | String | Monthly limit |
| `spentThisMonth` | String | Spent this month |
| `remainingThisMonth` | String | Remaining this month |
| `perRequestLimit` | String | Per-request limit |
| `totalLifetimeSpent` | String | Total ever spent |
| `totalRequests` | Integer | Total payment requests |
| `whitelistedServices` | Integer | Number of whitelisted services |
| `blockedRequests` | Integer | Requests blocked (over limit) |
| `lastPayment` | Object | Last payment details |

---

### autopay history — 支付历史

```bash
h-wallet autopay history [--limit <n>] [--period <period>] [--service <name>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--limit` | No | `20` | Number of entries |
| `--period` | No | `all` | Filter: `today`, `week`, `month`, `all` |
| `--service` | No | all | Filter by service name |

#### Response Fields (array)

| Field | Type | Description |
|---|---|---|
| `paymentId` | String | Payment ID |
| `timestamp` | String | Payment time |
| `service` | String | Service name |
| `serviceUrl` | String | Service endpoint |
| `amount` | String | Amount paid (USDT) |
| `txHash` | String | Transaction hash |
| `requestContext` | String | What triggered the payment (e.g. "meme trending data") |
| `status` | String | `completed`, `failed`, `blocked` |
| `failReason` | String | If failed/blocked, why |

#### Summary Fields (appended)

| Field | Type | Description |
|---|---|---|
| `totalInPeriod` | String | Total spent in queried period |
| `requestCount` | Integer | Total requests in period |
| `avgCostPerRequest` | String | Average cost |
| `topService` | String | Most-paid service |

---

## x402 Protocol Flow (技术流程)

### How x402 Works

```
Agent                          Premium API                    Blockchain
  |                                |                              |
  |-- GET /api/premium-data ------>|                              |
  |                                |                              |
  |<-- 402 Payment Required -------|                              |
  |    (invoice in header:         |                              |
  |     amount, recipient,         |                              |
  |     chain, token)              |                              |
  |                                |                              |
  |-- [Check limits] ------------->|                              |
  |   dailyLimit OK?               |                              |
  |   perRequestLimit OK?          |                              |
  |   whitelist OK?                |                              |
  |                                |                              |
  |-- [Sign & broadcast tx] ----------------------------->|       |
  |                                |                      |       |
  |<-- [tx confirmed] -----------------------------------|       |
  |                                |                              |
  |-- GET /api/premium-data ------>|                              |
  |    (with payment proof header) |                              |
  |                                |                              |
  |<-- 200 OK (data) -------------|                              |
```

### x402 Invoice Header Format

```
X-Payment-Required: true
X-Payment-Amount: 0.01
X-Payment-Token: USDT
X-Payment-Chain: 196
X-Payment-Recipient: 0xServiceWallet...
X-Payment-Memo: "premium-market-data-v2"
```

### Payment Decision Logic

```
1. Parse 402 response → extract invoice
2. Check: service URL in whitelist?
   - No → BLOCK, notify user "未知服务请求付费: {url}, 金额: {amount}"
   - Yes → continue
3. Check: amount ≤ perRequestLimit?
   - No → BLOCK, notify "单次金额超限: {amount} > {limit}"
   - Yes → continue
4. Check: spentToday + amount ≤ dailyLimit?
   - No → BLOCK, notify "今日额度已用完"
   - Yes → continue
5. Check: spentThisMonth + amount ≤ monthlyLimit?
   - No → BLOCK, notify "本月额度已用完"
   - Yes → continue
6. Check: walletBalance ≥ amount + gasFee?
   - No → BLOCK, notify "余额不足"
   - Yes → EXECUTE payment
```

---

## Quickstart

```bash
# Enable auto-pay with $10/day limit
h-wallet autopay enable --dailyLimit 10

# Enable with all limits specified
h-wallet autopay enable --dailyLimit 10 --monthlyLimit 200 --perRequestLimit 0.5

# Check current status
h-wallet autopay status

# View payment history for today
h-wallet autopay history --period today

# View whitelist
h-wallet autopay whitelist

# Add a new service to whitelist
h-wallet autopay whitelist-add --serviceUrl "https://api.example.com" --name "Example Analytics"

# Increase daily limit
h-wallet autopay amend --dailyLimit 20

# Disable auto-pay
h-wallet autopay disable
```

## Cross-Skill Workflows

### Seamless Strategy Execution
> Smart Switch needs premium data, auto-pay handles it

```
1. h-v2-smart-switch   Daemon checks market regime
   → Calls premium sentiment API
   → API returns 402

2. h-v2-auto-pay       [INTERNAL] Intercepts 402:
   - Service: OKX Onchain OS Premium ✓ (whitelisted)
   - Amount: $0.01 ✓ (< $1.0 per-request limit)
   - Daily: $0.15 spent + $0.01 = $0.16 ✓ (< $10 daily limit)
   → Executes payment automatically

3. h-v2-smart-switch   Receives premium data, continues analysis
   → User never interrupted
```

### Budget Alert
> Daily limit approaching

```
1. [MONITOR]           spentToday = $8.50, dailyLimit = $10.00
   → Remaining: $1.50 (15%)

2. [NOTIFY]            "自动支付提醒：
   今日已消费 $8.50 / $10.00 (85%)
   剩余额度: $1.50
   如需继续使用高级数据服务，建议提高限额。
   当前策略不受影响（基础数据免费）。"
```

### First-Time Setup
> User: "开启自动支付"

```
1. h-v2-agentic-wallet h-wallet wallet balance-detail --chain 196
   → Check USDT balance on X Layer

2. [GUIDE]             "开启自动支付前确认：
   - X Layer USDT 余额: $150
   - 建议设置:
     · 每日限额: $10 (够用一天的高级数据)
     · 每月限额: $200
     · 单次限额: $1.0
   - 支付方式: USDT (X Layer, Gas 费 < $0.001)
   
   确认开启？"

3. (user confirms)
   h-v2-auto-pay       h-wallet autopay enable --dailyLimit 10 --monthlyLimit 200

4. [CONFIRM]           "已开启自动支付 ✓
   当策略需要高级数据时，将自动从您的 X Layer 钱包扣除 USDT。
   您可以随时通过 'autopay status' 查看消费情况。"
```

## Edge Cases

| Issue | Resolution |
|---|---|
| Unknown service requests payment | BLOCK, notify user, ask to whitelist |
| Amount exceeds per-request limit | BLOCK, notify user |
| Daily limit reached | BLOCK remaining requests, notify, suggest increase |
| Monthly limit reached | BLOCK, notify, strategies degrade to free data |
| Insufficient balance | BLOCK, notify, suggest deposit |
| Payment tx fails (chain issue) | Retry once, if still fails notify user |
| Service returns 402 repeatedly | Possible bug, cap retries at 3, then notify |
| Wallet disconnected | Pause auto-pay, notify user |
| Gas spike on payment chain | Warn if gas > 10% of payment amount |

## Key Rules

1. **User must explicitly enable** — never auto-enable, security first
2. **Whitelist is mandatory** — never pay unknown services automatically
3. **Three-tier limit check** — per-request, daily, monthly all must pass
4. **Transparent logging** — every payment recorded with context
5. **Graceful degradation** — if payment blocked, strategy uses free data (lower quality)
6. **Instant disable** — user can stop all payments immediately
7. **Low-cost chain** — default X Layer for minimal gas overhead

## Display Rules

1. **金额显示**：始终显示 USDT + 小数点后 2-4 位
2. **限额进度**：进度条格式 (█████░░░░░ 50%)
3. **支付状态**：✓ 成功 / ✗ 失败 / ⊘ 被拦截
4. **服务名称**：显示人类可读名称，非 URL

### Parameter Display Names

| API Field | EN | ZH |
|---|---|---|
| `enabled` | Enabled | 已启用 |
| `dailyLimit` | Daily Limit | 每日限额 |
| `monthlyLimit` | Monthly Limit | 每月限额 |
| `perRequestLimit` | Per-Request Limit | 单次限额 |
| `spentToday` | Spent Today | 今日已消费 |
| `remainingToday` | Remaining Today | 今日剩余 |
| `totalLifetimeSpent` | Lifetime Spent | 累计消费 |
| `blockedRequests` | Blocked | 被拦截次数 |
| `walletBalance` | Available Balance | 可用余额 |

## MCP Tool Reference

| CLI Command | MCP Tool | Onchain OS API |
|---|---|---|
| `autopay enable` | `payment_enable` | `POST /api/v5/dex/payment/configure` |
| `autopay disable` | `payment_disable` | `POST /api/v5/dex/payment/disable` |
| `autopay amend` | `payment_amend` | `PUT /api/v5/dex/payment/configure` |
| `autopay whitelist` | `payment_get_whitelist` | `GET /api/v5/dex/payment/whitelist` |
| `autopay whitelist-add` | `payment_add_whitelist` | `POST /api/v5/dex/payment/whitelist` |
| `autopay status` | `payment_get_status` | `GET /api/v5/dex/payment/status` |
| `autopay history` | `payment_get_history` | `GET /api/v5/dex/payment/history` |
