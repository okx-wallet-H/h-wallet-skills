# Commands Reference: H_v2 Agentic Wallet

This document details the CLI commands for the `h-v2-agentic-wallet` skill, which provides TEE-based on-chain wallet management.

## 1. Create Wallet
```bash
h-wallet agentic-wallet create
```
Creates a new TEE-secured wallet via OKX Onchain OS.

## 2. Check Wallet Status
```bash
h-wallet agentic-wallet status
```
Checks if the current user has an active agentic wallet.

## 3. Get Wallet Balances
```bash
h-wallet agentic-wallet balance --chain <chainId>
```
Gets token balances across specified chains.
