# Cross-Skill Workflows — Trade

End-to-end workflows combining `h-v1-perp-trade` with other H Wallet skills.

---

## Workflow 1: Open Long Position with TP/SL

> User: "开多 BTC 500U 保证金，10倍杠杆，止盈 105000，止损 88000"

### Steps

```
1. [h-v1-perp-market]  h-wallet market ticker BTC-USDT-SWAP
   → Confirm current price, ensure market is active

2. [h-v1-perp-market]  h-wallet market instruments --instId BTC-USDT-SWAP
   → Get ctVal (contract face value), maxLever, tickSz

3. [h-v1-wallet-auth]  h-wallet account balance USDT
   → Confirm available margin ≥ 500 USDT

4. [h-v1-perp-trade]   h-wallet swap get-leverage --instId BTC-USDT-SWAP --mgnMode cross
   → Confirm current leverage = 10; if not, set it first

5. [CONFIRM]           Present order summary to user:
   - Instrument: BTC-USDT-SWAP
   - Direction: Long (开多)
   - Margin: 500 USDT
   - Leverage: 10x → Notional: ~5000 USDT
   - TP: 105000 (market execution)
   - SL: 88000 (market execution)
   - Mode: [live/demo]
   → Wait for user confirmation

6. [h-v1-perp-trade]   h-wallet swap place --instId BTC-USDT-SWAP --side buy --ordType market \
                          --sz 500 --tgtCcy margin --tdMode cross --posSide long \
                          --tpTriggerPx 105000 --tpOrdPx=-1 --slTriggerPx 88000 --slOrdPx=-1

7. [h-v1-perp-trade]   h-wallet swap positions BTC-USDT-SWAP
   → Verify position opened, show avgPx, sz, lever

8. [h-v1-perp-trade]   h-wallet swap algo orders --instId BTC-USDT-SWAP
   → Verify TP/SL algo orders are active
```

### Error Handling

- **Insufficient margin (Step 3)**: Report shortfall, suggest: (1) transfer funds, (2) reduce size, (3) cancel
- **Leverage mismatch (Step 4)**: Set leverage first via `swap leverage`, handle potential blockers
- **Order rejected (Step 6)**: Check error code, report to user, do NOT retry automatically

---

## Workflow 2: Close Position Partially

> User: "平掉一半的 ETH 多仓"

### Steps

```
1. [h-v1-perp-trade]   h-wallet swap positions ETH-USDT-SWAP
   → Get current position: pos=100 contracts, posSide=long

2. [CALCULATE]         Half = 100 / 2 = 50 contracts

3. [CONFIRM]           "Will close 50 contracts (half) of your ETH-USDT-SWAP long position at market. Confirm?"

4. [h-v1-perp-trade]   h-wallet swap place --instId ETH-USDT-SWAP --side sell --ordType market \
                          --sz 50 --tdMode cross --posSide long --reduceOnly

5. [h-v1-perp-trade]   h-wallet swap positions ETH-USDT-SWAP
   → Verify remaining position = 50 contracts
```

---

## Workflow 3: Trailing Stop on Existing Position

> User: "给我的 BTC 多仓加个 2% 追踪止损"

### Steps

```
1. [h-v1-perp-trade]   h-wallet swap positions BTC-USDT-SWAP
   → Get position size (e.g., pos=10 contracts, posSide=long, tdMode=cross)

2. [h-v1-perp-trade]   h-wallet swap algo orders --instId BTC-USDT-SWAP
   → Check if existing trailing stop already exists (avoid duplicates)

3. [CONFIRM]           "Will place a 2% trailing stop on your BTC long (10 contracts). Confirm?"

4. [h-v1-perp-trade]   h-wallet swap algo trail --instId BTC-USDT-SWAP --side sell --sz 10 \
                          --tdMode cross --posSide long --callbackRatio 0.02

5. [h-v1-perp-trade]   h-wallet swap algo orders --instId BTC-USDT-SWAP
   → Verify trailing stop is active
```

---

## Workflow 4: Adjust Leverage with Error Recovery

> User: "把 ETH 合约杠杆调到 20 倍"

### Steps

```
1. [h-v1-perp-trade]   h-wallet swap get-leverage --instId ETH-USDT-SWAP --mgnMode cross
   → Current lever (e.g., 10)

2. [CONFIRM]           "Will change ETH-USDT-SWAP leverage from 10x to 20x (cross). This may affect existing positions. Confirm?"

3. [h-v1-perp-trade]   h-wallet swap leverage --instId ETH-USDT-SWAP --lever 20 --mgnMode cross
   → If success: done
   → If error "cancel pending algo orders or stop bots": continue to Step 4

4. [h-v1-perp-trade]   h-wallet swap algo orders --instId ETH-USDT-SWAP
   → Find blocking algo orders (most common cause)

5. [h-v1-perp-grid]    h-wallet grid list --instId ETH-USDT-SWAP
   → Check for active grid bots (secondary cause)

6. [REPORT]            Present findings to user:
   "Leverage change blocked by: 2 pending TP/SL orders (algoId: xxx, yyy).
    Would you like to cancel them to proceed?"

7. [WAIT]              Wait for user's explicit decision

8. [h-v1-perp-trade]   h-wallet swap algo cancel --instId ETH-USDT-SWAP --algoId <id>
   → Cancel approved blockers only

9. [h-v1-perp-trade]   h-wallet swap leverage --instId ETH-USDT-SWAP --lever 20 --mgnMode cross
   → Retry leverage change

10. [h-v1-perp-trade]  h-wallet swap get-leverage --instId ETH-USDT-SWAP --mgnMode cross
    → Verify new lever = 20
```

---

## Workflow 5: Signal-Driven Trade Execution

> User: "看看 BTC 的聪明钱信号，如果看多就帮我开多 200U 保证金"

### Steps

```
1. [h-v1-perp-signal]  h-wallet signal consensus --instId BTC-USDT-SWAP
   → Get longRatio, weightedLongRatio, netNotionalUsdt, vs24h

2. [ANALYZE]           Interpret signal:
   - longRatio > 0.6 AND weightedLongRatio > 0.6 AND vs24h > 0 → Bullish consensus
   - longRatio < 0.4 AND weightedLongRatio < 0.4 AND vs24h < 0 → Bearish consensus
   - Otherwise → Mixed/neutral

3. [REPORT]            Present signal analysis to user:
   "BTC Smart Money Signal: 68% long (weighted: 72%), net +$2.3M, +5% vs 24h ago.
    Consensus: Bullish. Shall I proceed with opening a long position?"

4. [WAIT]              Wait for user confirmation (signal is advisory, NOT automatic)

5. [h-v1-perp-market]  h-wallet market ticker BTC-USDT-SWAP → current price
6. [h-v1-wallet-auth]  h-wallet account balance USDT → confirm margin
7. [h-v1-perp-trade]   h-wallet swap place --instId BTC-USDT-SWAP --side buy --ordType market \
                          --sz 200 --tgtCcy margin --tdMode cross --posSide long \
                          --tpTriggerPx <30% above> --tpOrdPx=-1 --slTriggerPx <10% below> --slOrdPx=-1
8. [h-v1-perp-trade]   h-wallet swap positions BTC-USDT-SWAP → verify
```

---

## Workflow 6: Modify Existing TP/SL

> User: "把我 BTC 的止盈改到 110000"

### Steps

```
1. [h-v1-perp-trade]   h-wallet swap algo orders --instId BTC-USDT-SWAP
   → Find existing TP algo order, get algoId

2. [CONFIRM]           "Will amend TP trigger price from 105000 to 110000. Confirm?"

3. [h-v1-perp-trade]   h-wallet swap algo amend --instId BTC-USDT-SWAP --algoId <id> \
                          --newTpTriggerPx 110000

4. [h-v1-perp-trade]   h-wallet swap algo orders --instId BTC-USDT-SWAP
   → Verify updated TP price
```

---

## Workflow 7: Emergency Close All

> User: "一键平仓" / "全部平掉"

### Steps

```
1. [h-v1-perp-trade]   h-wallet swap positions
   → List ALL open positions

2. [WARN]              ⚠️ "This will close ALL positions at market price:
                        - BTC-USDT-SWAP: Long 10 contracts, UPL: +$500
                        - ETH-USDT-SWAP: Short 50 contracts, UPL: -$120
                        Total unrealized PnL: +$380
                        Are you SURE you want to close all? (yes/no)"

3. [WAIT]              Wait for explicit "yes" confirmation

4. [h-v1-perp-trade]   h-wallet swap close-all

5. [h-v1-perp-trade]   h-wallet swap positions
   → Verify all positions are 0
```

---

## Workflow 8: Inverse Contract Trading

> User: "用币本位开多 BTC"

### Steps

```
1. [WARN]              "⚠️ BTC-USD-SWAP is an inverse (coin-margined) contract.
                        Margin and P&L are settled in BTC, not USDT.
                        Do you want to proceed?"

2. [h-v1-perp-market]  h-wallet market instruments --instId BTC-USD-SWAP
   → Get ctVal (e.g., 100 USD per contract)

3. [h-v1-wallet-auth]  h-wallet account balance BTC
   → Confirm available BTC margin

4. [h-v1-perp-trade]   h-wallet swap place --instId BTC-USD-SWAP --side buy --ordType market \
                          --sz <contracts> --tdMode cross --posSide long

5. [h-v1-perp-trade]   h-wallet swap positions BTC-USD-SWAP → verify
```

---

## General Workflow Rules

1. **Always check market + balance before write operations**
2. **Always verify after write operations** (positions, orders, algo orders)
3. **Never auto-execute** based on signals — always present analysis and wait for user decision
4. **Never auto-fix** API errors that suggest destructive actions
5. **Append mode tag** `[mode: live]` or `[mode: demo]` after every command result
6. **Default TP suggestion**: When user opens a position without TP, suggest 30% TP
