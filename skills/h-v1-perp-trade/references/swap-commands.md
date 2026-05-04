# Swap Commands Reference

> All swap endpoints are under `/api/v5/trade/` and `/api/v5/account/`.

## Naming — CLI vs MCP tool

This CLI uses **space-separated subcommands** (`h-wallet swap algo place`). The MCP tool names surfaced to AI agents use a **single underscored identifier** (`swap_place_algo_order`). They are the same feature on two different surfaces.

| CLI command | MCP tool name |
|---|---|
| `h-wallet swap place` | `swap_place_order` |
| `h-wallet swap algo place` | `swap_place_algo_order` |
| `h-wallet swap algo trail` | `swap_place_trailing_stop` |
| `h-wallet swap cancel` | `swap_cancel_order` |
| `h-wallet swap algo cancel` | `swap_cancel_algo_order` |
| `h-wallet swap amend` | `swap_amend_order` |
| `h-wallet swap algo amend` | `swap_amend_algo_order` |
| `h-wallet swap close` | `swap_close_position` |
| `h-wallet swap close-all` | `swap_close_all_positions` |
| `h-wallet swap leverage` | `swap_set_leverage` |
| `h-wallet swap get-leverage` | `swap_get_leverage` |
| `h-wallet swap positions` | `swap_get_positions` |
| `h-wallet swap orders` | `swap_get_orders` |
| `h-wallet swap get` | `swap_get_order` |
| `h-wallet swap fills` | `swap_get_fills` |
| `h-wallet swap algo orders` | `swap_get_algo_orders` |

**Do NOT convert MCP tool names to hyphen-joined CLI commands.** `h-wallet swap place-algo` is **not** a valid command — the CLI will reject it with "Unknown command". Use `h-wallet swap algo place` instead.

---

## Swap — Place Order

```bash
h-wallet swap place --instId <id> --side <buy|sell> --ordType <type> --sz <n> \
  --tdMode <cross|isolated> \
  [--tgtCcy <base_ccy|quote_ccy|margin>] \
  [--posSide <long|short>] [--px <price>] [--reduceOnly] \
  [--tpTriggerPx <p>] [--tpOrdPx=<p|-1>] \
  [--slTriggerPx <p>] [--slOrdPx=<p|-1>] \
  [--clOrdId <id>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Swap instrument (e.g., `BTC-USDT-SWAP`, `ETH-USD-SWAP`) |
| `--side` | Yes | - | `buy` or `sell` |
| `--ordType` | Yes | - | `market`, `limit`, `post_only`, `fok`, `ioc` |
| `--sz` | Yes | - | Order size — unit depends on `--tgtCcy` |
| `--tdMode` | Yes | - | `cross` or `isolated` |
| `--tgtCcy` | No | base_ccy | `base_ccy`: sz in contracts; `quote_ccy`: sz in USDT notional value; `margin`: sz in USDT margin cost (position = sz * leverage) |
| `--posSide` | Cond. | - | `long` or `short` — required in hedge mode (`long_short_mode`) |
| `--px` | Cond. | - | Price — required for limit/post_only orders |
| `--reduceOnly` | No | false | Close-only; will not open a new position if one doesn't exist |
| `--tpTriggerPx` | No | - | Attached take-profit trigger price |
| `--tpOrdPx` | No | - | TP order price; use `-1` for market execution (must use `=` form: `--tpOrdPx=-1`) |
| `--slTriggerPx` | No | - | Attached stop-loss trigger price |
| `--slOrdPx` | No | - | SL order price; use `-1` for market execution (must use `=` form: `--slOrdPx=-1`) |
| `--clOrdId` | No | - | Client-assigned order ID (max 32 chars alphanumeric + `-` `_`) |

### Order Side Logic (hedge mode / long_short_mode)

| Intent | side | posSide |
|---|---|---|
| Open long (开多) | `buy` | `long` |
| Close long (平多) | `sell` | `long` |
| Open short (开空) | `sell` | `short` |
| Close short (平空) | `buy` | `short` |

### Response Fields

| Field | Type | Description |
|---|---|---|
| `ordId` | String | Exchange-assigned order ID |
| `clOrdId` | String | Client-assigned order ID (if provided) |
| `sCode` | String | Status code (`0` = success) |
| `sMsg` | String | Status message |

---

## Swap — Cancel Order

```bash
h-wallet swap cancel --instId <id> [--ordId <id>] [--clOrdId <id>] [--json]
```

At least one of `--ordId` or `--clOrdId` is required.

---

## Swap — Amend Order

```bash
h-wallet swap amend --instId <id> [--ordId <id>] [--clOrdId <id>] \
  [--newSz <n>] [--newPx <p>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Swap instrument |
| `--ordId` | Cond. | - | Order ID (at least one of ordId/clOrdId required) |
| `--clOrdId` | Cond. | - | Client order ID |
| `--newSz` | No | - | New size |
| `--newPx` | No | - | New price |

At least one of `--newSz` or `--newPx` must be provided.

---

## Swap — Close Position

```bash
h-wallet swap close --instId <id> --mgnMode <cross|isolated> \
  [--posSide <long|short>] [--autoCxl] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Swap instrument |
| `--mgnMode` | Yes | - | `cross` or `isolated` |
| `--posSide` | Cond. | - | `long` or `short` — required in hedge mode |
| `--autoCxl` | No | false | Auto-cancel pending orders before closing |

Closes the **entire** position at market price.

---

## Swap — Close All Positions

```bash
h-wallet swap close-all [--instId <id>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | No | all | Specific instrument (omit = close ALL positions across ALL instruments) |

> **⚠️ DANGER**: This is an emergency command. Closes all positions at market price. Always require **double confirmation** from user.

---

## Swap — Set Leverage

```bash
h-wallet swap leverage --instId <id> --lever <n> --mgnMode <cross|isolated> \
  [--posSide <long|short>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Swap instrument |
| `--lever` | Yes | - | Positive number, e.g., `10`. Max allowed depends on the instrument. |
| `--mgnMode` | Yes | - | `cross` or `isolated` |
| `--posSide` | Cond. | - | `long` or `short` — required for `isolated` in hedge (`long_short_mode`) pos mode. Each side must be set **separately** (setting `long` does NOT auto-apply to `short`). Omit for net mode or for `cross`. |

**Not supported**: Portfolio-margin accounts cannot adjust `cross` leverage for SWAP — exchange always rejects. If unsure of account mode, run `h-wallet account config` first and check `acctLv`.

**If set-leverage fails** (error mentions "cancel orders or stop bots"): troubleshoot in priority order:
1. Query pending algo orders first (`swap algo orders --instId <id>`), as this is the most common blocker
2. Only if no algo orders, check active bots (`grid list --instId <id>`)
3. **Do NOT automatically cancel orders or stop bots** — present findings to user and wait for explicit confirmation

---

## Swap — Get Leverage

```bash
h-wallet swap get-leverage --instId <id> --mgnMode <cross|isolated> [--json]
```

Returns table: `instId`, `mgnMode`, `posSide`, `lever`.

---

## Swap — Place Algo (TP/SL / Trail)

```bash
h-wallet swap algo place --instId <id> --side <buy|sell> \
  --ordType <oco|conditional|move_order_stop> --sz <n> \
  --tdMode <cross|isolated> \
  [--clOrdId <id>] \
  [--tgtCcy <base_ccy|quote_ccy|margin>] \
  [--posSide <long|short>] [--reduceOnly] \
  [--tpTriggerPx <p>] [--tpOrdPx=<p|-1>] \
  [--slTriggerPx <p>] [--slOrdPx=<p|-1>] \
  [--callbackRatio <r>] [--callbackSpread <s>] [--activePx <p>] \
  [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Swap instrument (e.g., `BTC-USDT-SWAP`) |
| `--side` | Yes | - | `buy` or `sell` |
| `--ordType` | Yes | - | `oco`, `conditional`, or `move_order_stop` |
| `--sz` | Yes | - | Number of contracts (or USDT with tgtCcy) |
| `--tdMode` | Yes | - | `cross` or `isolated` |
| `--clOrdId` | No | - | Client-assigned algo order ID (max 32 chars) |
| `--tgtCcy` | No | base_ccy | `base_ccy`: sz in contracts; `quote_ccy`: sz in USDT notional; `margin`: sz in USDT margin cost |
| `--posSide` | Cond. | - | `long` or `short` — required in hedge mode |
| `--reduceOnly` | No | false | Close-only |
| `--tpTriggerPx` | Cond. | - | Take-profit trigger price |
| `--tpOrdPx` | Cond. | - | TP order price; `-1` for market (use `=` form: `--tpOrdPx=-1`) |
| `--slTriggerPx` | Cond. | - | Stop-loss trigger price |
| `--slOrdPx` | Cond. | - | SL order price; `-1` for market (use `=` form: `--slOrdPx=-1`) |
| `--callbackRatio` | Cond. | - | Trailing callback ratio (e.g., `0.02` = 2%); cannot combine with `--callbackSpread` |
| `--callbackSpread` | Cond. | - | Trailing callback fixed price distance; cannot combine with `--callbackRatio` |
| `--activePx` | No | - | Price at which trailing stop becomes active |

### Algo Order Types

| ordType | Description | Required Params |
|---|---|---|
| `conditional` | Single TP or SL | `tpTriggerPx` OR `slTriggerPx` (one side) |
| `oco` | One-cancels-other (TP + SL) | Both `tpTriggerPx` AND `slTriggerPx` |
| `move_order_stop` | Trailing stop | `callbackRatio` OR `callbackSpread` |

For `move_order_stop`: provide `--callbackRatio` or `--callbackSpread` (one required).

**Example — TP/SL worth 500 USDT notional on BTC perp:**
```bash
h-wallet swap algo place --instId BTC-USDT-SWAP --side sell --ordType conditional \
  --sz 500 --tgtCcy quote_ccy --tdMode cross --posSide long \
  --slTriggerPx 60000 --slOrdPx=-1
```

**Example — TP/SL with 500 USDT margin cost (leverage-aware):**
```bash
h-wallet swap algo place --instId BTC-USDT-SWAP --side sell --ordType conditional \
  --sz 500 --tgtCcy margin --tdMode cross --posSide long \
  --slTriggerPx 60000 --slOrdPx=-1
```

---

## Swap — Place Trailing Stop

```bash
h-wallet swap algo trail --instId <id> --side <buy|sell> --sz <n> \
  --tdMode <cross|isolated> \
  [--posSide <long|short>] [--reduceOnly] \
  [--callbackRatio <ratio>] [--callbackSpread <spread>] \
  [--activePx <price>] \
  [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | - | Swap instrument |
| `--side` | Yes | - | `buy` or `sell` (opposite to position direction) |
| `--sz` | Yes | - | Number of contracts |
| `--tdMode` | Yes | - | `cross` or `isolated` |
| `--posSide` | Cond. | - | Required in hedge mode |
| `--callbackRatio` | Cond. | - | Trailing callback ratio (e.g., `0.02` = 2%); cannot combine with `--callbackSpread` |
| `--callbackSpread` | Cond. | - | Trailing callback fixed price distance; cannot combine with `--callbackRatio` |
| `--activePx` | No | - | Price at which trailing stop becomes active |

---

## Swap — Amend Algo

```bash
h-wallet swap algo amend --instId <id> --algoId <id> \
  [--newSz <n>] [--newTpTriggerPx <p>] [--newTpOrdPx <p>] \
  [--newSlTriggerPx <p>] [--newSlOrdPx <p>] [--json]
```

> **Note**: Use this to modify TP/SL orders. Run `h-wallet swap algo orders` first to find the `algoId`.

---

## Swap — Cancel Algo

```bash
h-wallet swap algo cancel --instId <id> --algoId <id> [--json]
```

---

## Swap — List Orders

```bash
h-wallet swap orders [--instId <id>] [--history] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | No | all | Filter by instrument |
| `--history` | No | false | Show historical (filled/cancelled) orders instead of active |

---

## Swap — Get Order

```bash
h-wallet swap get --instId <id> [--ordId <id>] [--clOrdId <id>] [--json]
```

Returns: `ordId`, `instId`, `side`, `posSide`, `ordType`, `px`, `sz`, `fillSz`, `avgPx`, `state`, `lever`, `fee`, `pnl`, `cTime`.

---

## Swap — Positions

```bash
h-wallet swap positions [<instId>] [--json]
```

Returns: `instId`, `posSide`, `pos` (size), `avgPx`, `upl`, `uplRatio`, `lever`, `liqPx`, `mgnRatio`, `margin`. Only non-zero positions.

---

## Swap — Fills

```bash
h-wallet swap fills [--instId <id>] [--ordId <id>] [--archive] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | No | all | Filter by instrument |
| `--ordId` | No | - | Filter by specific order ID |
| `--archive` | No | false | Access older fills beyond the default window |

---

## Swap — Algo Orders

```bash
h-wallet swap algo orders [--instId <id>] [--history] [--ordType <type>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | No | all | Filter by instrument |
| `--history` | No | false | Show triggered/cancelled algo orders |
| `--ordType` | No | all | Filter: `conditional`, `oco`, `move_order_stop` |

---

## Edge Cases — Swap / Perpetual

- **sz unit**: number of contracts (default), USDT notional value (`--tgtCcy quote_ccy`), or USDT margin cost (`--tgtCcy margin`). If the user specifies a USDT amount, clarify whether it is notional value or margin cost, then pass directly as `--sz` with the appropriate `--tgtCcy` — do NOT manually convert to contracts. With `margin` mode, the system queries current leverage and calculates: `contracts = floor(margin * lever / (ctVal * lastPx))`
- **Linear vs inverse**: `BTC-USDT-SWAP` is linear (USDT-margined); `BTC-USD-SWAP` is inverse (BTC-margined). For inverse, warn the user that margin and P&L are settled in BTC
- **posSide**: required in hedge mode (`long_short_mode`); omit in net mode. Check `h-wallet account config` for `posMode`
- **tdMode**: use `cross` for cross-margin, `isolated` for isolated margin
- **Close position**: `swap close` closes the **entire** position; to partial close, use `swap place` with `--reduceOnly`
- **Leverage**: max leverage varies by instrument and account level; exchange rejects if exceeded. **If set-leverage fails**: troubleshoot in order: (1) `swap algo orders --instId <id>` — check for pending algo orders; (2) `grid list --instId <id>` — check active bots. **Never automatically cancel algo orders or stop bots**
- **Trailing stop**: use either `--callbackRatio` (relative) or `--callbackSpread` (absolute), not both
- **Algo on close side**: always set `--side` opposite to position (e.g., long position → sell algo)
- **Portfolio-margin accounts**: cannot adjust `cross` leverage for SWAP — exchange always rejects
- **Rate limit**: 60 order operations per 2 seconds per UID
- **Negative value syntax**: For negative prices (like `-1` for market execution), use `=` form: `--tpOrdPx=-1`, NOT `--tpOrdPx -1` (which would be parsed as a separate flag)

---

## MCP Tool → OKX API Endpoint Mapping

| MCP Tool | OKX API Endpoint | Method |
|---|---|---|
| `swap_place_order` | `/api/v5/trade/order` | POST |
| `swap_cancel_order` | `/api/v5/trade/cancel-order` | POST |
| `swap_amend_order` | `/api/v5/trade/amend-order` | POST |
| `swap_close_position` | `/api/v5/trade/close-position` | POST |
| `swap_close_all_positions` | `/api/v5/trade/close-position` (batch) | POST |
| `swap_set_leverage` | `/api/v5/account/set-leverage` | POST |
| `swap_get_leverage` | `/api/v5/account/leverage-info` | GET |
| `swap_place_algo_order` | `/api/v5/trade/order-algo` | POST |
| `swap_place_trailing_stop` | `/api/v5/trade/order-algo` | POST |
| `swap_amend_algo_order` | `/api/v5/trade/amend-algos` | POST |
| `swap_cancel_algo_order` | `/api/v5/trade/cancel-algos` | POST |
| `swap_get_positions` | `/api/v5/account/positions` | GET |
| `swap_get_orders` | `/api/v5/trade/orders-pending` | GET |
| `swap_get_order` | `/api/v5/trade/order` | GET |
| `swap_get_fills` | `/api/v5/trade/fills` | GET |
| `swap_get_algo_orders` | `/api/v5/trade/orders-algo-pending` | GET |
