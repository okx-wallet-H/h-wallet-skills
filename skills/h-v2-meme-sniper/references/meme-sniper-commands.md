# Commands Reference: H_v2 Meme Sniper

This document details the CLI commands for the `h-v2-meme-sniper` skill.

## 1. Start 100U Sniper
```bash
h-wallet meme-sniper start-100u --chain <chainId> --address <contract>
```
Automatically executes a 100U buy order for the specified token.

## 2. Set Sniper Config
```bash
h-wallet meme-sniper config --slippage <percent> --tp <percent> --sl <percent>
```
Configures default slippage, take profit, and stop loss for the sniper.
