# Cross-Skill Workflows: H_v1 Perp Grid

## 1. AI Parameter Generation
- **Trigger**: User wants to start a grid but doesn't know the parameters.
- **Action**: Use `h-v1-perp-market` to get ATR and historical volatility, then feed into grid AI parameter generator.

## 2. Take Profit & Reinvest
- **Trigger**: Grid hits 30% TP and closes.
- **Action**: `h-v1-wallet-auth` transfers profit to funding account, and restarts a new grid with the original principal.
