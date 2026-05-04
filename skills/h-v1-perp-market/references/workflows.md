# Cross-Skill Workflows: H_v1 Perp Market

## 1. Market Data for Trading
- **Trigger**: Before any trade execution.
- **Action**: `h-v1-perp-trade` calls `perp-market ticker` to check current price and funding rate to optimize entry.

## 2. Volatility Check for Strategy Switch
- **Trigger**: `h-v2-smart-switch` periodic check.
- **Action**: Use `perp-market candles` to calculate ATR. If ATR > threshold, switch to DCA; if ATR < threshold, switch to Grid.
