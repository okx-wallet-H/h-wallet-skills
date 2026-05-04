# Cross-Skill Workflows: H_v2 Smart Switch

## 1. Dynamic Strategy Adaptation
- **Trigger**: Market volatility drops significantly.
- **Action**: `h-v2-smart-switch` stops the DCA bot (`h-v1-perp-dca stop`) and starts a Neutral Grid (`h-v1-perp-grid start`) to capture ranging profits.
