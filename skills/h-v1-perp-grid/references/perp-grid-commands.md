# Commands Reference: H_v1 Perp Grid

This document details the CLI commands for the `h-v1-perp-grid` skill, which provides neutral grid trading with 30% take-profit logic.

## 1. Start Grid Strategy
```bash
h-wallet perp-grid start --instId <symbol> --margin <amount> --lower <price> --upper <price> --grids <count>
```
Starts a neutral grid. Built-in logic will automatically close and take profit when PnL reaches 30%.

## 2. Stop Grid Strategy
```bash
h-wallet perp-grid stop --algoId <id>
```
Stops an active grid bot.

## 3. List Active Grid Bots
```bash
h-wallet perp-grid list
```
Lists all running grid strategies.
