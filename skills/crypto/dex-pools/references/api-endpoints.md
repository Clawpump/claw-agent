# dex-pools — API endpoint reference

GeckoTerminal public API. **No key required.** Free tier ~30 requests/min.
Base: `https://api.geckoterminal.com/api/v2` · Network id: `solana`
Recommended header: `Accept: application/json;version=20230302`

Responses are JSON:API shaped: `{ "data": {...|[...]}, "included": [...] }`.
Each pool/token item has `attributes` and `relationships`.

## Token info + its pools

```bash
MINT=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263   # BONK
curl -s "https://api.geckoterminal.com/api/v2/networks/solana/tokens/$MINT" \
  -H 'Accept: application/json;version=20230302' | python3 -m json.tool
# attributes: name, symbol, price_usd, fdv_usd, market_cap_usd,
#             total_reserve_in_usd, volume_usd.h24

curl -s "https://api.geckoterminal.com/api/v2/networks/solana/tokens/$MINT/pools" \
  -H 'Accept: application/json;version=20230302' | python3 -m json.tool
# data[].attributes: name, address, base_token_price_usd, reserve_in_usd,
#                    volume_usd.h24, price_change_percentage.h24,
#                    transactions.h24.{buys,sells}
# data[].relationships.dex.data.id  -> venue (e.g. "raydium", "orca")
```

## Single pool

```bash
POOL=<pool_address>
curl -s "https://api.geckoterminal.com/api/v2/networks/solana/pools/$POOL" \
  -H 'Accept: application/json;version=20230302' | python3 -m json.tool
```

## OHLCV candles

```bash
# timeframe: day | hour | minute ; optional aggregate=, limit=
curl -s "https://api.geckoterminal.com/api/v2/networks/solana/pools/$POOL/ohlcv/hour?limit=30" \
  -H 'Accept: application/json;version=20230302' | python3 -m json.tool
# data.attributes.ohlcv_list -> [[unix_ts, open, high, low, close, volume], ...]  (newest first)
```

## Search & trending

```bash
curl -s "https://api.geckoterminal.com/api/v2/search/pools?query=bonk&network=solana" \
  -H 'Accept: application/json;version=20230302' | python3 -m json.tool

curl -s "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools" \
  -H 'Accept: application/json;version=20230302' | python3 -m json.tool
```

## Other keyless Solana DEX APIs (alternatives / cross-checks)

- Raydium: `https://api.raydium.io/v2/main/pairs` (all pairs, large payload).
- Orca: `https://api.orca.so/v1/whirlpool/list`.
- Jupiter price (for spot price cross-check): `https://price.jup.ag/v6/price?ids=<MINT>`.
