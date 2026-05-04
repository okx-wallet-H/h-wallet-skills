# Templates & Output Conventions — Trade

## Output Format

### Default (Human-readable)

Commands return Markdown tables by default:

```
┌─────────────────┬──────────┬──────┬────────┬─────────┬───────────┐
│ instId          │ posSide  │ pos  │ avgPx  │ upl     │ lever     │
├─────────────────┼──────────┼──────┼────────┼─────────┼───────────┤
│ BTC-USDT-SWAP   │ long     │ 10   │ 95000  │ +520.00 │ 10        │
│ ETH-USDT-SWAP   │ short    │ 50   │ 3200   │ -45.00  │ 5         │
└─────────────────┴──────────┴──────┴────────┴─────────┴───────────┘
[mode: live]
```

### JSON Mode (`--json`)

Returns raw OKX API v5 response:

```json
{
  "code": "0",
  "msg": "",
  "data": [...]
}
```

### JSON + Environment (`--json --env`)

Wraps response with environment context:

```json
{
  "env": "live",
  "profile": "default",
  "data": {
    "code": "0",
    "msg": "",
    "data": [...]
  }
}
```

---

## Mode Tag

**Every response** after a command execution must append:

- `[mode: live]` — for real trading
- `[mode: demo]` — for simulated trading

This is mandatory and must never be omitted.

---

## Order Amount Safety Rules

### Pre-execution Checks

Before placing any order, verify:

1. **Margin sufficiency**: Available margin ≥ required margin for the order
2. **Position limit**: New position does not exceed instrument's max position size
3. **Price reasonableness**: Limit price is within ±10% of current market price (warn if outside)

### Post-execution Verification

After any market order fill:

1. **Check fill price**: If `avgPx` deviates > 1% from expected price, warn user about slippage
2. **Check fill quantity**: If `fillSz` < `sz`, report partial fill and remaining quantity

### Amount Thresholds

| Threshold | Action |
|---|---|
| Notional > 5,000 USDT | Require explicit confirmation |
| Notional > 50,000 USDT | Require double confirmation + risk warning |
| Leverage > 20x | Display high-risk warning |
| Leverage > 50x | Display extreme-risk warning + require confirmation |

---

## Error Code Reference

| Code | Meaning | Action |
|---|---|---|
| `0` | Success | Proceed normally |
| `1` | Operation failed | Check `sMsg` for details |
| `50000` | Body cannot be empty | Check request body |
| `50001` | Service temporarily unavailable | Retry after 5s |
| `50004` | API endpoint not found | Check command syntax |
| `50011` | Rate limit exceeded | Wait 2s, then retry |
| `50013` | System busy | Retry after 5s |
| `51000` | Parameter error | Check parameter values |
| `51001` | Instrument does not exist | Verify instId |
| `51004` | Order failed (insufficient margin) | Check balance |
| `51008` | Order amount too small | Increase sz |
| `51010` | Account not enabled for trading | Check account status |
| `51020` | Order count exceeds limit | Cancel some orders first |
| `51340` | Insufficient margin for bot | Report shortfall |
| `59000` | Cannot change setting with open positions | Report to user |
| `59002` | Cannot change setting with pending orders | Report to user |

---

## Display Conventions

### Position Display

```
📊 BTC-USDT-SWAP Long Position
├── Size: 10 contracts (≈ 0.1 BTC)
├── Entry: $95,000.00
├── Current: $96,500.00
├── UPL: +$150.00 (+1.58%)
├── Leverage: 10x (Cross)
├── Liq. Price: $86,200.00
└── Margin Ratio: 15.2%
```

### Order Confirmation Template

```
📋 Order Confirmation
┌────────────────────────────────────
│ Instrument: BTC-USDT-SWAP
│ Direction:  Long (开多)
│ Type:       Market
│ Size:       500 USDT margin (≈ 5000 USDT notional at 10x)
│ Leverage:   10x (Cross)
│ TP:         105,000 (market)
│ SL:         88,000 (market)
│ Mode:       Live (实盘)
└────────────────────────────────────
⚠️ This is a LIVE trade with real funds.
Confirm? (yes/no)
```

### Risk Warning Templates

**High Leverage (> 20x):**
```
⚠️ HIGH RISK WARNING
You are using {lever}x leverage. At this leverage:
- A {100/lever}% adverse move will liquidate your position
- Estimated liquidation price: ${liqPx}
Are you sure you want to proceed?
```

**Large Amount (> 50,000 USDT):**
```
⚠️ LARGE ORDER WARNING
Order notional value: ${notional} USDT
This exceeds the large-order threshold.
Please confirm you intend to place this order.
```

---

## Parameter Display Names (中英对照)

| API Field | EN | ZH |
|---|---|---|
| `instId` | Instrument | 合约 |
| `side` | Side | 方向 |
| `posSide` | Position Side | 持仓方向 |
| `ordType` | Order Type | 订单类型 |
| `sz` | Size | 数量 |
| `px` | Price | 价格 |
| `tdMode` | Trade Mode | 保证金模式 |
| `lever` | Leverage | 杠杆 |
| `tpTriggerPx` | TP Trigger Price | 止盈触发价 |
| `slTriggerPx` | SL Trigger Price | 止损触发价 |
| `callbackRatio` | Trailing Callback | 追踪回调比例 |
| `avgPx` | Average Price | 均价 |
| `upl` | Unrealized PnL | 未实现盈亏 |
| `uplRatio` | UPL Ratio | 收益率 |
| `liqPx` | Liquidation Price | 强平价 |
| `mgnRatio` | Margin Ratio | 保证金率 |
| `fillSz` | Filled Size | 已成交数量 |
| `fee` | Fee | 手续费 |
| `pnl` | Realized PnL | 已实现盈亏 |
