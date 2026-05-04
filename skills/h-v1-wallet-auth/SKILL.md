---
name: h-v1-wallet-auth
description: "Use this skill when the user asks about 'account balance', 'margin', 'available balance', 'create wallet', 'bind wallet', 'login', 'authenticate', 'my assets', 'USDT balance', 'leverage usage', 'margin ratio', 'account config', 'switch mode', 'set position mode', 'transfer funds', 'fee rate', 'positions', 'risk', 'maintenance margin', '账户余额', '保证金', '可用余额', '创建钱包', '绑定钱包', '登录', '认证', '我的资产', '杠杆使用率', '保证金率', '账户配置', '切换模式', '划转', '手续费', '持仓', '风险', '维持保证金', or any request to manage account authentication, view balances, check margin status, view positions, check fees, or configure account settings on H Wallet. Requires API credentials. Do NOT use for market data (h-v1-perp-market), trading (h-v1-perp-trade), smart money (h-v1-perp-signal), or bots (h-v1-perp-grid / h-v1-perp-dca)."
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

Account authentication, wallet onboarding, asset overview, position management, and margin configuration on H Wallet. **Requires API credentials for most commands.**

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

## Credential & Profile Check

**Run before every authenticated command.** The auth method is detected during [preflight](../_shared/preflight.md) Step 2 and remembered for the session.

### Step A — Verify credentials

Run **both** commands:

```bash
h-wallet config show --json      # reveals API-key profiles (TOML config)
h-wallet auth status --json      # reveals OAuth session state
```

Apply **in this order** — first match wins:

- `config show --json` has any profile with a non-empty `api_key` field → **API Key mode**
- No API-key profile **AND** `auth status --json` returns `"status":"logged_in"` → **OAuth mode**
- No API-key profile **AND** `"status":"pending"` — wait for login completion
- No API-key profile **AND** `"status":"not_logged_in"` — stop, guide user through setup

### Step B — Confirm trading mode

1. User intent is clear → use it, inform user
2. No explicit declaration → check conversation context → reuse if found
3. Nothing found → ask: "Live (实盘) or Demo (模拟盘)?"

| Auth method | Live | Demo |
|---|---|---|
| **API Key** | `--profile <live-profile>` | `--profile <demo-profile>` |
| **OAuth** | *(default)* | `--demo` |

**After every command**: append `[mode: live]` or `[mode: demo]`

### Step C — New User / Wallet Creation

If user has no credentials configured:

1. Guide through `h-wallet config init` (interactive)
2. Or guide through OAuth: `h-wallet auth login`
3. Provide friendly Chinese prompts:
   - "请输入您的邮箱账号"
   - "请输入收到的验证码"
   - "钱包创建成功！"

## Skill Routing

| Need | Skill |
|---|---|
| Market data, prices, depth, funding rates | `h-v1-perp-market` |
| Smart money, trader signals | `h-v1-perp-signal` |
| Regular swap orders (place/cancel/amend) | `h-v1-perp-trade` |
| Grid bots | `h-v1-perp-grid` |
| DCA / Martingale bots | `h-v1-perp-dca` |
| **Account balance, margin, positions, config** | **This skill** |

## Design Philosophy

> **核心理念**：安全第一，清晰展示资产状况和风险指标。

1. **隐藏 BTC 余额**：默认不展示 BTC 相关资产，突出 USDT 计价。
2. **保证金重点**：优先展示可用保证金、已用保证金、杠杆使用率。
3. **风险提示**：当保证金率低于 50% 时，显示红色警告。
4. **永不自动划转**：余额不足时报告差额，让用户决定。
5. **安全**：永远不要求用户在聊天中粘贴 API Key 或密码。

## Command Index (14 commands)

### Authentication (3 commands, no auth required)

| # | Command | Type | Description |
|---|---|---|---|
| 1 | `h-wallet auth login` | WRITE | Start OAuth login flow (interactive) |
| 2 | `h-wallet auth status` | READ | Check current authentication status |
| 3 | `h-wallet config init` | WRITE | Initialize API Key configuration (interactive) |

### Account Data (6 commands, auth required)

| # | Command | Type | Description |
|---|---|---|---|
| 4 | `h-wallet account balance` | READ | Get account balance (all currencies) |
| 5 | `h-wallet account positions` | READ | Get current open positions with margin info |
| 6 | `h-wallet account position-risk` | READ | Get position risk assessment |
| 7 | `h-wallet account config` | READ | Get account configuration |
| 8 | `h-wallet account fee-rate` | READ | Get trading fee rate |
| 9 | `h-wallet account max-size` | READ | Get max available position size |

### Account Configuration (3 commands, auth required)

| # | Command | Type | Description |
|---|---|---|---|
| 10 | `h-wallet account set-position-mode` | WRITE | Switch position mode (long/short or net) |
| 11 | `h-wallet account set-leverage` | WRITE | Set leverage for instrument |
| 12 | `h-wallet account set-margin-mode` | WRITE | Switch margin mode (isolated/cross) |

### Fund Management (2 commands, auth required)

| # | Command | Type | Description |
|---|---|---|---|
| 13 | `h-wallet account transfer` | WRITE | Transfer between accounts (funding ↔ trading) |
| 14 | `h-wallet account bills` | READ | Account bills / transaction history |

## CLI Command Reference

### auth login — OAuth 登录

```bash
h-wallet auth login [--json]
```

Starts interactive OAuth flow. Returns a URL for browser-based login.

---

### auth status — 认证状态

```bash
h-wallet auth status [--json]
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `status` | String | `logged_in`, `pending`, `not_logged_in` |
| `method` | String | `api_key` or `oauth` |
| `profile` | String | Active profile name |
| `site` | String | `live` or `demo` |
| `uid` | String | User ID (if logged in) |

---

### config init — 配置初始化

```bash
h-wallet config init [--json]
```

Interactive setup: prompts for API Key, Secret Key, Passphrase, and site (live/demo).

---

### account balance — 账户余额

```bash
h-wallet account balance [--ccy <currency>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--ccy` | No | all | Filter by currency (e.g. `USDT`, `ETH`) |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `totalEq` | String | Total equity (USDT equivalent) |
| `isoEq` | String | Isolated margin equity |
| `adjEq` | String | Adjusted equity |
| `ordFroz` | String | Frozen for orders |
| `imr` | String | Initial margin requirement |
| `mmr` | String | Maintenance margin requirement |
| `mgnRatio` | String | Margin ratio (> 100% = safe) |
| `notionalUsd` | String | Total notional value of positions |
| `details` | Array | Per-currency breakdown |

#### Per-Currency Detail Fields

| Field | Type | Description |
|---|---|---|
| `ccy` | String | Currency |
| `eq` | String | Equity |
| `cashBal` | String | Cash balance |
| `availBal` | String | Available balance |
| `frozenBal` | String | Frozen balance |
| `ordFrozen` | String | Order frozen |
| `upl` | String | Unrealized PnL |
| `isoUpl` | String | Isolated unrealized PnL |
| `mgnRatio` | String | Margin ratio |
| `interest` | String | Interest (if any) |

---

### account positions — 当前持仓

```bash
h-wallet account positions [--instType SWAP] [--instId <id>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instType` | No | all | Filter: `SWAP`, `FUTURES`, `MARGIN` |
| `--instId` | No | all | Filter by specific instrument |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument |
| `posSide` | String | `long`, `short`, `net` |
| `pos` | String | Position quantity (contracts) |
| `avgPx` | String | Average entry price |
| `upl` | String | Unrealized PnL |
| `uplRatio` | String | UPL ratio |
| `lever` | String | Leverage |
| `liqPx` | String | Estimated liquidation price |
| `mgnMode` | String | `cross` or `isolated` |
| `margin` | String | Margin used |
| `mgnRatio` | String | Margin ratio |
| `mmr` | String | Maintenance margin requirement |
| `imr` | String | Initial margin requirement |
| `notionalUsd` | String | Position notional value (USD) |
| `adl` | String | ADL indicator (1-5, higher = more risk) |
| `cTime` | String | Position creation time |
| `uTime` | String | Last update time |

---

### account position-risk — 持仓风险评估

```bash
h-wallet account position-risk [--instType SWAP] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instType` | No | all | Filter: `SWAP`, `FUTURES`, `MARGIN` |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `adjEq` | String | Adjusted equity |
| `balData` | Array | Balance data per currency |
| `posData` | Array | Position data with risk metrics |

---

### account config — 账户配置

```bash
h-wallet account config [--json]
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `acctLv` | String | Account level: `1` (simple), `2` (single-ccy margin), `3` (multi-ccy margin), `4` (portfolio margin) |
| `posMode` | String | `long_short_mode` or `net_mode` |
| `autoLoan` | String | Auto-loan enabled |
| `greeksType` | String | Greeks display type |
| `level` | String | Account level name |
| `levelTmp` | String | Temporary level (if any) |
| `uid` | String | User ID |
| `mainUid` | String | Main account UID |
| `label` | String | Account label |
| `ip` | String | Bound IP |

---

### account fee-rate — 手续费率

```bash
h-wallet account fee-rate --instType SWAP [--instId <id>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instType` | Yes | - | `SWAP`, `SPOT`, `FUTURES` |
| `--instId` | No | - | Specific instrument |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `level` | String | Fee tier level |
| `taker` | String | Taker fee rate (negative = rebate) |
| `maker` | String | Maker fee rate (negative = rebate) |
| `takerU` | String | USDT-M taker fee |
| `makerU` | String | USDT-M maker fee |
| `takerUSDC` | String | USDC-M taker fee |
| `makerUSDC` | String | USDC-M maker fee |

---

### account max-size — 最大可开仓位

```bash
h-wallet account max-size --instId <id> --tdMode <mode> [--lever <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument ID |
| `--tdMode` | Yes | - | `cross` or `isolated` |
| `--lever` | No | current | Leverage |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument |
| `ccy` | String | Currency |
| `maxBuy` | String | Max buy size (contracts) |
| `maxSell` | String | Max sell size (contracts) |

---

### account set-position-mode — 设置持仓模式

```bash
h-wallet account set-position-mode --posMode <mode> [--json]
```

| Param | Required | Description |
|---|---|---|
| `--posMode` | Yes | `long_short_mode` (双向持仓) or `net_mode` (单向持仓) |

> **Warning**: Cannot switch position mode when there are open positions. Close all positions first.

---

### account set-leverage — 设置杠杆

```bash
h-wallet account set-leverage --instId <id> --lever <n> --mgnMode <mode> [--posSide <side>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Instrument ID |
| `--lever` | Yes | - | Leverage (1-125, depends on instrument) |
| `--mgnMode` | Yes | - | `cross` or `isolated` |
| `--posSide` | No | - | Required in long_short_mode: `long` or `short` |

---

### account set-margin-mode — 设置保证金模式

```bash
h-wallet account set-margin-mode --instId <id> --mgnMode <mode> [--json]
```

| Param | Required | Description |
|---|---|---|
| `--instId` | Yes | Instrument ID |
| `--mgnMode` | Yes | `cross` (全仓) or `isolated` (逐仓) |

> **Warning**: Cannot switch margin mode when there are open positions on this instrument.

---

### account transfer — 资金划转

```bash
h-wallet account transfer --ccy <ccy> --amt <amount> --from <acct> --to <acct> [--json]
```

| Param | Required | Description |
|---|---|---|
| `--ccy` | Yes | Currency (e.g. `USDT`) |
| `--amt` | Yes | Amount to transfer |
| `--from` | Yes | Source: `6` (funding) or `18` (trading) |
| `--to` | Yes | Destination: `6` (funding) or `18` (trading) |

> **CRITICAL**: Never auto-transfer. Always show amount and direction, then ask user to confirm.

---

### account bills — 账单流水

```bash
h-wallet account bills [--instType SWAP] [--ccy <ccy>] [--type <type>] [--limit <n>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instType` | No | all | Filter by instrument type |
| `--ccy` | No | all | Filter by currency |
| `--type` | No | all | Bill type: `1` (transfer), `2` (trade), `3` (delivery), `5` (liquidation), `7` (funding fee), `8` (ADL) |
| `--limit` | No | `100` | Max results |

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `billId` | String | Bill ID |
| `instId` | String | Instrument |
| `type` | String | Bill type |
| `sz` | String | Size |
| `pnl` | String | PnL |
| `fee` | String | Fee |
| `bal` | String | Balance after |
| `ts` | String | Timestamp |

---

## Quickstart

```bash
# Check auth status
h-wallet auth status

# View total account balance
h-wallet account balance

# View USDT balance only
h-wallet account balance --ccy USDT

# View all swap positions
h-wallet account positions --instType SWAP

# View position risk
h-wallet account position-risk --instType SWAP

# View account config
h-wallet account config

# View fee rates
h-wallet account fee-rate --instType SWAP

# Check max position size for BTC
h-wallet account max-size --instId BTC-USDT-SWAP --tdMode cross

# Set leverage to 10x for BTC (cross margin)
h-wallet account set-leverage --instId BTC-USDT-SWAP --lever 10 --mgnMode cross

# Switch to long/short position mode
h-wallet account set-position-mode --posMode long_short_mode

# Transfer 1000 USDT from funding to trading
h-wallet account transfer --ccy USDT --amt 1000 --from 6 --to 18

# View recent bills
h-wallet account bills --instType SWAP --limit 20
```

## Cross-Skill Workflows

### Pre-Trade Readiness Check
> User: "我想做多 BTC，先看看账户情况"

```
1. h-v1-wallet-auth    h-wallet account balance --ccy USDT
   → Check available balance

2. h-v1-wallet-auth    h-wallet account positions --instType SWAP
   → Check existing positions

3. h-v1-wallet-auth    h-wallet account config
   → Verify position mode and margin mode

4. h-v1-wallet-auth    h-wallet account max-size --instId BTC-USDT-SWAP --tdMode cross
   → Check max available size

5. [REPORT]            Present account readiness:
   - Available margin: X USDT
   - Existing positions: Y
   - Max BTC size: Z contracts
   - Position mode: long_short_mode
   - Ready to trade? Yes/No
```

### Margin Risk Assessment
> User: "我的持仓风险怎么样？"

```
1. h-v1-wallet-auth    h-wallet account balance
   → Total equity and margin ratio

2. h-v1-wallet-auth    h-wallet account positions --instType SWAP
   → All positions with liqPx and mgnRatio

3. h-v1-wallet-auth    h-wallet account position-risk --instType SWAP
   → Comprehensive risk data

4. [ANALYZE]           Risk assessment:
   - Overall margin ratio (> 300% = safe, 100-300% = caution, < 100% = danger)
   - Per-position: distance to liquidation price
   - ADL indicator levels
   - Largest position risk contribution

5. [REPORT]            Present risk summary with recommendations
```

### Account Setup for New User
> User: "我刚注册，帮我设置好账户"

```
1. h-v1-wallet-auth    h-wallet auth status → check if logged in
2. h-v1-wallet-auth    h-wallet config init → (if needed) guide through setup
3. h-v1-wallet-auth    h-wallet account config → check current config
4. h-v1-wallet-auth    h-wallet account set-position-mode --posMode long_short_mode
   → Set to long/short mode (recommended for beginners)
5. h-v1-wallet-auth    h-wallet account fee-rate --instType SWAP → show fee tier
6. [REPORT]            Account ready! Show config summary
```

## Operation Flow

### Step 0 — Credential & Profile Check

Before any command: verify credentials (Step A) and trading mode (Step B).

### Step 1 — Identify intent

| User says | Command(s) |
|---|---|
| "我的余额" / "balance" | `account balance --ccy USDT` |
| "我的持仓" / "positions" | `account positions --instType SWAP` |
| "保证金率" / "margin ratio" | `account balance` (extract mgnRatio) |
| "风险评估" / "risk" | `account position-risk --instType SWAP` |
| "手续费" / "fee rate" | `account fee-rate --instType SWAP` |
| "最大可开" / "max size" | `account max-size --instId <id> --tdMode cross` |
| "设置杠杆" / "set leverage" | `account set-leverage --instId <id> --lever <n> --mgnMode cross` |
| "切换模式" / "switch mode" | `account set-position-mode --posMode <mode>` |
| "划转" / "transfer" | `account transfer --ccy USDT --amt <n> --from 6 --to 18` |
| "账单" / "bills" | `account bills --instType SWAP` |

### Step 2 — Execute and present

- **READ commands**: no confirmation needed. Render as Markdown tables.
- **WRITE commands**: always confirm with user before execution.

## Edge Cases

- **Position mode switch**: Cannot switch when positions are open. Check `account positions` first and warn user
- **Leverage change**: Cannot change leverage on an instrument with open positions in some modes. Check first
- **Margin mode switch**: Cannot switch with open positions on that instrument
- **Transfer direction**: `6` = funding account, `18` = trading account. Always clarify direction
- **Insufficient balance**: Never auto-transfer. Report shortfall and ask user
- **Demo mode**: All commands work the same in demo mode, just with virtual funds
- **Multi-currency margin**: Account level 3+ supports multi-currency margin. Balance display differs
- **Portfolio margin**: Account level 4. Different risk calculation. Mention if detected
- **Rate limit**: 10 requests per 2 seconds for account endpoints

## Display Rules

1. **隐藏 BTC 余额**：默认不展示 BTC 相关资产，突出 USDT 计价
2. **保证金重点**：优先展示可用保证金、已用保证金、杠杆使用率
3. **风险提示**：
   - 保证金率 > 300%: 安全 (绿色)
   - 保证金率 100-300%: 注意 (黄色)
   - 保证金率 < 100%: 危险 (红色)
4. **持仓展示**：按未实现盈亏排序，亏损在前
5. **永不自动划转**：余额不足时报告差额，让用户决定

### Parameter Display Names

| API Field | EN | ZH |
|---|---|---|
| `totalEq` | Total Equity | 总权益 |
| `availBal` | Available Balance | 可用余额 |
| `frozenBal` | Frozen Balance | 冻结余额 |
| `mgnRatio` | Margin Ratio | 保证金率 |
| `imr` | Initial Margin | 初始保证金 |
| `mmr` | Maintenance Margin | 维持保证金 |
| `upl` | Unrealized PnL | 未实现盈亏 |
| `uplRatio` | UPL Ratio | 盈亏比例 |
| `liqPx` | Liquidation Price | 强平价格 |
| `lever` | Leverage | 杠杆倍数 |
| `adl` | ADL Indicator | 自动减仓指标 |
| `posMode` | Position Mode | 持仓模式 |
| `mgnMode` | Margin Mode | 保证金模式 |

## Key Rules

1. **Never auto-transfer funds** — always ask user for confirmation
2. **Never ask for API keys in chat** — guide to `config init` interactive flow
3. **Always show risk warnings** when margin ratio is concerning
4. **Default to USDT display** — hide BTC unless explicitly asked
5. **WRITE operations require confirmation** — show what will change before executing

## MCP Tool Reference

| CLI Command | MCP Tool | OKX API Endpoint |
|---|---|---|
| `auth login` | `auth_login` | OAuth flow |
| `auth status` | `auth_status` | Local state |
| `config init` | `config_init` | Local config |
| `account balance` | `account_get_balance` | `GET /api/v5/account/balance` |
| `account positions` | `account_get_positions` | `GET /api/v5/account/positions` |
| `account position-risk` | `account_get_position_risk` | `GET /api/v5/account/account-position-risk` |
| `account config` | `account_get_config` | `GET /api/v5/account/config` |
| `account fee-rate` | `account_get_fee_rate` | `GET /api/v5/account/trade-fee` |
| `account max-size` | `account_get_max_size` | `GET /api/v5/account/max-size` |
| `account set-position-mode` | `account_set_position_mode` | `POST /api/v5/account/set-position-mode` |
| `account set-leverage` | `account_set_leverage` | `POST /api/v5/account/set-leverage` |
| `account set-margin-mode` | `account_set_margin_mode` | `POST /api/v5/account/set-isolated-mode` |
| `account transfer` | `account_transfer` | `POST /api/v5/asset/transfer` |
| `account bills` | `account_get_bills` | `GET /api/v5/account/bills` |
