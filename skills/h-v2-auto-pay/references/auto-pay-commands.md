# Commands Reference: H_v2 Auto Pay

This document details the CLI commands for the `h-v2-auto-pay` skill, which handles x402 payment protocols.

## 1. Authorize Payment
```bash
h-wallet auto-pay authorize --amount <amount> --token <token>
```
Pre-authorizes a specific amount for automated API payments.

## 2. Check Allowance
```bash
h-wallet auto-pay allowance
```
Checks remaining pre-authorized balance.
