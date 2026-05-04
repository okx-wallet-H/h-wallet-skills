# Commands Reference: H_v1 Wallet Auth

This document details the CLI commands for the `h-v1-wallet-auth` skill.

## 1. Get Account Balance
```bash
h-wallet wallet-auth balance --ccy <currency>
```
Gets trading account balance for a specific currency.

## 2. Get Account Configuration
```bash
h-wallet wallet-auth config
```
Gets account level, position mode, and margin mode.

## 3. Set Position Mode
```bash
h-wallet wallet-auth set-position-mode --posMode <long_short_mode|net_mode>
```
Sets the account position mode.
