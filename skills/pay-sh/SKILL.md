---
name: pay-sh
description: "Pay.sh / x402 paid APIs — search a public catalog of pay-as-you-go services (market data, email, voice, domains, shopping…) and pay per call in USDC from a local pay wallet. Use when the user mentions pay.sh, x402, 402 payments, buying API access without signup, or paying for a service with stablecoins."
version: 1.0.0
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [pay-sh, x402, solana, payments, usdc, apis, mcp]
    related_skills: [clawpump, mcp]
---

# Pay.sh (x402 paid APIs)

Pay.sh is a catalog of APIs gated by stablecoin payments instead of accounts
and API keys: call an endpoint, get HTTP 402 with a price, pay in USDC, get
the response. The official client is the `pay` CLI (npm package
`@solana/pay`), and its `pay mcp` server reaches Hermes through the
**`pay-sh` catalog entry** (7 tools).

## Enabling

```
hermes mcp install pay-sh      # stdio: npx -y @solana/pay mcp
```

If Pay.sh tools are missing, tell the user to run that and restart the
session. The `pay` CLI itself also works from the shell (`pay curl …`,
`pay skills search …`) when the MCP entry isn't installed.

## Tools

Namespaced as `mcp_pay-sh_<tool>`:

- `search_catalog` / `list_catalog` / `get_catalog_entry` — find providers,
  inspect endpoints and per-call prices. Free.
- `get_balance` — the local pay account's stablecoin balance. Free.
- `topup` — generate a top-up QR for the pay account. Free (the user pays
  externally).
- `curl` — make an HTTP request **that auto-pays 402s from the local
  wallet**. This is the spending tool; OFF by default
  (`hermes mcp configure pay-sh`).
- `create_skill` — publish/validate a provider listing (for API developers).
  OFF by default.

## Wallet & funding

The pay wallet is **local** (keys under `~/.config/pay`, created with
`pay setup` or `pay account new`) — it is NOT the ClawPump agent wallet.
Treat it as a small spending allowance and keep only what the user intends
to spend.

To fund it from a ClawPump agent wallet (needs the `clawpump` MCP):

1. `get_balance` (clawpump) — confirm the agent holds enough USDC.
2. `add_to_whitelist` — whitelist the pay wallet address (user-approved).
3. `wallet_transfer` — send the approved amount (USDC) with
   `confirm_transfer: true`. Quote the exact amount + destination and wait
   for an explicit yes first.

Alternatively `topup` (QR — Venmo/PayPal/mobile wallet, no ClawPump
involved).

## ⚠️ Spending rules — confirmation is mandatory

`curl` spends real funds with no confirmation prompt of its own. Before any
paid call:

1. Look up the endpoint's price first (`get_catalog_entry` /
   `search_catalog` include per-call pricing).
2. Tell the user the exact endpoint and price and wait for a clear yes in
   this conversation.
3. Only then call `curl`. Never loop paid calls (retries, pagination,
   polling) without telling the user the total cost.
4. Report what was spent; `get_balance` after non-trivial spending.

## Common patterns

- **Find a service:** `search_catalog("weather data")` → pick provider →
  `get_catalog_entry(fqn)` → quote price to the user.
- **Paid call:** confirm price → `curl` the endpoint → return the result +
  cost.
- **Fund the wallet:** clawpump `add_to_whitelist` → `wallet_transfer`
  (confirmed) → `get_balance` (pay-sh) to verify arrival.
- **Out of funds:** `get_balance` shows the shortfall → offer `topup` or
  another funded transfer from the ClawPump wallet.
