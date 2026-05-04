# Commands Reference: H_v2 Security Guard

This document details the CLI commands for the `h-v2-security-guard` skill.

## 1. Token Scan
```bash
h-wallet security token-scan --chain <chainId> --address <contract>
```
Scans a token for honeypot, mintable, mutable, and rug pull risks.

## 2. Transaction Scan
```bash
h-wallet security tx-scan --chain <chainId> --tx <hash>
```
Simulates a transaction to detect potential malicious outcomes.
