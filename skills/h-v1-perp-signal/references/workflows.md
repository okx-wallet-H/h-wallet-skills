# Cross-Skill Workflows: H_v1 Perp Signal

## 1. Signal to Trade Execution
- **Trigger**: Smart money net inflow spikes + Top trader long ratio > 2.0.
- **Action**: Pass signal to `h-v1-perp-trade` to open a long position.

## 2. Liquidation Hunting
- **Trigger**: Large liquidation cluster identified near current price.
- **Action**: Pass data to `h-v1-perp-grid` to set grid limits just outside the liquidation zone.
