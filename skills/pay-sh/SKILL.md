---
name: pay-sh
description: "Pay.sh / x402 paid APIs paid with the ClawPump agent wallet — search a catalog of pay-per-call services (images, data, email, voice…) and pay per call in USDC straight from the agent's custodial wallet via the ClawPump MCP. Use when the user mentions pay.sh, x402, 402 payments, or paying for an API/service with the agent's funds."
version: 2.0.0
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [pay-sh, x402, solana, payments, usdc, apis, mcp, clawpump]
    related_skills: [clawpump, mcp]
---

# Pay.sh (x402 paid APIs) — paid by the ClawPump wallet

Pay.sh is a catalog of APIs gated by stablecoin payments instead of accounts
and keys: call an endpoint, get HTTP 402 with a price, pay in USDC, get the
response. ClawPump pays these **from the agent's own custodial wallet** — there
is no separate wallet to create or fund.

## Use the ClawPump MCP tools — nothing else

These come from the ClawPump MCP (`mcp_clawpump_*` / `mcp_clawpump-stdio_*`):

- `pay_sh_search` — find providers (free)
- `pay_sh_provider_details` — endpoints + per-call price for one provider (free)
- `pay_sh_prepare_call` — balance preflight + payment preview + a 10-minute
  approval code; **pays nothing**
- `pay_sh_execute_approved` — pays from the agent wallet via x402 and returns
  the response; needs the approval code + `confirm_payment: true`

## ⛔ Never do this

- **Do NOT run the `pay` CLI** (`npx @solana/pay …`) — `pay setup`,
  `pay account new`, `pay topup`, `pay curl`, etc. That creates a *separate
  local wallet*, which is exactly what we are avoiding. The user wants the
  **ClawPump agent wallet** to pay.
- **Do NOT** create, fund, or transfer to any local/external pay wallet for
  this. No `wallet_transfer` "allowance" hop either.
- If the ClawPump pay_sh tools are missing, tell the user to enable them
  (`hermes mcp configure clawpump`, opt in `pay_sh_execute_approved`) and that
  the agent needs the `x402` skill — do **not** fall back to the CLI.

## Requirement: the `x402` skill

`pay_sh_prepare_call` / `pay_sh_execute_approved` require the ClawPump agent to
have the **`x402`** skill enabled. If a call is rejected for capability, enable
it with `update_agent` (`enabled_skills` += `x402`), then retry — never reach
for the CLI.

## ⚠️ Spending rules

`pay_sh_execute_approved` spends real USDC. Before it:

1. Get the price first — `pay_sh_provider_details` / the `pay_sh_prepare_call`
   preview include per-call pricing.
2. Tell the user the exact endpoint and price; wait for a clear yes.
3. Only then call `pay_sh_execute_approved` with the approval code and
   `confirm_payment: true`. Never loop paid calls without telling the user the
   total.
4. Report what was spent and the result.

## Pattern

`pay_sh_search` → `pay_sh_provider_details` (price) → quote it to the user →
`pay_sh_prepare_call` → (user approves) → `pay_sh_execute_approved`. All paid
from the agent's ClawPump wallet. See the `clawpump` skill for the full tool
reference.
