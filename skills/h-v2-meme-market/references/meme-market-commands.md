# Commands Reference: H_v2 Meme Market

This document details the CLI commands for the `h-v2-meme-market` skill.

## 1. Trending Tokens
```bash
h-wallet meme trending --chain <chainId> --limit <count>
```
Gets hot tokens ranked by trending score.

## 2. Token Analysis
```bash
h-wallet meme analyze --chain <chainId> --address <contract>
```
Gets detailed price, market cap, and volume info.

## 3. Holder Distribution
```bash
h-wallet meme holders --chain <chainId> --address <contract>
```
Analyzes token holder concentration and top holders.
