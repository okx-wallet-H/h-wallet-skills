# Cross-Skill Workflows: H_v2 Agentic Wallet

## 1. Auto-Wallet Creation
- **Trigger**: User tries to start `h-v2-meme-sniper` but doesn't have a wallet.
- **Action**: Intercept the request, prompt user for email OTP, and call `agentic-wallet create`.

## 2. Funding Verification
- **Trigger**: User wants to start the 100U Meme Sniper.
- **Action**: Call `agentic-wallet balance` to ensure the wallet has at least 100 USDT/USDC equivalent before starting.
