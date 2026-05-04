# H Wallet CLI Preflight

Execute these steps **once per session**, before running any H Wallet skill command.

## Step 1 — CLI availability check

```bash
h-wallet --version
```

If the CLI is not installed, install it:

```bash
npm install -g @h-wallet/trade-cli
```

## Step 2 — Detect auth method (once per session)

Run **both** commands — they report different things and must be combined:

```bash
h-wallet config show --json      # reveals API-key profiles (TOML config)
h-wallet auth status --json      # reveals OAuth session state
```

Decision table (applied **in this order** — first match wins):

| Condition | Auth method | Action |
|---|---|---|
| `config show --json` has any profile with a non-empty `api_key` field | **API Key** | Use it. Use `--profile <name>` to select profile. |
| No API-key profile **AND** `auth status --json` returns `"status":"logged_in"` | **OAuth** | Use it. `--demo` flag controls trading mode. |
| No API-key profile **AND** `auth status --json` returns `"status":"not_logged_in"` | **No auth** | Stop — guide user to run `h-wallet config init` or `h-wallet auth login`. |

**Remember the outcome for the entire session.**

## Step 3 — Version drift check

```bash
h-wallet --version
```

Compare against this skill's `metadata.version` (from the calling SKILL.md frontmatter). If CLI version > skill version, show warning once per session:

> ⚠️ CLI version is ahead of this skill. Some new commands may not be documented here.

## Notes

- H Wallet CLI wraps OKX V5 API with HMAC-SHA256 signing
- Configuration stored in `~/.h-wallet/config.toml`
- All private endpoints require API Key + Secret Key + Passphrase
- Market data endpoints are public (no auth required)
- Use `--profile live` for real trading, `--profile demo` for simulated trading
