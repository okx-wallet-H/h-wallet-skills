# Commands Reference: H_v1 Perp Trade

This document details the CLI commands for the `h-v1-perp-trade` skill.

## 1. Place Order
```bash
h-wallet perp-trade place-order --instId <symbol> --tdMode <mode> --side <buy|sell> --ordType <type> --sz <size>
```
Places a new trading order.

## 2. Cancel Order
```bash
h-wallet perp-trade cancel-order --instId <symbol> --ordId <id>
```
Cancels an active order.

## 3. Get Positions
```bash
h-wallet perp-trade positions --instId <symbol>
```
Gets current open positions.
