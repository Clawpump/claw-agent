---
name: dex-pools
description: "Solana DEX liquidity, OHLCV candles, and venue discovery for any token/pool via GeckoTerminal (keyless). Use to sanity-check swap slippage, find the deepest venue, and read price history."
version: 1.0.0
author: ClawPump (built on Hermes)
tags: [solana, dex, liquidity, ohlcv, geckoterminal, trading, defi, clawpump]
platforms: [linux, macos, windows]
prerequisites:
  commands: [curl, python3]
metadata:
  hermes:
    category: crypto
    requires_toolsets: [terminal]
    related_skills: [clawpump, rug-check]
    homepage: https://www.geckoterminal.com
---

# dex-pools — Solana DEX Liquidity & OHLCV

Read-only liquidity, price-history, and venue context for any Solana token —
the data behind a swap, which the ClawPump MCP `swap_quote` / `arbitrage_quote`
tools don't give you. **No API key required** (GeckoTerminal public API).

Helper: `scripts/dexpools.py`. Endpoint reference: `references/api-endpoints.md`.

## When to Use

- Before/after a `swap_quote`: "is this slippage real, or is the pool just thin?"
- Pick the **deepest venue** for a token (Raydium vs Orca vs Meteora …).
- Read **OHLCV candles** / 24h change for a token or pool.
- Discover which pools a token even trades in; find trending Solana pools.

## Commands

```bash
S=~/.hermes/skills/crypto/dex-pools/scripts/dexpools.py

python3 $S token <MINT>          # price/FDV/mcap + top pools by liquidity
python3 $S pools <MINT>          # every pool/venue, sorted by liquidity
python3 $S pool  <POOL_ADDRESS>  # one pool: liquidity, vol, buys/sells, age
python3 $S ohlcv <POOL_ADDRESS> --tf hour --limit 30   # candle sparkline
python3 $S search "bonk"         # find pools by name/symbol
python3 $S trending              # trending Solana pools
```

`--tf` is `day`, `hour`, or `minute`.

## Key Concepts

- **Liquidity (reserve_in_usd)** — total USD locked in the pool. A swap that's a
  large fraction of liquidity will move the price (high slippage). Quote a
  token, check the pool depth here, and warn if the trade is big vs the pool.
- **Venue / DEX** — the same token trades on multiple pools; the deepest pool
  usually gives the best execution. Use `pools` to compare.
- **24h volume** — thin volume = hard to exit; pair with liquidity.
- **OHLCV** — open/high/low/close/volume candles for trend/volatility context.

## Workflow with the ClawPump MCP

1. `mcp_clawpump_swap_quote` → note the quoted price + impact.
2. `dexpools.py pools <MINT>` → confirm the deepest venue + real liquidity.
3. If the trade size is a large % of `reserve_in_usd`, flag high slippage to the
   user before they approve a `swap_execute`.
4. Optionally `dexpools.py ohlcv <pool>` to show recent price action.

Pair with the **rug-check** skill for safety before sizing a position.

## Presenting Results

Lead with the punchline:
> BONK trades deepest on Raydium ($4.2M liq, $1.1M 24h vol, +6.3% 24h). Your
> 50 SOL buy is ~0.2% of pool liquidity → slippage should be minimal.

## Rate Limits & Pitfalls

- GeckoTerminal free tier is ~30 req/min (no key). On HTTP 429, wait and retry;
  the script reports it clearly.
- Brand-new tokens may not be indexed yet — fall back to `rug-check` (RPC) for
  existence/authority, or the ClawPump MCP `get_price`.
- Prices are indexer estimates; for the executable price always use the MCP
  `swap_quote`. This skill is **context**, not the execution path.

## Notes for Hermes

- Use the `terminal` tool with `python3` (stdlib only — no installs needed).
- Read-only; complements `mcp_clawpump_swap_quote` / `get_price` /
  `arbitrage_quote`, never replaces them.
