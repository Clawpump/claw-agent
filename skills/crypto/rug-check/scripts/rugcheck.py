#!/usr/bin/env python3
"""rug-check — Solana token safety diligence (read-only, never signs).

Combines RugCheck's public report with an independent on-chain cross-check
(mint/freeze authority + top-holder concentration) via Solana JSON-RPC.

Usage:
    python3 rugcheck.py check <mint>        # consolidated verdict (recommended)
    python3 rugcheck.py summary <mint>      # RugCheck quick summary + score
    python3 rugcheck.py report <mint>       # RugCheck full report (key fields)
    python3 rugcheck.py authority <mint>    # RPC: mint/freeze authority + supply
    python3 rugcheck.py holders <mint> [--top 10]   # RPC: holder concentration

RPC endpoint resolution (first that is set):
    $SOLANA_RPC_URL  >  $HELIUS_API_KEY (-> Helius)  >  https://api.mainnet-beta.solana.com
A Helius key is optional and only raises rate limits.
"""

import json
import os
import sys
import urllib.request
import urllib.error

RUGCHECK = "https://api.rugcheck.xyz/v1"


def _rpc_url() -> str:
    if os.environ.get("SOLANA_RPC_URL"):
        return os.environ["SOLANA_RPC_URL"]
    key = os.environ.get("HELIUS_API_KEY")
    if key:
        return f"https://mainnet.helius-rpc.com/?api-key={key}"
    return "https://api.mainnet-beta.solana.com"


def _get(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "hermes-agent/1.0", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"_error": f"HTTP {e.code} {e.reason}", "_url": url}
    except urllib.error.URLError as e:
        return {"_error": f"connection error: {e.reason}", "_url": url}
    except json.JSONDecodeError:
        return {"_error": "non-JSON response", "_url": url}


def _rpc(method: str, params: list):
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    req = urllib.request.Request(
        _rpc_url(), data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "hermes-agent/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"_error": f"HTTP {e.code} {e.reason}"}
    except urllib.error.URLError as e:
        return {"_error": f"connection error: {e.reason}"}


# ── On-chain cross-check (authoritative, known RPC shapes) ──────────────────

def _mint_info(mint: str):
    """Return parsed SPL mint info via getAccountInfo(jsonParsed)."""
    r = _rpc("getAccountInfo", [mint, {"encoding": "jsonParsed"}])
    if "_error" in r:
        return {"error": r["_error"]}
    val = (r.get("result") or {}).get("value")
    if not val:
        return {"error": "mint account not found (not a valid SPL mint?)"}
    try:
        info = val["data"]["parsed"]["info"]
    except (KeyError, TypeError):
        return {"error": "account is not a parseable SPL mint"}
    return {
        "mint_authority": info.get("mintAuthority"),
        "freeze_authority": info.get("freezeAuthority"),
        "decimals": info.get("decimals"),
        "supply": info.get("supply"),
        "initialized": info.get("isInitialized"),
    }


def _largest(mint: str):
    r = _rpc("getTokenLargestAccounts", [mint])
    if "_error" in r:
        return None, r["_error"]
    return (r.get("result") or {}).get("value") or [], None


def _supply_ui(mint: str):
    r = _rpc("getTokenSupply", [mint])
    if "_error" in r:
        return None
    v = (r.get("result") or {}).get("value") or {}
    return v.get("uiAmount")


def cmd_authority(mint: str):
    info = _mint_info(mint)
    if info.get("error"):
        print(f"✗ {info['error']}")
        return
    print(f"Mint: {mint}")
    print(f"RPC:  {_rpc_url().split('?')[0]}")
    ma, fa = info["mint_authority"], info["freeze_authority"]
    print(f"\n  Mint authority:   {ma or 'null'}   {'✅ revoked (no new supply)' if ma is None else '⚠️ ACTIVE — supply can be inflated'}")
    print(f"  Freeze authority: {fa or 'null'}   {'✅ revoked (cannot freeze)' if fa is None else '⚠️ ACTIVE — your tokens can be frozen'}")
    print(f"  Decimals:         {info['decimals']}")
    print(f"  Initialized:      {info['initialized']}")


def cmd_holders(mint: str, top: int = 10):
    accts, err = _largest(mint)
    if err:
        print(f"✗ {err}")
        return
    total = _supply_ui(mint)
    print(f"Top {top} holders of {mint}")
    if total:
        print(f"Total supply: {total:,.0f}\n")
    conc = 0.0
    for i, a in enumerate(accts[:top], 1):
        ui = a.get("uiAmount") or 0
        pct = (ui / total * 100) if total else None
        if pct is not None:
            conc += pct
        pct_s = f"{pct:5.2f}%" if pct is not None else "   ?  "
        print(f"  {i:>2}. {a.get('address','?')}  {pct_s}")
    if total:
        flag = "✅ low" if conc < 30 else ("⚠️ elevated" if conc < 60 else "🔴 HIGH")
        print(f"\n  Top-{top} concentration: {conc:.1f}%  {flag}")
    print("\n  Note: largest token *accounts* may include locked LP / CEX / vesting — verify owners before concluding.")


# ── RugCheck (public, defensive parsing) ────────────────────────────────────

def cmd_summary(mint: str):
    d = _get(f"{RUGCHECK}/tokens/{mint}/report/summary")
    if isinstance(d, dict) and d.get("_error"):
        print(f"✗ RugCheck: {d['_error']} (token may be too new to have a report)")
        return
    score = d.get("score_normalised", d.get("score"))
    print(f"RugCheck summary for {mint}")
    if score is not None:
        print(f"  Risk score: {score}  (lower = safer on RugCheck's scale)")
    risks = d.get("risks") or []
    if risks:
        print("  Risks:")
        for r in risks:
            lvl = r.get("level", "")
            print(f"    [{lvl}] {r.get('name','?')}: {r.get('description','')}")
    else:
        print("  (no risks array returned)")


def cmd_report(mint: str):
    d = _get(f"{RUGCHECK}/tokens/{mint}/report")
    if isinstance(d, dict) and d.get("_error"):
        print(f"✗ RugCheck: {d['_error']} (token may be too new to have a report)")
        return
    print(f"RugCheck report for {mint}")
    print(f"  Score: {d.get('score_normalised', d.get('score'))}")
    print(f"  Mint authority:   {d.get('mintAuthority')}")
    print(f"  Freeze authority: {d.get('freezeAuthority')}")
    tok = d.get("token") or {}
    if tok:
        print(f"  Supply: {tok.get('supply')}  Decimals: {tok.get('decimals')}")
    mkts = d.get("markets") or []
    for m in mkts[:5]:
        lp = m.get("lp") or {}
        print(f"  LP[{m.get('marketType','?')}]: lpLockedPct={lp.get('lpLockedPct')}  lpLocked={lp.get('lpLocked')}")
    th = d.get("topHolders") or []
    if th:
        print("  Top holders (RugCheck):")
        for h in th[:10]:
            print(f"    {h.get('address','?')}  {h.get('pct','?')}%")


# ── Consolidated verdict ────────────────────────────────────────────────────

def cmd_check(mint: str):
    print(f"═══ rug-check: {mint} ═══\n")
    info = _mint_info(mint)
    flags = []
    if info.get("error"):
        print(f"On-chain: ✗ {info['error']}")
    else:
        ma, fa = info["mint_authority"], info["freeze_authority"]
        print("On-chain authorities:")
        print(f"  mint authority:   {'✅ revoked' if ma is None else '🔴 ACTIVE: ' + str(ma)}")
        print(f"  freeze authority: {'✅ revoked' if fa is None else '🔴 ACTIVE: ' + str(fa)}")
        if ma is not None:
            flags.append("mint authority NOT revoked (supply can be inflated)")
        if fa is not None:
            flags.append("freeze authority NOT revoked (tokens can be frozen)")

    accts, err = _largest(mint)
    if not err and accts:
        total = _supply_ui(mint)
        if total:
            conc = sum((a.get("uiAmount") or 0) for a in accts[:10]) / total * 100
            print(f"\nTop-10 holder concentration: {conc:.1f}%")
            if conc >= 60:
                flags.append(f"top-10 holders own {conc:.0f}% (very concentrated)")
            elif conc >= 30:
                flags.append(f"top-10 holders own {conc:.0f}% (elevated)")

    rc = _get(f"{RUGCHECK}/tokens/{mint}/report/summary")
    if isinstance(rc, dict) and not rc.get("_error"):
        score = rc.get("score_normalised", rc.get("score"))
        print(f"\nRugCheck score: {score}")
        for r in (rc.get("risks") or []):
            if str(r.get("level", "")).lower() in ("warn", "warning", "danger", "high"):
                flags.append(f"RugCheck: {r.get('name','?')}")
    else:
        print("\nRugCheck: no report (token may be brand new — rely on on-chain check)")

    print("\n── VERDICT ──")
    if not flags:
        print("✅ CLEAN on the checks performed (authorities revoked, holders not over-concentrated, no high RugCheck risks).")
    else:
        sev = "🔴 RUGGABLE / HIGH RISK" if len(flags) >= 2 else "⚠️ CAUTION"
        print(sev)
        for f in flags:
            print(f"  • {f}")
    print("\nNot financial advice. A 'clean' result does not guarantee safety — confirm with the user before any swap/launch.")


def main():
    args = sys.argv[1:]
    if not args or args[0] in {"-h", "--help", "help"}:
        print(__doc__)
        return
    cmd = args[0]
    if cmd in {"check", "summary", "report", "authority"} and len(args) >= 2:
        {"check": cmd_check, "summary": cmd_summary, "report": cmd_report, "authority": cmd_authority}[cmd](args[1])
    elif cmd == "holders" and len(args) >= 2:
        top = 10
        if "--top" in args:
            i = args.index("--top")
            top = int(args[i + 1]) if i + 1 < len(args) else 10
        cmd_holders(args[1], top)
    else:
        print(f"Unknown or incomplete command: {' '.join(args)}\n")
        print(__doc__)


if __name__ == "__main__":
    main()
