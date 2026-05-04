---
name: h-v2-agentic-wallet
description: "Use this skill when the user asks about 'onchain wallet', 'create wallet', 'web3 wallet', 'chain balance', 'send token', 'transfer onchain', 'wallet address', 'sub wallet', 'multi wallet', 'wallet history', 'onchain assets', 'agentic wallet', 'TEE wallet', 'cross-chain', 'bridge', 'gas fee', 'NFT', '链上钱包', '创建钱包', 'Web3钱包', '链上余额', '转账', '钱包地址', '子钱包', '多钱包', '钱包历史', '链上资产', '智能钱包', 'TEE钱包', '跨链', '桥', 'Gas费', or any request to create, manage, query, or transfer assets using the onchain agentic wallet (non-CEX). Covers wallet creation, multi-chain balance queries, onchain transfers, sub-wallet management, and transaction history. Do NOT use for CEX operations (h-v1-*), meme trading (h-v2-meme-sniper), or market data (h-v2-meme-market)."
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

# H Wallet Agentic Wallet (链上智能钱包)

Onchain agentic wallet powered by OKX Onchain OS. Supports TEE-secured key management, multi-chain asset queries, onchain transfers, sub-wallet isolation, and transaction history. Runs on **X Layer (OKX L2)** as primary chain with cross-chain support for 30+ networks.

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for version check.

## Prerequisites

```bash
npm install -g @h-wallet/trade-cli
h-wallet config init   # select "onchain" mode
```

## Credential & Profile Check

### Step A — Verify onchain wallet status

```bash
h-wallet wallet status --json
```

| Status | Action |
|---|---|
| `active` | Wallet exists and is ready — proceed |
| `not_created` | No wallet yet — guide user through `wallet create` |
| `locked` | Wallet is locked — prompt for unlock (biometric/PIN) |
| `recovering` | Recovery in progress — wait |

### Step B — Network selection

Default network: **X Layer (chainId: 196)**. For other chains, user must specify `--chain <chainId>`.

Supported networks (partial list):

| Chain | chainId | Native Token | Avg Confirm |
|---|---|---|---|
| X Layer | 196 | OKB | ~3s |
| Ethereum | 1 | ETH | ~12s |
| BNB Chain | 56 | BNB | ~3s |
| Polygon | 137 | MATIC | ~2s |
| Arbitrum | 42161 | ETH | ~1s |
| Optimism | 10 | ETH | ~2s |
| Avalanche | 43114 | AVAX | ~2s |
| Solana | 501 | SOL | ~0.4s |
| Base | 8453 | ETH | ~2s |
| TON | 607 | TON | ~5s |

### Handling Auth Errors

- `401` or "wallet not found" → guide user to `wallet create`
- `403` or "wallet locked" → prompt unlock
- Network timeout → retry once, then report to user

## Skill Routing

| Need | Skill |
|---|---|
| CEX account, balance, positions | `h-v1-wallet-auth` |
| CEX trading, orders | `h-v1-perp-trade` |
| Meme token market data | `h-v2-meme-market` |
| Meme token sniping | `h-v2-meme-sniper` |
| Token security scanning | `h-v2-security-guard` |
| Strategy switching | `h-v2-smart-switch` |
| API payments | `h-v2-auto-pay` |
| **Onchain wallet management** | **This skill** |

## Design Philosophy

> **核心理念**：安全第一，链上资产完全由用户控制。

1. **X Layer 优先**：默认在 OKX L2 上操作，Gas 费极低（约 $0.001）。
2. **TEE 安全**：私钥存储在可信执行环境中，即使服务器被攻破也无法提取。
3. **主钱包 + 子钱包**：主钱包管理资金，子钱包隔离风险（最多 50 个）。
4. **中文引导**：新用户全程中文提示，降低 Web3 门槛。
5. **永不自动转账大额**：超过用户设定限额的转账必须二次确认。
6. **跨链透明**：跨链操作自动选择最优路由，但必须告知用户 Gas 和时间预估。

## Command Index (12 commands)

### Wallet Lifecycle (3 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 1 | `h-wallet wallet create` | WRITE | No | Create a new agentic wallet (TEE-secured) |
| 2 | `h-wallet wallet recover` | WRITE | No | Recover wallet from backup phrase |
| 3 | `h-wallet wallet status` | READ | No | Check wallet status and info |

### Multi-Chain Balance (3 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 4 | `h-wallet wallet balance` | READ | Yes | Query balance across all chains |
| 5 | `h-wallet wallet balance-detail` | READ | Yes | Detailed token balances on specific chain |
| 6 | `h-wallet wallet nfts` | READ | Yes | List NFTs owned |

### Transfers (2 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 7 | `h-wallet wallet send` | WRITE | Yes | Send tokens onchain |
| 8 | `h-wallet wallet send-cross` | WRITE | Yes | Cross-chain transfer (bridge) |

### Sub-Wallet Management (3 commands)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 9 | `h-wallet wallet sub-create` | WRITE | Yes | Create a sub-wallet |
| 10 | `h-wallet wallet sub-list` | READ | Yes | List all sub-wallets |
| 11 | `h-wallet wallet sub-transfer` | WRITE | Yes | Transfer between main and sub-wallet |

### History (1 command)

| # | Command | Type | Auth | Description |
|---|---|---|---|---|
| 12 | `h-wallet wallet history` | READ | Yes | Transaction history |

## CLI Command Reference

### wallet create — 创建钱包

```bash
h-wallet wallet create [--name <name>] [--backup] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--name` | No | "Main Wallet" | Wallet display name |
| `--backup` | No | false | Show backup mnemonic phrase after creation |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `walletId` | String | Wallet unique ID |
| `address` | String | Primary address (X Layer, EVM format) |
| `addresses` | Object | Per-chain addresses (`evm`, `solana`, `ton`) |
| `name` | String | Display name |
| `createdAt` | String | ISO 8601 creation timestamp |
| `securityLevel` | String | `tee` (hardware-secured) |

#### Creation Flow (中文引导)

```
1. "欢迎使用 H Wallet！正在为您创建安全钱包..."
2. "钱包创建成功！您的 X Layer 地址是: 0x..."
3. (if --backup) "请妥善保管以下助记词，这是恢复钱包的唯一方式："
4. "建议您先充值少量 OKB 作为 Gas 费"
```

> **SECURITY**: If `--backup` is used, mnemonic is shown ONCE. Never store or log it.

---

### wallet recover — 恢复钱包

```bash
h-wallet wallet recover [--json]
```

Interactive mode only — prompts for mnemonic input securely.

> **SECURITY**: NEVER ask user to paste mnemonic in chat. Always guide to interactive CLI mode: `h-wallet wallet recover`

---

### wallet status — 钱包状态

```bash
h-wallet wallet status [--json]
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `status` | String | `active`, `not_created`, `locked`, `recovering` |
| `walletId` | String | Wallet ID (if exists) |
| `address` | String | Primary EVM address |
| `addresses` | Object | All chain addresses |
| `securityLevel` | String | `tee` |
| `subWalletCount` | Integer | Number of sub-wallets |
| `lastActivity` | String | Last transaction timestamp |
| `dailyLimit` | String | Daily transfer limit (USDT equivalent) |
| `dailyUsed` | String | Amount transferred today |

---

### wallet balance — 跨链余额总览

```bash
h-wallet wallet balance [--chain <chainId>] [--token <symbol>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--chain` | No | all | Filter by chain ID |
| `--token` | No | all | Filter by token symbol (e.g. `USDT`, `ETH`) |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `totalValueUsd` | String | Total portfolio value (USD) |
| `chains` | Array | Per-chain breakdown |

#### Per-Chain Fields

| Field | Type | Description |
|---|---|---|
| `chainId` | Integer | Chain ID |
| `chainName` | String | Chain name |
| `nativeBalance` | String | Native token balance |
| `nativeValueUsd` | String | Native token value (USD) |
| `tokens` | Array | ERC-20/SPL token balances |

#### Per-Token Fields

| Field | Type | Description |
|---|---|---|
| `symbol` | String | Token symbol |
| `contractAddress` | String | Token contract address |
| `balance` | String | Token balance (human-readable, post-decimal) |
| `valueUsd` | String | Token value (USD) |
| `decimals` | Integer | Token decimals |
| `verified` | Boolean | Whether token is verified/listed |

> **Display Rule**: Always highlight USDT balance first. Hide tokens < $1 unless `--includeSmall`.

---

### wallet balance-detail — 单链详细余额

```bash
h-wallet wallet balance-detail --chain <chainId> [--includeSmall] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--chain` | Yes | - | Chain ID |
| `--includeSmall` | No | false | Include tokens with < $1 value |

Returns same structure as `wallet balance` but for a single chain with full token list.

---

### wallet nfts — NFT 列表

```bash
h-wallet wallet nfts [--chain <chainId>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--chain` | No | all | Filter by chain |
| `--limit` | No | 50 | Max results |

#### Response Fields (array)

| Field | Type | Description |
|---|---|---|
| `name` | String | NFT name |
| `collection` | String | Collection name |
| `tokenId` | String | Token ID |
| `contractAddress` | String | Contract address |
| `chain` | String | Chain name |
| `imageUrl` | String | NFT image URL |
| `floorPrice` | String | Collection floor price |

---

### wallet send — 链上转账

```bash
h-wallet wallet send --to <address> --token <symbol> --amount <n> \
  [--chain <chainId>] [--gasPrice <gwei>] [--memo <text>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--to` | Yes | - | Recipient address |
| `--token` | Yes | - | Token symbol (e.g. `USDT`, `ETH`, `OKB`) or contract address |
| `--amount` | Yes | - | Amount to send |
| `--chain` | No | 196 (X Layer) | Chain ID |
| `--gasPrice` | No | auto | Gas price in Gwei (auto = market rate) |
| `--memo` | No | - | Transaction memo/note |

#### Pre-Send Validation (automatic)

| Check | Condition | Action |
|---|---|---|
| Balance | token balance < amount | Error: "余额不足" |
| Gas | native balance < estimated gas | Error: "Gas 费不足，请先充值 {native token}" |
| Address format | invalid for target chain | Error: "地址格式不正确" |
| Daily limit | amount > daily limit | Require double-confirmation |
| New address | first-time recipient | Show warning: "首次向该地址转账，请确认地址正确" |
| Contract address | `to` is a contract | Warning: "目标是合约地址，请确认这不是误操作" |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `txHash` | String | Transaction hash |
| `status` | String | `pending`, `confirmed`, `failed` |
| `from` | String | Sender address |
| `to` | String | Recipient address |
| `amount` | String | Amount sent |
| `token` | String | Token symbol |
| `chain` | String | Chain name |
| `gasFee` | String | Gas fee paid (native token) |
| `gasFeeUsd` | String | Gas fee (USD equivalent) |
| `timestamp` | String | Transaction timestamp |
| `explorerUrl` | String | Block explorer link |

> **CRITICAL**: Always show transaction summary and ask for confirmation before executing send.

---

### wallet send-cross — 跨链转账

```bash
h-wallet wallet send-cross --to <address> --token <symbol> --amount <n> \
  --fromChain <chainId> --toChain <chainId> [--slippage <pct>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--to` | Yes | - | Recipient address (can be self for cross-chain consolidation) |
| `--token` | Yes | - | Token symbol |
| `--amount` | Yes | - | Amount |
| `--fromChain` | Yes | - | Source chain ID |
| `--toChain` | Yes | - | Destination chain ID |
| `--slippage` | No | `0.5` | Max slippage percentage |

#### Pre-Execution Display (MUST show before executing)

```
┌─────────────────────────────────────────┐
│ 跨链转账确认                              │
├─────────────────────────────────────────┤
│ 路线: Ethereum → X Layer                 │
│ 代币: USDT                               │
│ 数量: 500 USDT                           │
│ 预计到账: ~5 分钟                         │
│ 桥接费: ~$2.50                           │
│ 实际到账: ~497.50 USDT                   │
│ 滑点保护: 0.5%                           │
└─────────────────────────────────────────┘
确认执行？(Y/N)
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `bridgeId` | String | Bridge order ID |
| `txHashFrom` | String | Source chain tx hash |
| `txHashTo` | String | Destination chain tx hash (available after completion) |
| `status` | String | `pending`, `bridging`, `completed`, `failed` |
| `fromChain` | String | Source chain |
| `toChain` | String | Destination chain |
| `amountSent` | String | Amount sent |
| `amountReceived` | String | Amount received (after fees) |
| `bridgeFee` | String | Bridge fee |
| `estimatedTime` | String | Estimated completion time |

---

### wallet sub-create — 创建子钱包

```bash
h-wallet wallet sub-create --name <name> [--purpose <purpose>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--name` | Yes | - | Sub-wallet display name |
| `--purpose` | No | `general` | Purpose tag: `sniper`, `defi`, `nft`, `test`, `general` |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `subWalletId` | String | Sub-wallet ID |
| `address` | String | Sub-wallet address (EVM) |
| `name` | String | Display name |
| `purpose` | String | Purpose tag |
| `createdAt` | String | Creation timestamp |

> **Purpose tags** help organize wallets: `sniper` wallets are used by `h-v2-meme-sniper`, `defi` for yield farming, etc.

---

### wallet sub-list — 子钱包列表

```bash
h-wallet wallet sub-list [--purpose <purpose>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--purpose` | No | all | Filter by purpose tag |

#### Response Fields (array)

| Field | Type | Description |
|---|---|---|
| `subWalletId` | String | Sub-wallet ID |
| `address` | String | Address |
| `name` | String | Display name |
| `purpose` | String | Purpose tag |
| `totalValueUsd` | String | Total balance (USD) |
| `lastActivity` | String | Last transaction time |

---

### wallet sub-transfer — 主/子钱包间划转

```bash
h-wallet wallet sub-transfer --from <walletId> --to <walletId> \
  --token <symbol> --amount <n> [--chain <chainId>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--from` | Yes | - | Source wallet ID (`main` or sub-wallet ID) |
| `--to` | Yes | - | Destination wallet ID (`main` or sub-wallet ID) |
| `--token` | Yes | - | Token symbol |
| `--amount` | Yes | - | Amount |
| `--chain` | No | 196 | Chain ID |

> Internal transfers on same chain are gas-free (signed internally).

---

### wallet history — 交易历史

```bash
h-wallet wallet history [--chain <chainId>] [--token <symbol>] [--type <type>] \
  [--walletId <id>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--chain` | No | all | Filter by chain |
| `--token` | No | all | Filter by token |
| `--type` | No | all | `send`, `receive`, `swap`, `approve`, `bridge`, `internal` |
| `--walletId` | No | main | Filter by wallet (main or sub-wallet ID) |
| `--limit` | No | `50` | Max results |

#### Response Fields (array)

| Field | Type | Description |
|---|---|---|
| `txHash` | String | Transaction hash |
| `type` | String | Transaction type |
| `from` | String | From address |
| `to` | String | To address |
| `token` | String | Token symbol |
| `amount` | String | Amount |
| `valueUsd` | String | USD value at time of transaction |
| `gasFee` | String | Gas fee |
| `chain` | String | Chain name |
| `status` | String | `confirmed`, `pending`, `failed` |
| `timestamp` | String | ISO 8601 timestamp |
| `explorerUrl` | String | Block explorer link |

---

## Quickstart

```bash
# Check wallet status
h-wallet wallet status

# Create a new wallet
h-wallet wallet create --name "H Main" --backup

# View all balances across chains
h-wallet wallet balance

# View X Layer balance detail
h-wallet wallet balance-detail --chain 196

# View USDT balance on all chains
h-wallet wallet balance --token USDT

# Send 100 USDT on X Layer
h-wallet wallet send --to 0x1234...abcd --token USDT --amount 100 --chain 196

# Cross-chain: move 500 USDT from Ethereum to X Layer
h-wallet wallet send-cross --to 0xMyAddress --token USDT --amount 500 --fromChain 1 --toChain 196

# Create a sub-wallet for sniping
h-wallet wallet sub-create --name "Sniper Bot" --purpose sniper

# List sub-wallets
h-wallet wallet sub-list

# Transfer 100 USDT from main to sniper sub-wallet
h-wallet wallet sub-transfer --from main --to <subWalletId> --token USDT --amount 100

# View transaction history
h-wallet wallet history --chain 196 --limit 20
```

## Cross-Skill Workflows

### New User Onboarding (新用户引导)
> User: "我想开始用链上功能"

```
1. h-v2-agentic-wallet  h-wallet wallet status
   → Check if wallet exists

2. (if not_created):
   h-v2-agentic-wallet  h-wallet wallet create --name "H Main" --backup
   → Create wallet, show address

3. [GUIDE]              "钱包创建成功！您的 X Layer 地址是 0x...
                         建议您：
                         1. 从交易所提币少量 USDT 到该地址
                         2. 同时充值少量 OKB 作为 Gas 费（约 0.1 OKB 即可）"

4. (wait for deposit)
   h-v2-agentic-wallet  h-wallet wallet balance --chain 196
   → Confirm balance after user deposits
```

### Prepare for Meme Sniping (准备 Meme 狙击资金)
> User: "我要准备 100U 去打 Meme"

```
1. h-v2-agentic-wallet  h-wallet wallet balance --token USDT
   → Check USDT balance across chains

2. (if insufficient on X Layer but available on other chains):
   h-v2-agentic-wallet  h-wallet wallet send-cross --to <self> --token USDT \
     --amount 100 --fromChain <source> --toChain 196
   → Bridge USDT to X Layer

3. h-v2-agentic-wallet  h-wallet wallet sub-create --name "Meme Sniper" --purpose sniper
   → Create isolated sub-wallet for sniping

4. h-v2-agentic-wallet  h-wallet wallet sub-transfer --from main --to <subId> \
     --token USDT --amount 100 --chain 196
   → Transfer 100 USDT to sniper wallet

5. [REPORT]             "准备完成！Sniper 子钱包已充入 100 USDT，
                         可以开始使用 Meme 狙击功能了。"
   → Hand off to h-v2-meme-sniper
```

### Cross-Chain Asset Consolidation (跨链资产归集)
> User: "把所有链上的 USDT 归集到 X Layer"

```
1. h-v2-agentic-wallet  h-wallet wallet balance --token USDT
   → Get USDT balance per chain

2. [ANALYZE]            Filter chains with USDT > $10 (worth bridging):
   - Ethereum: 200 USDT
   - BSC: 150 USDT
   - Arbitrum: 80 USDT

3. [REPORT]             "归集计划：
   | 来源链    | 金额      | 预计时间 | 桥接费  |
   |----------|----------|---------|--------|
   | Ethereum | 200 USDT | ~5 min  | ~$2.50 |
   | BSC      | 150 USDT | ~2 min  | ~$0.30 |
   | Arbitrum | 80 USDT  | ~1 min  | ~$0.20 |
   | **合计**  | **430 USDT** | | **~$3.00** |
   
   归集后 X Layer 余额: ~427 USDT
   确认执行？"

4. (user confirms)
   h-v2-agentic-wallet  h-wallet wallet send-cross ... (for each chain, sequentially)

5. h-v2-agentic-wallet  h-wallet wallet balance --chain 196
   → Confirm final balance
```

### Risk Isolation Setup (风险隔离设置)
> User: "帮我设置好钱包，分开管理不同策略的钱"

```
1. h-v2-agentic-wallet  h-wallet wallet status → confirm main wallet exists

2. h-v2-agentic-wallet  h-wallet wallet sub-create --name "Meme 狙击" --purpose sniper
3. h-v2-agentic-wallet  h-wallet wallet sub-create --name "DeFi 理财" --purpose defi
4. h-v2-agentic-wallet  h-wallet wallet sub-create --name "测试" --purpose test

5. h-v2-agentic-wallet  h-wallet wallet sub-list
   → Show all wallets with addresses

6. [REPORT]             "钱包架构已设置完成：
   - 主钱包: 存放大额资金（安全）
   - Meme 狙击: 隔离 100U 用于高风险操作
   - DeFi 理财: 用于稳定收益
   - 测试: 用于新功能测试
   
   每个子钱包独立地址，互不影响。"
```

## Edge Cases

### Transfer Failures

| Error | Cause | Resolution |
|---|---|---|
| "insufficient balance" | Token balance < amount | Show current balance, suggest reducing amount |
| "insufficient gas" | Native token < gas estimate | Suggest depositing native token first |
| "invalid address" | Wrong format for chain | Show correct format example |
| "daily limit exceeded" | Transfer > daily limit | Show remaining limit, suggest splitting |
| "nonce too low" | Pending tx conflict | Wait for pending tx to confirm, then retry |
| "tx reverted" | Contract execution failed | Show revert reason, suggest checking token/contract |

### Cross-Chain Issues

| Issue | Resolution |
|---|---|
| Bridge timeout (> 30 min) | Provide bridge order ID, suggest checking bridge explorer |
| Partial fill | Show amount received vs expected, suggest contacting support |
| Route unavailable | Suggest alternative route or waiting |
| High slippage | Warn user, suggest smaller amount or different time |

### Security Concerns

| Scenario | Action |
|---|---|
| User pastes mnemonic in chat | Immediately warn: "请不要在聊天中分享助记词！请使用 CLI 交互模式" |
| Transfer to known scam address | Block and warn |
| Approve unlimited allowance | Warn about risks, suggest limited approval |
| Large transfer to new address | Double confirmation required |

## Key Rules

1. **Never display or request mnemonic/private keys in chat** — always use interactive CLI
2. **Always confirm before any send/transfer operation** — show full summary first
3. **Large transfers (> daily limit) require double confirmation**
4. **Default to X Layer** for lowest fees
5. **Sub-wallets for risk isolation** — sniper funds MUST be in sub-wallets
6. **Cross-chain operations must show fee + time estimate** before execution
7. **Never auto-approve token allowances** — always explain and confirm
8. **Internal sub-wallet transfers are gas-free** — prefer this over external transfers

## Display Rules

1. **USDT 优先**：余额展示中 USDT 永远排第一
2. **地址缩写**：显示为 `0x1234...abcd` 格式
3. **小额隐藏**：默认隐藏 < $1 的代币
4. **Gas 费双显**：同时显示原生代币和 USD 等价
5. **跨链状态**：跨链转账显示实时进度条

### Parameter Display Names

| API Field | EN | ZH |
|---|---|---|
| `address` | Address | 地址 |
| `totalValueUsd` | Total Value | 总资产价值 |
| `nativeBalance` | Native Balance | 原生代币余额 |
| `balance` | Balance | 余额 |
| `gasFee` | Gas Fee | Gas 费 |
| `txHash` | Transaction Hash | 交易哈希 |
| `chainName` | Chain | 链 |
| `subWalletId` | Sub-Wallet ID | 子钱包 ID |
| `bridgeFee` | Bridge Fee | 桥接费 |
| `estimatedTime` | Est. Time | 预计时间 |
| `dailyLimit` | Daily Limit | 每日限额 |
| `explorerUrl` | Explorer Link | 浏览器链接 |

## Communication Guidelines

- Use "链上钱包" not "去中心化钱包" for simplicity
- Always show address in shortened format: `0x1234...abcd`
- For new users, explain concepts simply:
  - "子钱包就像一个独立的小金库，万一出问题不会影响主钱包"
  - "Gas 费就像快递费，是支付给网络的手续费"
  - "跨链就像从一个银行转账到另一个银行，需要一点时间和手续费"
- When showing balances, always include USD equivalent

## MCP Tool Reference

| CLI Command | MCP Tool | Onchain OS API |
|---|---|---|
| `wallet create` | `wallet_create` | `POST /api/v5/waas/wallet/create` |
| `wallet recover` | `wallet_recover` | `POST /api/v5/waas/wallet/recover` |
| `wallet status` | `wallet_status` | `GET /api/v5/waas/wallet/info` |
| `wallet balance` | `wallet_get_balance` | `GET /api/v5/waas/portfolio/total-value` |
| `wallet balance-detail` | `wallet_get_balance_detail` | `GET /api/v5/waas/portfolio/token-balances` |
| `wallet nfts` | `wallet_get_nfts` | `GET /api/v5/waas/portfolio/nft-balances` |
| `wallet send` | `wallet_send` | `POST /api/v5/waas/transaction/send` |
| `wallet send-cross` | `wallet_send_cross` | `POST /api/v5/waas/bridge/transfer` |
| `wallet sub-create` | `wallet_sub_create` | `POST /api/v5/waas/wallet/create-sub` |
| `wallet sub-list` | `wallet_sub_list` | `GET /api/v5/waas/wallet/sub-list` |
| `wallet sub-transfer` | `wallet_sub_transfer` | `POST /api/v5/waas/transaction/internal-transfer` |
| `wallet history` | `wallet_get_history` | `GET /api/v5/waas/transaction/history` |
