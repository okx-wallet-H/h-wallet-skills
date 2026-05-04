# Cross-Skill Workflows: H_v1 Perp DCA

## 1. Signal-Triggered DCA
- **Trigger**: `h-v1-perp-signal` detects a strong buy signal but high volatility.
- **Action**: `h-v1-perp-dca` starts a DCA bot instead of a single market order to average out the entry price.

## 2. Auto-Switch to Grid
- **Trigger**: `h-v2-smart-switch` detects market transitioning from trending to ranging.
- **Action**: Stop DCA (`h-v1-perp-dca stop`) and start Grid (`h-v1-perp-grid start`).
