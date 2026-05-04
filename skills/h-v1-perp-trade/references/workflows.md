# Cross-Skill Workflows: H_v1 Perp Trade

## 1. Trade Execution Pipeline
- **Trigger**: Strategy (Grid/DCA) or Signal requests a trade.
- **Action**: `h-v1-perp-trade` validates parameters, checks margin via `h-v1-wallet-auth`, and executes the order.

## 2. Position Monitoring
- **Trigger**: Open position exists.
- **Action**: `h-v1-perp-trade` monitors PnL and triggers alerts or automated closing if thresholds are met.
