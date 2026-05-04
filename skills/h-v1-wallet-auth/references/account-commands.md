# Account Commands Reference

## account balance — 账户余额

```bash
h-wallet account balance [--ccy <currency>] [--json]
```

### Parameters

| Param | Required | Default | Description |
|---|---|---|---|
| `--ccy` | No | all | Filter by currency (e.g. `USDT`, `ETH`) |
| `--json` | No | false | Output in JSON format |

### Response Fields

| Field | Type | Description |
|---|---|---|
| `ccy` | String | Currency name |
| `availBal` | String | Available balance |
| `frozenBal` | String | Frozen balance |
| `ordFrozen` | String | Order frozen balance |
| `totalEq` | String | Total equity (USDT-denominated) |
| `isoEq` | String | Isolated margin equity |
| `mgnRatio` | String | Margin ratio |
| `upl` | String | Unrealized PnL |

### Display Rules

- Hide BTC-related assets by default
- Highlight USDT balance prominently
- Show margin usage percentage: `usedMargin / totalEq * 100%`

---

## account positions — 当前持仓

```bash
h-wallet account positions [--instType SWAP] [--instId <id>] [--json]
```

### Parameters

| Param | Required | Default | Description |
|---|---|---|---|
| `--instType` | No | `SWAP` | Instrument type filter |
| `--instId` | No | all | Specific instrument (e.g. `ETH-USDT-SWAP`) |
| `--json` | No | false | Output in JSON format |

### Response Fields

| Field | Type | Description |
|---|---|---|
| `instId` | String | Instrument ID |
| `posSide` | String | Position side: `long` / `short` / `net` |
| `pos` | String | Position quantity (contracts) |
| `avgPx` | String | Average entry price |
| `upl` | String | Unrealized PnL |
| `uplRatio` | String | Unrealized PnL ratio |
| `lever` | String | Leverage |
| `liqPx` | String | Liquidation price |
| `mgnMode` | String | Margin mode: `cross` / `isolated` |
| `margin` | String | Margin amount |
| `mgnRatio` | String | Margin ratio |

---

## account transfer — 资金划转

```bash
h-wallet account transfer --ccy <currency> --amt <amount> --from <account> --to <account> [--json]
```

### Parameters

| Param | Required | Default | Description |
|---|---|---|---|
| `--ccy` | Yes | — | Currency (e.g. `USDT`) |
| `--amt` | Yes | — | Transfer amount |
| `--from` | Yes | — | Source account: `6` (funding) / `18` (trading) |
| `--to` | Yes | — | Destination account: `6` (funding) / `18` (trading) |

### Account Type Codes

| Code | Account |
|---|---|
| `6` | Funding account |
| `18` | Trading account |

---

## account set-position-mode — 切换持仓模式

```bash
h-wallet account set-position-mode --posMode <mode> [--json]
```

| Param | Required | Values | Description |
|---|---|---|---|
| `--posMode` | Yes | `long_short_mode` / `net_mode` | Position mode |

---

## account set-leverage — 设置杠杆

```bash
h-wallet account set-leverage --instId <id> --lever <n> --mgnMode <mode> [--posSide <side>] [--json]
```

| Param | Required | Default | Description |
|---|---|---|---|
| `--instId` | Yes | — | Instrument ID (e.g. `ETH-USDT-SWAP`) |
| `--lever` | Yes | — | Leverage value (1-125) |
| `--mgnMode` | Yes | — | Margin mode: `cross` / `isolated` |
| `--posSide` | No | — | Position side (required in long/short mode): `long` / `short` |

---

## MCP Tool Reference

| CLI Command | MCP Tool | OKX API Endpoint |
|---|---|---|
| `account balance` | `account_get_balance` | `GET /api/v5/account/balance` |
| `account positions` | `account_get_positions` | `GET /api/v5/account/positions` |
| `account config` | `account_get_config` | `GET /api/v5/account/config` |
| `account transfer` | `account_transfer` | `POST /api/v5/asset/transfer` |
| `account set-position-mode` | `account_set_position_mode` | `POST /api/v5/account/set-position-mode` |
| `account set-leverage` | `account_set_leverage` | `POST /api/v5/account/set-leverage` |
