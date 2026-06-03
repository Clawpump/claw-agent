# rug-check — API endpoint reference

All read-only. No API key required for the core path; a Solana RPC key only
raises rate limits.

## RugCheck (public, no key)

Base: `https://api.rugcheck.xyz/v1`

| Endpoint | Purpose |
|----------|---------|
| `GET /tokens/{mint}/report/summary` | Fast risk summary: normalized score + `risks[]` |
| `GET /tokens/{mint}/report` | Full report: authorities, `token` supply/decimals, `markets[].lp` (lpLocked/lpLockedPct), `topHolders[]` |

```bash
MINT=So11111111111111111111111111111111111111112
curl -s "https://api.rugcheck.xyz/v1/tokens/$MINT/report/summary" | python3 -m json.tool
curl -s "https://api.rugcheck.xyz/v1/tokens/$MINT/report" | python3 -m json.tool
```

Notes: brand-new tokens may 404 / return empty (no report yet) — fall back to
the on-chain RPC checks below. Field names can vary; the helper script parses
defensively (`score_normalised` or `score`, `risks[]`, `markets[].lp`).

## Solana JSON-RPC (authoritative on-chain facts)

Endpoint resolution used by the script:
`$SOLANA_RPC_URL` → `$HELIUS_API_KEY` (`https://mainnet.helius-rpc.com/?api-key=KEY`)
→ default `https://api.mainnet-beta.solana.com`.

### Mint / freeze authority + supply

```bash
RPC=https://api.mainnet-beta.solana.com
curl -s "$RPC" -H 'Content-Type: application/json' -d '{
  "jsonrpc":"2.0","id":1,"method":"getAccountInfo",
  "params":["'$MINT'", {"encoding":"jsonParsed"}]
}' | python3 -m json.tool
# result.value.data.parsed.info.{mintAuthority, freezeAuthority, supply, decimals}
# mintAuthority == null  -> supply cannot be inflated (good)
# freezeAuthority == null -> tokens cannot be frozen (good)
```

### Top holders (concentration)

```bash
curl -s "$RPC" -H 'Content-Type: application/json' -d '{
  "jsonrpc":"2.0","id":1,"method":"getTokenLargestAccounts","params":["'$MINT'"]
}' | python3 -m json.tool
# result.value[] -> {address, uiAmount}; sum top 10 / total supply = concentration

curl -s "$RPC" -H 'Content-Type: application/json' -d '{
  "jsonrpc":"2.0","id":1,"method":"getTokenSupply","params":["'$MINT'"]
}' | python3 -m json.tool
# result.value.uiAmount = total supply
```

## Optional: higher rate limits

- Helius free key: https://dev.helius.xyz → set `HELIUS_API_KEY`.
- Any RPC provider: set `SOLANA_RPC_URL` to its HTTPS endpoint.
