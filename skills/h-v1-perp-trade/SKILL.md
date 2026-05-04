---
name: h-v1-perp-trade
description: "Use this skill when the user asks to 'open long', 'open short', 'close position', 'place order', 'limit order', 'market order', 'cancel order', 'set TP/SL', 'take profit', 'stop loss', 'trailing stop', 'set leverage', 'amend order', 'check orders', 'fill history', 'get leverage', 'positions', '开多', '开空', '平仓', '下单', '限价单', '市价单', '撤单', '止盈', '止损', '追踪止损', '设置杠杆', '查看杠杆', '修改订单', '查看订单', '成交记录', '一键平仓', '持仓', or any request to place, cancel, amend perpetual swap orders, set TP/SL, adjust leverage, or manage positions on H Wallet. Covers perpetual swap (USDT-M and coin-M) order management, algo orders (TP/SL/trailing), leverage, and position operations. Requires API credentials. Do NOT use for market data (h-v1-perp-market), smart money signals (h-v1-perp-signal), account balance (h-v1-wallet-auth), or bots (h-v1-perp-grid / h-v1-perp-dca)."
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

# H Wallet 永续合约交易执行

Perpetual swap (USDT-margined and coin-margined) order management on H Wallet. Place, cancel, amend, and monitor orders; set take-profit/stop-loss and trailing stops; manage leverage and positions. **Requires API credentials.**

> **CLI vs MCP tool names** — Subcommands use spaces (`h-wallet swap algo place`, `h-wallet swap close`), not hyphens. Do NOT convert an MCP tool identifier (`swap_place_algo_order`) into a hyphen-joined CLI command — that will be rejected with "Unknown command". Per-command mapping tables live in `references/swap-commands.md`.

## Preflight

Before running any command, follow [`../_shared/preflight.md`](../_shared/preflight.md).
Use `metadata.version` from this file's frontmatter as the reference for Step 2.

## Prerequisites

1. Install `h-wallet` CLI:
   ```bash
   npm install -g @h-wallet/trade-cli
   ```
2. Configure credentials:
   ```bash
   h-wallet config init   # follow interactive setup
   ```
3. Test with demo mode (simulated trading, no real funds):
   ```bash
   h-wallet --demo swap orders
   ```

> **Security**: NEVER accept credentials in chat. Guide users to `h-wallet config init` for setup.

## Credential & Profile Check

**Run this check before any authenticated command.** The auth method is detected during [preflight](../_shared/preflight.md) Step 2 and remembered for the session.

### Step A — Verify credentials

Run **both** commands:

```bash
h-wallet config show --json      # reveals API-key profiles (TOML config)
h-wallet auth status --json      # reveals OAuth session state
```

Apply **in this order** — first match wins:

- `config show --json` has any profile with a non-empty `api_key` field → **API Key mode**. Proceed to Step B.
- No API-key profile **AND** `auth status --json` returns `"status":"logged_in"` → **OAuth mode**. Proceed to Step B.
- No API-key profile **AND** `"status":"pending"` — login is in progress, wait for it to complete.
- No API-key profile **AND** `"status":"not_logged_in"` — **stop all operations**, load `h-v1-wallet-auth` skill and follow login steps, wait for completion.

### Step B — Confirm trading mode

**Resolution rules:**
1. Current message intent is clear (e.g. "real" / "实盘" / "live" → live; "test" / "模拟" / "demo" → demo) → use it and inform the user
2. Current message has no explicit declaration → check conversation context for a previous choice:
   - Found → reuse it, inform user
   - Not found → ask: `"Live (实盘) or Demo (模拟盘)?"` — wait for answer before proceeding

**How to apply the mode depends on auth method (detected in Step A):**

| Auth method | Live (实盘) | Demo (模拟盘) |
|---|---|---|
| **API Key** | `--profile <live-profile>` | `--profile <demo-profile>` |
| **OAuth** | *(no flag needed, live is default)* | `--demo` |

- **API Key users**: run `h-wallet config show --json` to discover available profile names and their `demo` settings. Use `--profile <name>` to select the correct one.
- **OAuth users**: omit flags for live trading; add `--demo` for simulated trading. Do **not** use `--profile` to switch modes.

### Handling Authentication Errors

**Authentication error** (error contains "401", "Session expired", or "Run `h-wallet auth login` first"):
1. **Stop immediately** — do not retry the same command
2. Inform the user: "Authentication failed. Your session may have expired."
3. Load `h-v1-wallet-auth` skill and follow the re-authentication steps
4. After successful re-authentication, retry the original command

## Demo vs Live Mode

| Mode | Funds | API Key param | OAuth param |
|---|---|---|---|
| 实盘 (live) | Real money — irreversible | `--profile <live-profile>` | *(default, no flag)* |
| 模拟盘 (demo) | Simulated — no real funds | `--profile <demo-profile>` | `--demo` |

**Rules:**
1. Trading mode is **required** on every authenticated command — determined in "Credential & Profile Check" Step B
2. Every response after a command must append: `[mode: live]` or `[mode: demo]`

## Skill Routing

| User intent | Route to skill |
|---|---|
| Market data, prices, candles, funding rate, OI | `h-v1-perp-market` |
| Account balance, margin, transfers, position mode | `h-v1-wallet-auth` |
| Smart money, trader signals, consensus | `h-v1-perp-signal` |
| Grid bot strategy | `h-v1-perp-grid` |
| DCA / Martingale strategy | `h-v1-perp-dca` |
| Place / cancel / amend orders, TP/SL, leverage, positions | **This skill** |

## Sz Handling for Perpetual Swaps

### CRITICAL: Always verify contract face value before placing orders

Before placing any SWAP order, call `h-v1-perp-market` → `market instruments --instType SWAP --instId <id>` to get `ctVal` (contract face value). **Do NOT assume contract sizes** — they vary by instrument (e.g. ETH-USDT-SWAP = 0.1 ETH/contract, BTC-USDT-SWAP = 0.01 BTC/contract).

Use `ctVal` to:
- Calculate the correct number of contracts from user's intended position size
- Verify margin requirements before submitting the order
- Show the user the actual position value: `sz × ctVal × price`

### Three tgtCcy modes for USDT-denominated sizing

| `--tgtCcy` | sz meaning | Conversion formula | Example: "500U" at 10x lever |
|---|---|---|---|
| `base_ccy` (default) | contract count | no conversion | 500 contracts |
| `quote_ccy` | USDT notional value | `floor(sz / (ctVal * lastPx))` | 500 USDT notional |
| `margin` | USDT margin cost | `floor(sz * lever / (ctVal * lastPx))` | 500 USDT margin = 5000 USDT notional |

### Ambiguity Resolution

**When user specifies a USDT amount** (e.g. "200U", "500 USDT", "$1000"):
→ **AMBIGUOUS** — this could mean notional value OR margin cost.
  You MUST ask the user to clarify before proceeding:
  - **notional value (名义价值)**: sz = position value in USDT (e.g. 500 USDT buys 500 USDT worth of contracts directly)
  - **margin cost (保证金)**: actual position = sz × leverage (e.g. 500 USDT margin at 10× = 5000 USDT notional position)
  Wait for the user's answer before continuing.
- If notional value → use `--tgtCcy quote_ccy`
- If margin cost → use `--tgtCcy margin`

**When user specifies contracts** (e.g. "2 张", "5 contracts"):
→ First verify `ctVal` via `market instruments`, then use `--sz` with the contract count. Confirm with user: "X contracts = X × ctVal underlying, total value ≈ $Y".

**When user gives a plain number with no unit** (for swap):
→ **AMBIGUOUS** — You MUST ask the user to clarify before proceeding:
  - **contract count (张数)**: X contracts (each worth ctVal of underlying)
  - **USDT notional value (名义价值)**: position value in USDT
  - **USDT margin cost (保证金)**: margin amount (actual position = X × leverage)
  Wait for the user's answer before continuing.

⚠ **Inverse contracts** (`*-USD-SWAP`): `tgtCcy=quote_ccy` and `tgtCcy=margin` also work (note: `quote_ccy` = USD, not USDT, for inverse instruments). Always warn: "This is an inverse contract (币本位). Margin and P&L are settled in BTC/ETH, not USDT."

## Quickstart

```bash
# Long 1 contract BTC perp (cross margin)
h-wallet swap place --instId BTC-USDT-SWAP --side buy --ordType market --sz 1 \
  --tdMode cross --posSide long

# Long 1000 USDT notional value of BTC perp (auto-convert to contracts)
h-wallet swap place --instId BTC-USDT-SWAP --side buy --ordType market --sz 1000 \
  --tgtCcy quote_ccy --tdMode cross --posSide long

# Long with 500 USDT margin at current leverage (e.g. 10x → 5000 USDT notional)
h-wallet swap place --instId BTC-USDT-SWAP --side buy --ordType market --sz 500 \
  --tgtCcy margin --tdMode cross --posSide long

# Long 1 contract with attached TP/SL (one step)
h-wallet swap place --instId BTC-USDT-SWAP --side buy --ordType market --sz 1 \
  --tdMode cross --posSide long \
  --tpTriggerPx 105000 --tpOrdPx=-1 --slTriggerPx 88000 --slOrdPx=-1

# Close BTC perp long position entirely at market
h-wallet swap close --instId BTC-USDT-SWAP --mgnMode cross --posSide long

# Set 10x leverage on BTC perp (cross)
h-wallet swap leverage --instId BTC-USDT-SWAP --lever 10 --mgnMode cross

# Place trailing stop on BTC perp long (callback 2%)
h-wallet swap algo trail --instId BTC-USDT-SWAP --side sell --sz 1 \
  --tdMode cross --posSide long --callbackRatio 0.02

# View open swap positions
h-wallet swap positions

# Cancel a swap order
h-wallet swap cancel --instId BTC-USDT-SWAP --ordId <ordId>

# Emergency close all positions
h-wallet swap close-all
```

## Command Index

### Swap / Perpetual Orders (15 commands)

| # | Command | Type | Description |
|---|---|---|---|
| 1 | `h-wallet swap place` | WRITE | Place perpetual swap order |
| 2 | `h-wallet swap cancel` | WRITE | Cancel swap order |
| 3 | `h-wallet swap amend` | WRITE | Amend swap order price or size |
| 4 | `h-wallet swap close` | WRITE | Close entire position at market |
| 5 | `h-wallet swap close-all` | WRITE | Emergency close ALL positions |
| 6 | `h-wallet swap leverage` | WRITE | Set leverage for an instrument |
| 7 | `h-wallet swap algo place` | WRITE | Place swap TP/SL algo order |
| 8 | `h-wallet swap algo trail` | WRITE | Place swap trailing stop order |
| 9 | `h-wallet swap algo amend` | WRITE | Amend swap algo order |
| 10 | `h-wallet swap algo cancel` | WRITE | Cancel swap algo order |
| 11 | `h-wallet swap positions` | READ | Open perpetual swap positions |
| 12 | `h-wallet swap orders` | READ | List open or historical swap orders |
| 13 | `h-wallet swap get` | READ | Single swap order details |
| 14 | `h-wallet swap fills` | READ | Swap trade fill history |
| 15 | `h-wallet swap get-leverage` | READ | Current leverage settings |
| 16 | `h-wallet swap algo orders` | READ | List swap algo orders |

For full command syntax, parameter tables, and edge cases, read `{baseDir}/references/swap-commands.md`.

## Operation Flow

### Step 0 — Credential & Profile Check

Before any authenticated command: see [Credential & Profile Check](#credential--profile-check). Determine auth method and trading mode before executing.

After every command result: append `[mode: live]` or `[mode: demo]`.

### Step 1 — Identify instrument type and action

**Swap/Perpetual** (instId format: `BTC-USDT-SWAP`, `ETH-USD-SWAP`):
- Place/cancel/amend order → `h-wallet swap place/cancel/amend`
- Close position → `h-wallet swap close`
- Close all positions → `h-wallet swap close-all`
- Leverage → `h-wallet swap leverage` / `h-wallet swap get-leverage`
- TP/SL conditional → `h-wallet swap algo place/amend/cancel`
- Trailing stop → `h-wallet swap algo trail`
- Query → `h-wallet swap positions/orders/get/fills/get-leverage/algo orders`

### Step 2 — Confirm profile, then confirm write parameters

**Read commands** (orders, positions, fills, get, get-leverage, algo orders): run immediately.

- `--history` flag: defaults to active/open; use `--history` only if user explicitly asks for history
- `--ordType` for algo: `conditional` = single TP or SL; `oco` = both TP and SL together
- `--tdMode` for swap: `cross` or `isolated`
- `--posSide` for hedge mode: `long` or `short`; omit in net mode

**Write commands** (place, cancel, amend, close, close-all, leverage, algo): confirm the key order details once before executing:
- Swap place: confirm `--instId`, `--side`, `--sz`, `--tdMode`, and **explicitly confirm order mode** when user specifies a USDT amount: `--tgtCcy quote_ccy` (notional value, sz = position value) or `--tgtCcy margin` (margin cost, actual position = sz * leverage). Always state which mode is being used.
- Swap close: confirm `--instId`, `--mgnMode`, `--posSide`
- Swap close-all: **MUST** display explicit warning that ALL positions will be closed. Require double confirmation.
- Leverage: confirm new leverage and impact on existing positions. **Pre-checks to avoid common 400s**: (a) `--lever` must be a positive number within the instrument's max (see `h-v1-perp-market` → `market instruments` → `lever`); (b) for `--mgnMode isolated` in hedge pos mode, `--posSide` is required — each side (`long`, `short`) must be set **separately**, setting one does NOT auto-apply to the other; (c) **portfolio-margin accounts cannot adjust `cross` leverage for SWAP** — exchange will reject; if unsure, run `h-wallet account config` and check `acctLv` first.
- Algo place: confirm `--instId`, `--side`, `--posSide`, `--sz`, `--ordType`, and TP/SL prices or callback ratio
- Algo trail: confirm `--callbackRatio` (e.g., `0.02` = 2%) or `--callbackSpread`

For full parameter details per command, read the relevant reference file.

### Error-suggested remediation safeguard

When an API error message suggests a fix that involves **write operations** (cancel orders, close positions, stop bots/strategies, transfer funds, etc.), you **MUST NOT** automatically execute those actions. Instead:

1. **Report** the error and its suggestion to the user verbatim
2. **Diagnose** — run read-only queries to identify what is blocking (e.g., `algo orders --status pending`, `positions`, `h-v1-perp-grid` → `grid list --status active`)
3. **Present findings** — show the user what was found and which specific items would need to be cancelled/closed/stopped
4. **Wait for explicit confirmation** before executing any remediation

This applies to all error codes whose messages suggest destructive actions, including but not limited to:
- Set-leverage blocked by pending algo orders or active bots
- Account setting changes requiring order/position/strategy cleanup
- Margin mode switches requiring position closure
- Any error containing phrases like "cancel", "close", "stop", "transfer … before"

**Rationale:** Error messages list _all possible_ blockers generically — the actual blocker is often just one item (e.g., a single TP/SL order). Blindly following the error text can cause unnecessary position closures or bot shutdowns that the user did not intend.

### Step 3 — Verify after writes

- After `swap place`: run `h-wallet swap orders` to confirm order is live or `h-wallet swap fills` if market order
- After `swap close`: run `h-wallet swap positions` to confirm position size is 0
- After `swap close-all`: run `h-wallet swap positions` to confirm all positions are 0
- After swap algo place/trail: run `h-wallet swap algo orders` to confirm algo is active
- After cancel: run `h-wallet swap orders` to confirm order is gone
- After leverage change: run `h-wallet swap get-leverage` to confirm new setting

## Cross-Skill Workflows

### Open Long with TP/SL
> User: "开多 BTC 500U 保证金，10倍杠杆，止盈 105000，止损 88000"

```
1. h-v1-perp-market    h-wallet market ticker BTC-USDT-SWAP          → confirm current price
2. h-v1-perp-market    h-wallet market instruments --instId BTC-USDT-SWAP → get ctVal
3. h-v1-wallet-auth    h-wallet account balance USDT                  → confirm available margin ≥ 500
4. h-v1-perp-trade     h-wallet swap get-leverage --instId BTC-USDT-SWAP --mgnMode cross → confirm lever = 10
        ↓ user confirms parameters
5. h-v1-perp-trade     h-wallet swap place --instId BTC-USDT-SWAP --side buy --ordType market \
                         --sz 500 --tgtCcy margin --tdMode cross --posSide long \
                         --tpTriggerPx 105000 --tpOrdPx=-1 --slTriggerPx 88000 --slOrdPx=-1
6. h-v1-perp-trade     h-wallet swap positions BTC-USDT-SWAP          → verify position opened
7. h-v1-perp-trade     h-wallet swap algo orders --instId BTC-USDT-SWAP → verify TP/SL active
```

### Adjust Leverage with Error Handling
> User: "把 ETH 合约杠杆调到 20 倍"

```
1. h-v1-perp-trade     h-wallet swap get-leverage --instId ETH-USDT-SWAP --mgnMode cross → current lever
2. h-v1-perp-trade     h-wallet swap leverage --instId ETH-USDT-SWAP --lever 20 --mgnMode cross
        ↓ if error "cancel pending algo orders or stop bots":
3. h-v1-perp-trade     h-wallet swap algo orders --instId ETH-USDT-SWAP → find blockers
4. h-v1-perp-grid      h-wallet grid list --instId ETH-USDT-SWAP       → check active bots
        ↓ report findings to user, wait for confirmation
5. h-v1-perp-trade     h-wallet swap algo cancel --instId ETH-USDT-SWAP --algoId <id> → cancel if approved
6. h-v1-perp-trade     h-wallet swap leverage --instId ETH-USDT-SWAP --lever 20 --mgnMode cross → retry
7. h-v1-perp-trade     h-wallet swap get-leverage --instId ETH-USDT-SWAP --mgnMode cross → verify
```

### Trailing Stop on Existing Position
> User: "给我的 BTC 多仓加个 2% 追踪止损"

```
1. h-v1-perp-trade     h-wallet swap positions BTC-USDT-SWAP           → get position size
2. h-v1-perp-trade     h-wallet swap algo trail --instId BTC-USDT-SWAP --side sell --sz <position_sz> \
                         --tdMode cross --posSide long --callbackRatio 0.02
3. h-v1-perp-trade     h-wallet swap algo orders --instId BTC-USDT-SWAP → verify trailing stop active
```

## Safety Rules

1. **杠杆警告**：杠杆 > 20x 时，必须显示高风险警告并要求确认。
2. **大额订单确认**：订单名义价值 > 5000 USDT 时，要求二次确认。
3. **一键平仓保护**：`swap close-all` 命令必须明确告知用户将平掉所有仓位，要求双重确认。
4. **止盈默认建议**：建议用户在开仓时同时设置 30% 止盈。
5. **逆向合约警告**：使用 `*-USD-SWAP` 时，必须提醒用户保证金和盈亏以币结算。
6. **错误不自动修复**：API 错误建议的修复操作（撤单、平仓、停止策略）不得自动执行。

## Edge Cases — Swap / Perpetual

- **sz unit**: number of contracts (default), USDT notional value (`--tgtCcy quote_ccy`), or USDT margin cost (`--tgtCcy margin`). If the user specifies a USDT amount, clarify whether it is notional value or margin cost, then pass directly as `--sz` with the appropriate `--tgtCcy` — do NOT manually convert to contracts. With `margin` mode, the system queries current leverage and calculates: `contracts = floor(margin * lever / (ctVal * lastPx))`
- **Linear vs inverse**: `BTC-USDT-SWAP` is linear (USDT-margined); `BTC-USD-SWAP` is inverse (BTC-margined). For inverse, warn the user that margin and P&L are settled in BTC
- **posSide**: required in hedge mode (`long_short_mode`); omit in net mode. Check `h-wallet account config` for `posMode`
- **tdMode**: use `cross` for cross-margin, `isolated` for isolated margin
- **Close position**: `swap close` closes the **entire** position; to partial close, use `swap place` with `--reduceOnly`
- **Close-all**: closes ALL positions across ALL instruments at market — use with extreme caution
- **Leverage**: max leverage varies by instrument and account level; exchange rejects if exceeded. **If set-leverage fails with "Cancel cross-margin TP/SL … or stop bots"**: troubleshoot in order: (1) `h-wallet swap algo orders --instId <id>` — check for TP/SL, trailing, trigger orders (most common cause); (2) only if no algo orders found, check bots: `h-wallet grid list --instId <id>`. **Never automatically cancel algo orders or stop bots** — show findings to the user and let them decide
- **Trailing stop**: use either `--callbackRatio` (relative, e.g., `0.02`) or `--callbackSpread` (absolute price), not both
- **Algo on close side**: always set `--side` opposite to position (e.g., long position → sell algo)
- **Position mode detection**: run `h-wallet account config` to check `posMode` — `long_short_mode` requires `--posSide`; `net_mode` does not
- **Rate limit**: 60 order operations per 2 seconds per UID
- **Network errors**: If commands fail with a connection error, prompt user to check network: `curl -I https://www.okx.com`

## Global Notes

- All write commands require valid credentials (OAuth session or API key in `~/.h-wallet/config.toml`)
- Auth method and trading mode are determined in "Credential & Profile Check"; see that section for parameter rules
- `--json` returns the raw OKX API v5 response by default. Add `--env` to wrap the output as `{"env": "<live|demo>", "profile": "<name>", "data": <response>}` — useful when you need to know the active environment and credential profile
- Batch operations (batch cancel, batch amend) are available via MCP tools directly if needed
- Position mode (`net` vs `long_short_mode`) affects whether `--posSide` is required
- **Capability discovery**: Run `h-wallet list-tools --json` to get a machine-readable JSON listing of all CLI commands, tool names, and parameters

For MCP tool reference, output conventions, and order amount safety rules, read `{baseDir}/references/templates.md`.
