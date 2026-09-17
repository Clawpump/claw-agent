---
name: weavr
description: Create and manage onchain portfolios from a thesis.
version: 0.1.0
author: weavr
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [weavr, portfolio, solana, defi, mcp]
    requires_toolsets: [terminal]
    category: finance
    required_environment_variables:
      - { name: WEAVR_SIGN_TOOL, optional: true, required_for: signing with the wallet tool }
      - { name: WEAVR_WALLET, optional: true, required_for: choosing the wallet the tool signs with (paybox, local or link) }
      - { name: PAYBOX_CONFIG_DIR, optional: true, required_for: signing with PayBox }
      - { name: PAYBOX_CREDENTIAL_ID, optional: true, required_for: signing with PayBox }
      - { name: PAYBOX_CLI, optional: true, required_for: signing with PayBox }
      - { name: SIGN_LOCAL_KEYPAIR_FILE, optional: true, required_for: signing with a local key }
---

# weavr

Weavr creates onchain portfolios from a thesis. The weavr MCP server is attached to this agent; this host exposes its tools as `mcp__weavr__<name>` (for example `mcp__weavr__list_assets`), and the names below are the bare ones. The wallet is a separate command-line tool run with the terminal tool (see Wallet); without one, the user signs through a link (see Sign link). Say asset, portfolio, thesis, rebalance, deposit, shares, agent and onchain.

## When to use
The user wants to create a portfolio, deposit into one, check one, or rebalance one.

## Procedure
Flow: the user types a thesis → list_assets (never before they have typed one) → suggest_mix if they ask for a recommendation → ask for a name, a ticker and any rules → simulate_portfolio → show the result → create_portfolio once they confirm → hand the result to the wallet tool, or send the sign link → the portfolio goes live.

1. Never invent a name or ticker; use theirs exactly as typed.
2. Never ask the user for a wallet address: the wallet tool provides the creator. Run `node $WEAVR_SIGN_TOOL --address` and pass the address as `creator` to create_portfolio. If `WEAVR_SIGN_TOOL` is not set on this host, there is no wallet tool: call create_portfolio with `wallet: "link"` and no creator, send the `signUrl` it returns to the user in a private chat, and call await_portfolio with only the deploymentId until it answers live (see Sign link).
3. With the PayBox wallet, keep create_portfolio to 4 assets or fewer (see Limits); a local key or a sign link takes any size. With PayBox, two or three assets are one signature; four are two, which the wallet tool handles in one run.
4. After create_portfolio returns a `deploymentId` in wallet-tool mode, run `node $WEAVR_SIGN_TOOL --deployment <deploymentId>` with the terminal tool. It signs and waits; its output is the portfolio status. When it prints `"status":"live"`, tell the user the portfolio is live and give the `url`. Do not call await_portfolio yourself. In link mode the wallet tool is not run at all.
5. Deposits: run `node $WEAVR_SIGN_TOOL --deposit <ticker> --amount <usd>`. It builds, signs and sends; report what it prints. Do not call build_deposit or send_signed yourself. Without a wallet tool, deposits are made on the portfolio's page on weavr.sh.
6. Never print walletPayload, never ask whether they signed, and never ask them to check again. Wallets sign but do not send: the wallet tool passes what it signed to weavr, which sends it and watches the chain.
7. Reads (get_portfolio, list_portfolios, get_asset, the histories, simulate_rebalance) need no wallet.

Fees: 0.40% round trip (0.20% in, 0.20% out), 60% of the fee stream to the creator, no management fee, 5% idle, 2% rebalance band. Amounts are in USD; percents are percents.

## Wallet
The wallet is the command `node $WEAVR_SIGN_TOOL ...`, run with the terminal tool only (never with code execution, which strips the variables it needs). It reads its own keys from files; you never see or handle them. It signs with PayBox, a local key or nothing at all (the sign link), as the host configured; every line it prints carries `wallet` with the one in use.

- `--address` → `{"address": "..."}`: the creator or depositor address to pass to weavr.
- `--deployment <deploymentId>` → signs the create and waits until it is live; prints `{"status":"live","mint":...,"url":...}` or an error.
- `--deposit <ticker> --amount <usd>` → builds, signs and sends a deposit; prints `{"status":"confirmed",...}` or an error.

It refuses transactions it should not sign. Its errors mean: `LEGACY_ONLY` = too many assets for this wallet (use 4 or fewer and try again, or send a sign link); `WALLET_DECLINED` = the wallet did not sign, tell the user and stop; `FOREIGN_PROGRAM` or `WRONG_PAYER` = the transaction was not for this user, stop and tell the user; `BUSY` = another signing run is in progress, wait a moment and run the same command once more; `NO_WALLET` = this host signs through the sign link, so create with `wallet: "link"` and send the link (see Sign link).

## Sign link
When this host has no wallet tool, the user signs in their own wallet on a page weavr hosts. create_portfolio with `wallet: "link"` (and no creator) answers `awaiting_wallet` with a `signUrl`. Send the link to the user once, in a private chat; say that it shows the portfolio before anything is signed and that it closes after 30 minutes. Whoever opens it, connects a wallet and signs pays the network cost and becomes the creator. Then call await_portfolio with only the deploymentId: `awaiting_wallet` means they have not signed yet (say so and stop; call again when they say they have), `finishing` means weavr is finishing the setup (call again), `live` is done (give the `url`), `expired` means nobody signed in time (offer to create again). Never paste the link twice and never ask whether they signed.

## Pitfalls
- `sign_again` from the wallet tool means the transaction expired before it was signed; run the same `--deployment` command once more.
- `OPERATOR_BUSY` or `AWAIT_IN_PROGRESS` from weavr: wait a moment and run the same command once more.
- `INSUFFICIENT_SOL`: the wallet needs more SOL for the network cost; tell the user the amount and stop.
- Only act in a private chat with the wallet's owner. In a group, explain that portfolio actions are private.
- Send a sign link only in a private chat with the wallet's owner; never post one in a group.

## Limits on this host
- The PayBox wallet signs portfolios with up to 4 assets; a local key and the sign link have no such limit. If the wallet tool answers `LEGACY_ONLY`, the mix is too large for that wallet: use 4 or fewer, or send a sign link.
- With PayBox, one signature per create up to three assets, two at four; deposits are one signature each.

## Verification
The create is done when the wallet tool prints `"status":"live"` with a `url`, or when await_portfolio over a sign link answers `live`. A deposit is done when the wallet tool prints `"status":"confirmed"`.
