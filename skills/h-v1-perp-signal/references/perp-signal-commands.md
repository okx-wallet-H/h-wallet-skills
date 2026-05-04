# Commands Reference: H_v1 Perp Signal

This document details the CLI commands for the `h-v1-perp-signal` skill.

## 1. Smart Money Tracker
```bash
h-wallet perp-signal smart-money --instId <symbol>
```
Tracks smart money net inflow/outflow on CEX perpetuals.

## 2. Top Trader Sentiment
```bash
h-wallet perp-signal sentiment --instId <symbol>
```
Gets long/short ratio of top traders vs retail.

## 3. Liquidation Map
```bash
h-wallet perp-signal liquidations --instId <symbol>
```
Gets clustered liquidation price levels.
