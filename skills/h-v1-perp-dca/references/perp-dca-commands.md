# Commands Reference: H_v1 Perp DCA

This document details the CLI commands for the `h-v1-perp-dca` skill, which provides Martingale (DCA) strategy for perpetual contracts.

## 1. Start DCA Strategy
```bash
h-wallet perp-dca start --instId <symbol> --margin <amount> --steps <count> --step-ratio <percent>
```
Starts a DCA bot with specified margin, steps, and price drop ratio for next entry.

## 2. Stop DCA Strategy
```bash
h-wallet perp-dca stop --algoId <id>
```
Stops an active DCA bot and optionally closes the position.

## 3. List Active DCA Bots
```bash
h-wallet perp-dca list
```
Lists all running DCA strategies and their current PnL.
