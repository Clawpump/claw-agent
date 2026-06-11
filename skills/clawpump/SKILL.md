---
name: clawpump
description: "ClawPump on Solana — create/chat with agents, trade, perps, DCA, lend, launch tokens, marketplace, predictions, gift cards, agent email, intelligence via mcp_clawpump_* tools. Use when the user mentions ClawPump, launching a token, an agent's wallet/balance, swaps, perps, gift cards, agent email, or DeFi on Solana."
version: 1.2.0
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [clawpump, solana, defi, trading, perps, dca, lending, token-launch, marketplace, predictions, gift-cards, agent-mail, agents, mcp]
    related_skills: [mcp, pay-sh]
---

# ClawPump

ClawPump is a Solana platform for AI agents: each agent has a wallet and can
trade, run perps, DCA, lend, launch tokens, buy gift cards, send email from
its own inbox, and be bought/sold on a marketplace. Its full feature set
reaches Hermes through the **ClawPump MCP server** (127 tools, 10 resources,
10 prompts).

## Enabling ClawPump

The tools are not built in — they come from the ClawPump MCP server, which the
user installs once:

```
hermes clawpump setup          # interactive: remote (browser) or stdio (cpk_ key)
# or directly:
hermes mcp install clawpump        # remote OAuth (browser paste cpk_ key)
hermes mcp install clawpump-stdio  # local npx, CLAWPUMP_API_KEY in ~/.hermes/.env
```

If ClawPump tools are missing, tell the user to run `hermes clawpump setup` and
restart the session — do **not** try to call the ClawPump HTTP API directly.

## Tool naming

Every ClawPump tool is exposed under the MCP namespace **`mcp_clawpump_<tool>`**
(remote) or `mcp_clawpump-stdio_<tool>`. Throughout this doc the bare tool name
is used (e.g. `swap_quote`); call the namespaced form your tool list shows.

## agent_id

Most tools act on a specific agent. Resolve it once with `list_agents`, then
pass `agent_id`. If the user set `CLAWPUMP_DEFAULT_AGENT` (or has exactly one
agent), `agent_id` can usually be omitted. When unsure which agent, ask.

## What's available (127 tools, 19 groups)

| Group | Representative tools |
|-------|----------------------|
| Agents | `list_agents`, `get_agent`, `create_agent`, `update_agent`, `delete_agent`, `upload_agent_avatar`, `list_available_skills` |
| Chat | `chat_with_agent`, `get_chat_history`, `get_free_tier_status` |
| Autonomous runs | `list_agent_runs`, `create_agent_run`, `update_agent_run`, `cancel_agent_run`, `get_agent_run_steps` |
| Custom skills | `list_custom_skills`, `get_custom_skill`, `create_custom_skill`, `update_custom_skill`, `delete_custom_skill` |
| Trading | `swap_quote`, `swap_execute`, `token_search`, `get_portfolio`, `get_price`, `get_market_signals`, `get_indicators`, `arbitrage_quote`/`arbitrage_prices` |
| DCA / limits | `dca_create`, `dca_list`, `dca_cancel`, `limit_order_create`, `limit_order_cancel`, `limit_order_history` |
| Phoenix perps | `perps_markets`, `perps_market_data`, `perps_account`, `perps_account_prepare`, `perps_trader_register`, `perps_collateral_deposit`, `perps_collateral_withdraw`, `perps_order_preview`, `perps_order_execute`, `perps_order_cancel` |
| Lending (Jupiter) | `jup_lend_tokens`, `jup_lend_positions`, `jup_lend_deposit`, `jup_lend_withdraw` |
| Predictions | `predictions_events`, `predictions_positions`, `predictions_open`, `predictions_close` |
| Token launch | `get_launch_status`, `launch_token_gasless`, `launch_metaplex_genesis_token` |
| Marketplace | `browse_marketplace`, `create_marketplace_listing`, `delist_marketplace_listing`, `browse_public_agents`, `place_bid`, `get_my_bids`, `get_received_bids`, `accept_marketplace_bid`, `reject_marketplace_bid`, `withdraw_marketplace_bid`, `get_marketplace_history` |
| Agent cards (Laso) | `agent_card_search_merchants`, `agent_card_search_gift_cards`, `agent_card_quote`, `agent_card_create`, `agent_card_list`, `agent_card_get`, `agent_card_status`, `agent_card_data`, `agent_card_balance`, `agent_card_reveal`, `agent_card_cancel`, `agent_card_refresh`, `agent_card_withdraw`, `agent_card_withdrawals`, `agent_card_connect`, `agent_card_connect_link` |
| Agent mail | `agent_mail_create`, `agent_mail_get_address`, `agent_mail_send`, `agent_mail_list`, `agent_mail_read` |
| Wallet & billing | `get_balance`, `get_budget`, `get_usage`, `get_transactions`, `get_wallet_summaries`, `get_wallet_history`, `get_private_wallet_balance`, `get_balance_history`, `sync_billing`, `wallet_transfer` |
| Market intelligence | `intelligence_capabilities`, `intelligence_market`, `intelligence_signals`, `intelligence_macro`, `intelligence_perps` |
| Integrations | `list_integrations`, `save_integration`, `remove_integration`, `get_linked_accounts` |
| Account | `get_account_status`, `connect_twitter`, `configure_twitter_posting`, `set_external_wallet`, `generate_link_code`, `link_google_account`, `get_dashboard_urls` |
| Whitelist | `get_whitelist`, `add_to_whitelist`, `remove_from_whitelist` |
| Utility | `get_model_catalog`, `get_news_feed` |

By default only the **91 read-mostly** tools are enabled. The financial ones
below are opt-in via `hermes mcp configure clawpump`.

## ⚠️ FINANCIAL & IRREVERSIBLE TOOLS — confirmation is mandatory

These move real funds on-chain or are irreversible. **Never call them without
the user's explicit, specific go-ahead in this conversation.** Quote the exact
action (amounts, token, agent) and wait for a clear yes. Several require an
explicit confirm flag (e.g. `confirmRisk: true`, `confirm_launch: true`,
`confirm_spend: true`, `confirm_send: true`, `confirm_transfer: true`) — only
set it after the user agrees.

- Trading: `swap_execute`, `dca_create`, `dca_cancel`, `limit_order_create`, `limit_order_cancel`
- Perps: `perps_account_prepare`, `perps_trader_register`, `perps_collateral_deposit`, `perps_collateral_withdraw`, `perps_order_execute`, `perps_order_cancel`
- Lending: `jup_lend_deposit`, `jup_lend_withdraw`
- Predictions: `predictions_open`, `predictions_close`
- Marketplace (funds/ownership): `place_bid`, `accept_marketplace_bid`, `reject_marketplace_bid`, `withdraw_marketplace_bid`, `delist_marketplace_listing`
- Token launch: `launch_token_gasless`, `launch_metaplex_genesis_token`
- Account / lifecycle: `set_external_wallet`, `delete_agent`, `delete_automation`, `delete_custom_skill`, `cancel_agent_run`, `remove_integration`, `remove_from_whitelist`
- Agent cards (Laso): `agent_card_create` (pays USDC from the agent wallet — quote first), `agent_card_withdraw`, `agent_card_cancel`, `agent_card_reveal` (exposes the card number / redemption secret)
- Agent mail: `agent_mail_create` (one-time ~$2 USDC from the agent wallet), `agent_mail_send` (outward-facing email)
- Wallet: `wallet_transfer` (irreversible on-chain send; destination must be on the agent's whitelist via `add_to_whitelist`; quote the exact amount, token, and address, then `confirm_transfer: true`)

**Always get a quote/preview first** (`swap_quote` before `swap_execute`,
`perps_order_preview` before `perps_order_execute`, `agent_card_quote` before
`agent_card_create`) and show it to the user before executing. Report tx
signatures back when a call succeeds.

## Resources (read with the MCP resource reader)

Live read-only views under `clawpump://`:

- `clawpump://me` — current account/auth status
- `clawpump://agents` — all your agents
- `clawpump://agents/{agentId}` — one agent's detail
- `clawpump://agents/{agentId}/balance` — credit balance
- `clawpump://agents/{agentId}/usage` — usage & budget
- `clawpump://agents/{agentId}/chat` — chat history
- `clawpump://agents/{agentId}/runs` — autonomous runs
- `clawpump://marketplace` — marketplace listings
- `clawpump://models` — available LLM models
- `clawpump://wallets` — wallet summaries

Each resource is also reachable via an equivalent tool (e.g. `list_agents`,
`get_balance`, `get_wallet_summaries`), so if the resource reader isn't handy,
call the matching tool.

## Guided workflows (mirror the MCP prompts)

The server defines these prompt flows; run them with the tools above:
`get-started`, `create-agent`, `setup-trading`, `launch-token`, `review-costs`,
`setup-automations`, `explore-marketplace`, `setup-dca`, `explore-predictions`,
`earn-yield`.

Common patterns:
- **New user:** `get_account_status` → `list_agents`; if none, `create_agent`.
- **Trade:** `token_search` → `swap_quote` → (confirm) → `swap_execute`.
- **Launch a token:** `get_launch_status` → confirm details → `launch_token_gasless` (gasless) or `launch_metaplex_genesis_token`.
- **Check portfolio:** `get_balance` + `get_portfolio` + `get_wallet_summaries`.
- **Perps:** `perps_markets`/`perps_market_data` → `perps_order_preview` → (confirm) → `perps_order_execute`.
- **Gift card:** `agent_card_search_merchants`/`agent_card_search_gift_cards` → `agent_card_quote` → (confirm) → `agent_card_create` → `agent_card_status`; `agent_card_reveal` only when the user asks for the card details.
- **Agent email:** `agent_mail_get_address`; no inbox → (confirm ~$2 USDC) `agent_mail_create`; then `agent_mail_send` (confirm) or `agent_mail_list` → `agent_mail_read`.
- **Fund an external wallet (e.g. a pay.sh allowance):** `get_balance` → `add_to_whitelist` (user-approved address) → (confirm) `wallet_transfer`. See the `pay-sh` skill.
