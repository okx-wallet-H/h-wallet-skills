# Cross-Skill Workflows: H_v1 Wallet Auth

## 1. Margin Check Before Trade
- **Trigger**: `h-v1-perp-trade` receives a trade request.
- **Action**: Calls `h-v1-wallet-auth balance` to ensure sufficient margin before placing the order.

## 2. Profit Reinvestment
- **Trigger**: `h-v1-perp-grid` or `h-v1-perp-dca` closes a profitable cycle.
- **Action**: Calls `h-v1-wallet-auth` to check updated balance and recalculate position sizing for the next cycle.
