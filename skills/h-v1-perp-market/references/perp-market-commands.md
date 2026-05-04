# Commands Reference: H_v1 Perp Market

This document details the CLI commands for the `h-v1-perp-market` skill.

## 1. Get Ticker
```bash
h-wallet perp-market ticker --instId <symbol>
```
Gets real-time price, 24h volume, and funding rate.

## 2. Get Open Interest (OI)
```bash
h-wallet perp-market oi --instId <symbol>
```
Gets current open interest and OI/Volume ratio.

## 3. Get Candles
```bash
h-wallet perp-market candles --instId <symbol> --bar <timeframe>
```
Gets historical K-line data for technical analysis.
