---
name: rug-check
description: "Solana token safety diligence: mint/freeze authority, LP lock/burn, top-holder concentration, RugCheck score. Read-only — run before swapping into or launching alongside any token."
version: 1.0.0
author: ClawPump (built on Hermes)
tags: [solana, token-safety, rug-check, holders, due-diligence, defi, clawpump]
platforms: [linux, macos, windows]
prerequisites:
  commands: [curl, python3]
required_environment_variables:
  - name: HELIUS_API_KEY
    optional: true
    prompt: "Helius RPC key (optional — only raises RPC rate limits)"
    help: "https://dev.helius.xyz"
metadata:
  hermes:
    category: crypto
    requires_toolsets: [terminal]
    related_skills: [clawpump, dex-pools]
    homepage: https://rugcheck.xyz
---

# rug-check — Solana Token Safety

Read-only safety diligence for any Solana token mint. **Never signs anything.**
It pairs with the ClawPump MCP trade/launch tools (`swap_execute`,
`launch_token_gasless`, …) as the pre-flight that decides whether a token is
safe to touch.

Two independent sources, cross-checked:
1. **On-chain (authoritative):** Solana JSON-RPC for mint/freeze authority and
   real top-holder concentration — facts, not opinions.
2. **RugCheck (heuristic):** a community risk score + flagged risks.

Helper: `scripts/rugcheck.py`. Endpoint reference: `references/api-endpoints.md`.

## When to Use

- **Before any `swap_execute`** into an unfamiliar token.
- A user pastes a mint and asks "is this safe / is it a rug / can I ape this?"
- Before launching or buying alongside an existing token.
- Vetting a token a tracked wallet/whale just bought.

## Quick Check (do this first)

```bash
python3 ~/.hermes/skills/crypto/rug-check/scripts/rugcheck.py check <MINT>
```

This prints a consolidated verdict: authority status, top-10 concentration,
RugCheck score, and a `CLEAN / CAUTION / RUGGABLE` line with the reasons.

## Key Concepts

- **Mint authority** — if NOT revoked (non-null), the team can mint unlimited
  new supply and dilute you. Revoked (null) is the safe state.
- **Freeze authority** — if NOT revoked, the team can freeze *your* tokens so
  you can't sell. Revoked (null) is safe.
- **LP locked vs burned** — liquidity that's burned/locked can't be pulled
  (the classic "rug"). Unlocked LP is a red flag.
- **Top-holder concentration** — a few wallets holding most of the supply can
  dump on everyone. >30% top-10 is elevated, >60% is dangerous. (Some large
  holders are locked LP / CEX / vesting — verify owners before concluding.)
- **RugCheck score** — heuristic, not a guarantee. Use it as a signal, not a verdict.

## Individual Commands

```bash
# RPC authority cross-check (mint can't be inflated / frozen?)
python3 scripts/rugcheck.py authority <MINT>

# Holder concentration from on-chain largest accounts
python3 scripts/rugcheck.py holders <MINT> --top 10

# RugCheck quick summary (+ risk flags) / full report
python3 scripts/rugcheck.py summary <MINT>
python3 scripts/rugcheck.py report  <MINT>
```

Raw curl equivalents (no key needed) are in `references/api-endpoints.md`.

## Presenting Results

Lead with the verdict line, then the evidence:

> ⚠️ **CAUTION** — mint authority is still ACTIVE (supply can be inflated) and
> the top 10 wallets hold 41%. RugCheck score 1,800.
> Mint/freeze: mint ACTIVE 🔴 / freeze revoked ✅. I'd size small or skip.

Always show percentages and the score band. Never auto-execute a trade off a
"clean" result — **confirm with the user** (and follow the ClawPump
confirmation rules) before any `swap_execute` / launch.

## Rate Limits & Keys

- RugCheck public endpoints are rate-limited (best-effort; brand-new tokens may
  have no report yet — fall back to the on-chain authority/holder check).
- Solana RPC: defaults to the public `api.mainnet-beta.solana.com`. For heavier
  use, set `SOLANA_RPC_URL` or `HELIUS_API_KEY` (free at dev.helius.xyz) — the
  script picks them up automatically.

## Pitfalls

- A "clean" mint can still dump — LP unlocked, insider wallets, or social
  manipulation aren't fully captured here. This is risk *reduction*, not a guarantee.
- `getTokenLargestAccounts` returns token *accounts*; a big one may be locked
  LP, a CEX, or a vesting contract — note that rather than calling it a whale.
- RugCheck score is heuristic and can disagree with the on-chain facts — trust
  the on-chain authority check over the score when they conflict.
- This is **not financial advice** and never a reason to skip user confirmation.

## Notes for Hermes

- Use the `terminal` tool with `python3`/`curl` (not web_extract).
- `HELIUS_API_KEY` / `SOLANA_RPC_URL` flow from `~/.hermes/.env` automatically.
- Read-only: this skill complements — never replaces — the ClawPump MCP
  (`mcp_clawpump_*`) trade and launch tools.
