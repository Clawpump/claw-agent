#!/usr/bin/env python3
"""dex-pools — Solana DEX liquidity, OHLCV, and venue discovery (read-only).

Powered by GeckoTerminal's public API (no key required). Gives the liquidity
and price-history context behind a ClawPump `swap_quote` — is the pool deep or
thin, which venue is best, what do the candles look like.

Usage:
    python3 dexpools.py token <mint>                 # token price + its top pools
    python3 dexpools.py pools <mint>                 # every pool/venue for a token
    python3 dexpools.py pool <pool_address>          # one pool's detail
    python3 dexpools.py ohlcv <pool_address> [--tf day|hour|minute] [--limit 30]
    python3 dexpools.py search <query>               # find pools by name/symbol
    python3 dexpools.py trending                     # trending Solana pools

All endpoints are public and keyless. Network defaults to solana.
"""

import json
import sys
import urllib.request
import urllib.parse
import urllib.error

BASE = "https://api.geckoterminal.com/api/v2"
NET = "solana"


def _get(path: str):
    url = f"{BASE}{path}"
    req = urllib.request.Request(url, headers={
        "User-Agent": "hermes-agent/1.0",
        "Accept": "application/json;version=20230302",
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print("Rate limited by GeckoTerminal (free tier ~30 req/min) — wait and retry.", file=sys.stderr)
        else:
            print(f"HTTP {e.code}: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Connection error: {e.reason}", file=sys.stderr)
        sys.exit(1)


def _usd(v) -> str:
    try:
        v = float(v)
    except (TypeError, ValueError):
        return "?"
    if abs(v) >= 1_000_000:
        return f"${v/1_000_000:.2f}M"
    if abs(v) >= 1_000:
        return f"${v/1_000:.1f}K"
    if abs(v) >= 1:
        return f"${v:.2f}"
    return f"${v:.8f}".rstrip("0").rstrip(".")


def _pct(v) -> str:
    try:
        return f"{float(v):+.1f}%"
    except (TypeError, ValueError):
        return "?"


def _dex_id(item: dict) -> str:
    try:
        return item["relationships"]["dex"]["data"]["id"]
    except (KeyError, TypeError):
        return "?"


def _print_pool_row(item: dict, idx=None):
    a = item.get("attributes", {})
    name = a.get("name", "?")
    dex = _dex_id(item)
    price = a.get("base_token_price_usd")
    liq = a.get("reserve_in_usd")
    vol = (a.get("volume_usd") or {}).get("h24")
    chg = (a.get("price_change_percentage") or {}).get("h24")
    addr = a.get("address", "")
    prefix = f"{idx:>2}. " if idx is not None else ""
    print(f"{prefix}{name}  [{dex}]")
    print(f"     price {_usd(price)}  liq {_usd(liq)}  vol24h {_usd(vol)}  24h {_pct(chg)}")
    if addr:
        print(f"     pool: {addr}")


def cmd_token(mint: str):
    info = _get(f"/networks/{NET}/tokens/{mint}")
    a = (info.get("data") or {}).get("attributes", {})
    print(f"{a.get('name','?')} ({a.get('symbol','?')})  {mint}")
    print(f"  price {_usd(a.get('price_usd'))}  FDV {_usd(a.get('fdv_usd'))}  "
          f"mcap {_usd(a.get('market_cap_usd'))}  vol24h {_usd((a.get('volume_usd') or {}).get('h24'))}")
    print(f"  total reserve in pools: {_usd(a.get('total_reserve_in_usd'))}\n")
    pools = _get(f"/networks/{NET}/tokens/{mint}/pools")
    data = pools.get("data", [])
    print(f"Top pools ({len(data)}):")
    for i, p in enumerate(sorted(data, key=lambda x: float((x.get('attributes') or {}).get('reserve_in_usd') or 0), reverse=True)[:8], 1):
        _print_pool_row(p, i)


def cmd_pools(mint: str):
    pools = _get(f"/networks/{NET}/tokens/{mint}/pools")
    data = pools.get("data", [])
    if not data:
        print("No pools found for this token on Solana.")
        return
    print(f"{len(data)} pool(s) for {mint}:\n")
    for i, p in enumerate(sorted(data, key=lambda x: float((x.get('attributes') or {}).get('reserve_in_usd') or 0), reverse=True), 1):
        _print_pool_row(p, i)


def cmd_pool(pool: str):
    p = _get(f"/networks/{NET}/pools/{pool}")
    item = p.get("data", {})
    _print_pool_row(item)
    a = item.get("attributes", {})
    tx = (a.get("transactions") or {}).get("h24") or {}
    if tx:
        print(f"     24h txns: {tx.get('buys','?')} buys / {tx.get('sells','?')} sells")
    print(f"     created: {a.get('pool_created_at','?')}")


def cmd_ohlcv(pool: str, tf: str = "hour", limit: int = 30):
    tf = tf if tf in ("day", "hour", "minute") else "hour"
    d = _get(f"/networks/{NET}/pools/{pool}/ohlcv/{tf}?limit={limit}")
    rows = ((d.get("data") or {}).get("attributes") or {}).get("ohlcv_list") or []
    if not rows:
        print("No OHLCV data for this pool.")
        return
    rows = list(reversed(rows))  # API returns newest-first
    closes = [r[4] for r in rows if r[4] is not None]
    lo, hi = (min(closes), max(closes)) if closes else (0, 1)
    span = (hi - lo) or 1
    blocks = "▁▂▃▄▅▆▇█"
    from datetime import datetime, timezone
    print(f"OHLCV ({tf}, {len(rows)} candles)  range {_usd(lo)}–{_usd(hi)}\n")
    for r in rows:
        ts, o, h, l, c, v = r
        t = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%m-%d %H:%M")
        b = blocks[min(len(blocks) - 1, int((c - lo) / span * (len(blocks) - 1)))] if c is not None else " "
        print(f"  {t}  {b}  close {_usd(c)}  vol {_usd(v)}")


def cmd_search(query: str):
    d = _get(f"/search/pools?query={urllib.parse.quote(query)}&network={NET}")
    data = d.get("data", [])
    if not data:
        print(f"No pools found for '{query}'.")
        return
    print(f"Pools matching '{query}':\n")
    for i, p in enumerate(data[:12], 1):
        _print_pool_row(p, i)


def cmd_trending():
    d = _get(f"/networks/{NET}/trending_pools")
    data = d.get("data", [])
    print(f"Trending Solana pools ({len(data)}):\n")
    for i, p in enumerate(data[:12], 1):
        _print_pool_row(p, i)


def main():
    args = sys.argv[1:]
    if not args or args[0] in {"-h", "--help", "help"}:
        print(__doc__)
        return
    cmd = args[0]
    if cmd == "token" and len(args) >= 2:
        cmd_token(args[1])
    elif cmd == "pools" and len(args) >= 2:
        cmd_pools(args[1])
    elif cmd == "pool" and len(args) >= 2:
        cmd_pool(args[1])
    elif cmd == "ohlcv" and len(args) >= 2:
        tf, limit = "hour", 30
        if "--tf" in args:
            i = args.index("--tf"); tf = args[i + 1] if i + 1 < len(args) else "hour"
        if "--limit" in args:
            i = args.index("--limit"); limit = int(args[i + 1]) if i + 1 < len(args) else 30
        cmd_ohlcv(args[1], tf, limit)
    elif cmd == "search" and len(args) >= 2:
        cmd_search(" ".join(args[1:]))
    elif cmd == "trending":
        cmd_trending()
    else:
        print(f"Unknown or incomplete command: {' '.join(args)}\n")
        print(__doc__)


if __name__ == "__main__":
    main()
