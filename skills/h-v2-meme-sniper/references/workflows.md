# Cross-Skill Workflows: H_v2 Meme Sniper

## 1. Safe Sniping
- **Trigger**: `h-v2-meme-sniper` receives a buy command.
- **Action**: Before buying, it calls `h-v2-security-guard token-scan` to ensure the token is not a honeypot or rug pull.
