---
name: h-v2-security-guard
description: "Use this skill when the user asks about 'token risk', 'honeypot check', 'rug pull', 'contract security', 'revoke approval', 'security scan', 'is this safe', 'can I sell', 'token audit', 'approval management', 'wallet security', '安全检查', '貔貅盘', '防Rug', '合约安全', '撤销授权', '风险扫描', '能卖吗', '安全吗', '代币审计', '授权管理', '钱包安全', or any request to check token safety, audit contracts, manage wallet approvals, or assess onchain risks. This is a CRITICAL dependency for h-v2-meme-sniper — all buy operations MUST pass security scan first. Do NOT use for market data (h-v2-meme-market) or trading execution (h-v2-meme-sniper)."
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

# H Wallet 链上安全守卫 (Security Guard)

Comprehensive onchain security layer providing token risk scanning, honeypot detection, contract auditing, transaction simulation, approval management, and blacklist checking. Acts as the mandatory pre-trade security gate for all Meme sniper operations.

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

## Prerequisites

```bash
npm install -g @h-wallet/trade-cli
# Security scan commands are PUBLIC — no API key required
# Approval management requires active Agentic Wallet
```

## Skill Routing

| Need | Skill |
|---|---|
| Token market data and analysis | `h-v2-meme-market` |
| Buy/sell meme tokens | `h-v2-meme-sniper` |
| Wallet creation and management | `h-v2-agentic-wallet` |
| **Token safety check, approvals, risk** | **This skill** |

## Design Philosophy

> **核心理念**：宁可错过，绝不踩坑。安全是一切交易的前提。

1. **强制前置**：`h-v2-meme-sniper` 的任何买入操作前，MUST 调用本模块扫描。
2. **多维检测**：代码审计 + 行为分析 + 历史记录 + 模拟交易，四重验证。
3. **零容忍**：`Danger` 级别的代币，无论用户如何坚持，绝不执行买入。
4. **主动防御**：定期扫描授权，自动提醒撤销高风险授权。
5. **黑名单同步**：实时同步已知恶意合约地址库。
6. **交易模拟**：买入前模拟卖出，确认可以正常退出。

## Command Index (8 commands)

### Token Scanning (3 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 1 | `h-wallet security scan` | READ | No | Comprehensive token risk scan |
| 2 | `h-wallet security simulate` | READ | No | Simulate buy+sell to detect honeypot |
| 3 | `h-wallet security audit` | READ | No | Deep contract code audit |

### Approval Management (3 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 4 | `h-wallet security approvals` | READ | Yes | List all token approvals |
| 5 | `h-wallet security revoke` | WRITE | Yes | Revoke a specific approval |
| 6 | `h-wallet security revoke-all` | WRITE | Yes | Revoke all risky approvals |

### Blacklist & History (2 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 7 | `h-wallet security blacklist` | READ | No | Check if address is in known blacklist |
| 8 | `h-wallet security history` | READ | Yes | View past scan results |

---

## CLI Command Reference

### security scan — 综合风险扫描

```bash
h-wallet security scan --token <address> --chain <chainId> [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--token` | Yes | - | Token contract address |
| `--chain` | Yes | - | Chain ID |

#### Risk Checks Performed (15 checks)

| # | Check | Category | Description |
|---|---|---|---|
| 1 | `isHoneypot` | Critical | Can the token be sold? (simulate sell) |
| 2 | `buyTax` | Tax | Buy tax percentage |
| 3 | `sellTax` | Tax | Sell tax percentage |
| 4 | `isVerified` | Code | Source code verified on explorer |
| 5 | `isMintable` | Code | Can creator mint unlimited tokens |
| 6 | `isProxy` | Code | Is upgradeable proxy (can change logic) |
| 7 | `isRenounced` | Ownership | Ownership renounced |
| 8 | `hasBlacklist` | Code | Contract has blacklist function |
| 9 | `hasPauseFunction` | Code | Contract can pause transfers |
| 10 | `hasMaxTxLimit` | Code | Has max transaction amount limit |
| 11 | `isAntiWhale` | Code | Has anti-whale mechanism |
| 12 | `creatorBalance` | Holder | Creator still holds significant % |
| 13 | `top10Concentration` | Holder | Top 10 holders concentration |
| 14 | `lpLocked` | Liquidity | Liquidity pool tokens locked |
| 15 | `isInBlacklist` | Database | Address in known scam database |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `token` | String | Token address |
| `chain` | String | Chain name |
| `riskLevel` | String | `Safe`, `Warning`, `Danger` |
| `riskScore` | Integer | 0-100 (0=safest, 100=most dangerous) |
| `checks` | Array | Individual check results |
| `summary` | String | Human-readable risk summary |
| `recommendation` | String | `proceed`, `caution`, `avoid` |

#### Per-Check Fields

| Field | Type | Description |
|---|---|---|
| `name` | String | Check name |
| `passed` | Boolean | Whether check passed |
| `severity` | String | `info`, `low`, `medium`, `high`, `critical` |
| `detail` | String | Detailed explanation |
| `value` | String | Actual value found |

#### Risk Level Determination

| Risk Level | Condition | Action |
|---|---|---|
| **`Safe`** | riskScore 0-25, no critical failures | Proceed with trade |
| **`Warning`** | riskScore 26-60, some medium/high issues | Show warnings, require explicit confirmation |
| **`Danger`** | riskScore 61-100, OR any critical failure | **BLOCK trade**, refuse to execute |

#### Critical Failures (immediate Danger)

Any ONE of these = `Danger`:
- `isHoneypot = true` (cannot sell)
- `sellTax > 50%` (effectively cannot sell)
- `isInBlacklist = true` (known scam)
- `isMintable = true AND isRenounced = false` (can inflate supply)

#### Scoring Matrix

| Check | Weight | Safe | Warning | Danger |
|---|---|---|---|---|
| isHoneypot | 30 | false | - | true |
| sellTax | 15 | 0-3% | 3-10% | >10% |
| buyTax | 10 | 0-3% | 3-10% | >10% |
| isVerified | 10 | true | - | false |
| isMintable | 10 | false | true+renounced | true+not renounced |
| isRenounced | 5 | true | - | false |
| lpLocked | 10 | >80% locked | 20-80% | <20% or unlocked |
| top10Concentration | 5 | <30% | 30-50% | >50% |
| creatorBalance | 5 | <5% | 5-20% | >20% |

---

### security simulate — 模拟交易

```bash
h-wallet security simulate --token <address> --chain <chainId> [--amount <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--token` | Yes | - | Token contract address |
| `--chain` | Yes | - | Chain ID |
| `--amount` | No | `100` | Simulated buy amount in USDT |

#### Simulation Flow

```
1. Simulate BUY: USDT → Token (via DEX aggregator)
   → Record: tokens received, actual buy tax, gas used

2. Simulate SELL: Token → USDT (same route, reverse)
   → Record: USDT received, actual sell tax, gas used

3. Calculate: net result after round-trip
   → If net loss > 30%: likely honeypot or high-tax scam
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `canBuy` | Boolean | Buy simulation succeeded |
| `canSell` | Boolean | Sell simulation succeeded |
| `buyTaxActual` | String | Actual buy tax from simulation (%) |
| `sellTaxActual` | String | Actual sell tax from simulation (%) |
| `roundTripLoss` | String | Total loss from buy+sell (%) |
| `estimatedGas` | String | Estimated gas for buy+sell |
| `isHoneypot` | Boolean | Cannot sell = honeypot |
| `sellRevertReason` | String | If sell failed, the revert reason |
| `priceImpact` | String | Price impact of simulated trade |

---

### security audit — 深度合约审计

```bash
h-wallet security audit --token <address> --chain <chainId> [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--token` | Yes | - | Token contract address |
| `--chain` | Yes | - | Chain ID |

#### Audit Checks (beyond basic scan)

| Check | Description |
|---|---|
| `externalCalls` | Does contract make external calls (reentrancy risk)? |
| `selfDestruct` | Can contract self-destruct? |
| `delegateCall` | Uses delegatecall (proxy pattern)? |
| `hiddenMint` | Hidden mint functions in bytecode? |
| `hiddenFees` | Dynamic fee functions that can be changed? |
| `ownerPrivileges` | What can owner do? (list all privileged functions) |
| `timelockPresent` | Is there a timelock on admin functions? |
| `similarContracts` | Known similar contracts (fork detection) |
| `deployerHistory` | Deployer's past contracts (scam history?) |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `contractName` | String | Contract name from source |
| `compiler` | String | Solidity compiler version |
| `isVerified` | Boolean | Source code verified |
| `sourceLines` | Integer | Lines of source code |
| `auditFindings` | Array | List of audit findings |
| `ownerFunctions` | Array | List of owner-only functions |
| `deployerAddress` | String | Deployer address |
| `deployerPastContracts` | Integer | Number of past contracts by deployer |
| `deployerScamCount` | Integer | Known scam contracts by deployer |
| `similarTo` | String | Most similar known contract (if any) |
| `overallRisk` | String | `low`, `medium`, `high`, `critical` |

---

### security approvals — 授权列表

```bash
h-wallet security approvals [--chain <chainId>] [--riskOnly] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--chain` | No | all | Filter by chain |
| `--riskOnly` | No | `false` | Only show risky approvals |

#### Response Fields (array)

| Field | Type | Description |
|---|---|---|
| `token` | String | Token symbol |
| `tokenAddress` | String | Token contract |
| `spender` | String | Approved spender address |
| `spenderLabel` | String | Known label (DEX name, or "Unknown") |
| `allowance` | String | Approved amount (or "Unlimited") |
| `valueAtRisk` | String | USD value at risk |
| `chain` | String | Chain name |
| `approvedAt` | String | When approval was granted |
| `riskLevel` | String | `safe`, `medium`, `high` |
| `riskReason` | String | Why flagged as risky |

#### Risk Classification for Approvals

| Risk | Condition |
|---|---|
| `safe` | Known DEX (Uniswap, Raydium, etc.) + reasonable allowance |
| `medium` | Unknown spender OR unlimited allowance |
| `high` | Spender in blacklist OR spender contract unverified |

---

### security revoke — 撤销单个授权

```bash
h-wallet security revoke --token <address> --spender <address> --chain <chainId> [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--token` | Yes | - | Token contract address |
| `--spender` | Yes | - | Spender contract to revoke |
| `--chain` | Yes | - | Chain ID |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `txHash` | String | Revoke transaction hash |
| `token` | String | Token revoked |
| `spender` | String | Spender revoked |
| `previousAllowance` | String | Previous allowance |
| `newAllowance` | String | "0" |
| `gasFee` | String | Gas fee paid |
| `explorerUrl` | String | Transaction link |

---

### security revoke-all — 批量撤销高风险授权

```bash
h-wallet security revoke-all [--chain <chainId>] [--riskLevel <level>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--chain` | No | all | Filter by chain |
| `--riskLevel` | No | `high` | Minimum risk level to revoke: `medium`, `high` |

Revokes all approvals at or above the specified risk level. Shows preview before executing.

---

### security blacklist — 黑名单查询

```bash
h-wallet security blacklist --address <address> [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--address` | Yes | - | Address to check (token or wallet) |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `address` | String | Queried address |
| `isBlacklisted` | Boolean | In blacklist? |
| `reason` | String | Why blacklisted (if applicable) |
| `reportCount` | Integer | Number of reports |
| `firstReported` | String | First report date |
| `labels` | Array | Known labels: `honeypot`, `rug_pull`, `phishing`, `mixer` |
| `relatedAddresses` | Array | Known related malicious addresses |

---

### security history — 扫描历史

```bash
h-wallet security history [--limit <n>] [--riskLevel <level>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--limit` | No | `20` | Number of results |
| `--riskLevel` | No | all | Filter by risk level |

Shows past scan results for reference and pattern detection.

---

## Quickstart

```bash
# Quick scan a token before buying
h-wallet security scan --token 0x6982508145454Ce325dDbE47a25d4ec3d2311933 --chain 1

# Simulate buy+sell to detect honeypot
h-wallet security simulate --token 0x6982... --chain 1 --amount 100

# Deep contract audit
h-wallet security audit --token 0x6982... --chain 1

# Check if address is blacklisted
h-wallet security blacklist --address 0xdead...

# View all approvals
h-wallet security approvals

# View only risky approvals
h-wallet security approvals --riskOnly

# Revoke a specific approval
h-wallet security revoke --token 0xUSDT... --spender 0xSuspicious... --chain 1

# Batch revoke all high-risk approvals
h-wallet security revoke-all --riskLevel high

# View scan history
h-wallet security history --limit 10
```

## Cross-Skill Workflows

### Pre-Trade Security Gate (强制安全门)
> Called automatically by h-v2-meme-sniper before every buy

```
1. h-v2-security-guard h-wallet security scan --token <addr> --chain <chain>
   → Get risk level

2. IF riskLevel == "Danger":
   → BLOCK trade
   → Report: "拦截：该代币存在以下严重风险：
     - ❌ 貔貅盘：模拟卖出失败
     - ❌ 卖出税 85%
     - ❌ 部署者曾创建 3 个已知骗局合约
     已自动取消买入操作。"

3. IF riskLevel == "Warning":
   → Show warnings, ask confirmation:
   "该代币存在以下风险：
     - ⚠️ 合约未开源
     - ⚠️ 前10持有人占比 45%
     - ⚠️ 流动性未锁定
     风险评分: 42/100
     是否仍要继续？(需要明确确认)"

4. IF riskLevel == "Safe":
   → Proceed to h-v2-meme-sniper
   → Report: "安全检查通过 ✓ (评分: 15/100)"
```

### Weekly Security Maintenance
> Agent proactively suggests

```
1. h-v2-security-guard h-wallet security approvals --riskOnly
   → Find risky approvals

2. [REPORT]            "安全提醒：发现 X 个高风险授权：
   | 代币 | 授权对象 | 风险 | 金额 |
   |------|---------|------|------|
   | USDT | 0xSus... (未知合约) | 高 | 无限 |
   | WETH | 0xOld... (已废弃DEX) | 中 | 500 |
   
   建议撤销以上授权，预计 Gas 费: ~$5
   是否执行？"

3. (user confirms)
   h-v2-security-guard h-wallet security revoke-all --riskLevel high
```

### Deployer Investigation
> User: "这个币的开发者靠谱吗？"

```
1. h-v2-security-guard h-wallet security audit --token <addr> --chain <chain>
   → Get deployer history

2. [ANALYZE]           Check:
   - deployerPastContracts: how many?
   - deployerScamCount: any scams?
   - Contract similarity to known scams?

3. [REPORT]            "开发者分析：
   - 地址: 0xDev...
   - 历史合约: 12 个
   - 已知骗局: 0 个
   - 合约代码: 与 SafeMoon fork 相似度 85%
   - 结论: 代码是 fork，但开发者无不良记录"
```

## Edge Cases

| Issue | Resolution |
|---|---|
| Token on unsupported chain | Report "不支持该链的安全扫描", suggest manual review |
| Contract not verified (no source) | Mark as Warning, note "无法进行代码审计" |
| Simulation fails (not honeypot, just error) | Retry once, if still fails mark as Warning |
| Token has dynamic tax (changes over time) | Warn user: "税率可能随时变化" |
| Proxy contract (upgradeable) | Flag as Warning: "合约可升级，逻辑可能被修改" |
| New token (< 1 hour old) | Extra caution: "代币极新，数据不足，风险较高" |
| Blacklist data outdated | Note: "黑名单数据可能有延迟，不代表绝对安全" |
| Revoke tx fails | Retry with higher gas, report if still fails |
| Multiple approvals same spender | Group and revoke together |

## Key Rules

1. **Scan is MANDATORY before any buy** — h-v2-meme-sniper MUST call scan first
2. **Danger = absolute block** — never execute trade on Danger tokens, no exceptions
3. **Simulation > static analysis** — actual buy+sell simulation is more reliable than code reading
4. **Deployer history matters** — past scam deployers are high risk regardless of current code
5. **Unlimited approvals are risky** — always flag, suggest revoking after trade
6. **Proactive maintenance** — suggest weekly approval cleanup
7. **Err on side of caution** — when in doubt, classify as Warning not Safe

## Display Rules

1. **风险等级颜色**：Safe=🟢, Warning=🟡, Danger=🔴
2. **检查项显示**：通过=✓, 警告=⚠️, 失败=❌
3. **评分显示**：0-25 绿色, 26-60 黄色, 61-100 红色
4. **地址缩写**：`0x6982...1933`
5. **已知标签**：显示 DEX 名称而非地址

### Parameter Display Names

| API Field | EN | ZH |
|---|---|---|
| `riskLevel` | Risk Level | 风险等级 |
| `riskScore` | Risk Score | 风险评分 |
| `isHoneypot` | Honeypot | 貔貅盘 |
| `buyTax` | Buy Tax | 买入税 |
| `sellTax` | Sell Tax | 卖出税 |
| `isVerified` | Verified | 已验证 |
| `isMintable` | Mintable | 可增发 |
| `isRenounced` | Renounced | 已放弃所有权 |
| `lpLocked` | LP Locked | 流动性锁定 |
| `allowance` | Allowance | 授权额度 |
| `valueAtRisk` | Value at Risk | 风险金额 |
| `roundTripLoss` | Round-Trip Loss | 往返损耗 |
| `deployerScamCount` | Deployer Scam History | 开发者骗局记录 |

## MCP Tool Reference

| CLI Command | MCP Tool | Onchain OS API |
|---|---|---|
| `security scan` | `security_scan_token` | `GET /api/v5/dex/security/token-scan` |
| `security simulate` | `security_simulate_trade` | `POST /api/v5/dex/security/simulate` |
| `security audit` | `security_audit_contract` | `GET /api/v5/dex/security/contract-audit` |
| `security approvals` | `security_get_approvals` | `GET /api/v5/dex/security/approvals` |
| `security revoke` | `security_revoke_approval` | `POST /api/v5/dex/security/revoke` |
| `security revoke-all` | `security_revoke_batch` | `POST /api/v5/dex/security/revoke-batch` |
| `security blacklist` | `security_check_blacklist` | `GET /api/v5/dex/security/blacklist` |
| `security history` | `security_get_history` | `GET /api/v5/dex/security/scan-history` |
