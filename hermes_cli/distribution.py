"""ClawPump distribution overlay (downstream-owned).

This module is the single home for everything that makes this distribution
"ClawPump" rather than vanilla Hermes. Keeping it here -- instead of editing
upstream-owned files (skin_engine.py, config.py, ...) -- keeps those files
byte-for-byte mergeable with NousResearch/hermes-agent, so syncing upstream
stays (near) conflict-free.

Every upstream consumer imports this lazily and degrades to vanilla Hermes
when the module (or a given key) is absent. Keep imports light: config.py
imports this at startup.
"""

from __future__ import annotations

from typing import Any, Dict

# Default skin for this distribution (vanilla Hermes uses "default").
DEFAULT_SKIN = "clawpump"

# Git remote the in-app update check compares against (vanilla Hermes uses
# NousResearch/hermes-agent).
UPDATE_REPO_URL = "https://github.com/Clawpump/claw-agent.git"

# Extra top-level CLI subcommands this distribution adds (kept in sync with
# main.py's _BUILTIN_SUBCOMMANDS validation set via a hook there).
EXTRA_SUBCOMMANDS = ("clawpump",)

# ── Skins shipped by this distribution ───────────────────────────────────
# Moved verbatim out of hermes_cli/skin_engine.py:_BUILTIN_SKINS and merged
# back into that dict by a small hook there, so every skin consumer
# (list_skins / load_skin / get_active_skin) sees it unchanged.
BUILTIN_SKINS: Dict[str, Dict[str, Any]] = {
    "clawpump": {
        "name": "clawpump",
        "description": "ClawPump — Solana green, claw mark (built on Hermes)",
        "colors": {
            "banner_border": "#16A34A",
            "banner_title": "#4ADE80",
            "banner_accent": "#22C55E",
            "banner_dim": "#15803D",
            "banner_text": "#DCFCE7",
            "ui_accent": "#22C55E",
            "ui_label": "#4ADE80",
            "ui_ok": "#22C55E",
            "ui_error": "#ef5350",
            "ui_warn": "#ffa726",
            "prompt": "#DCFCE7",
            "input_rule": "#16A34A",
            "response_border": "#4ADE80",
            "status_bar_bg": "#0B1F14",
            "status_bar_text": "#DCFCE7",
            "status_bar_strong": "#4ADE80",
            "status_bar_dim": "#3F6B50",
            "status_bar_good": "#22C55E",
            "status_bar_warn": "#FACC15",
            "status_bar_bad": "#F59E0B",
            "status_bar_critical": "#EF5350",
            "session_label": "#4ADE80",
            "session_border": "#3F6B50",
            "selection_bg": "#14532D",
            "completion_menu_bg": "#06140C",
            "completion_menu_current_bg": "#14532D",
            "completion_menu_meta_bg": "#0B1F14",
            "completion_menu_meta_current_bg": "#14532D",
        },
        "spinner": {
            "waiting_faces": ["(◴)", "(◷)", "(◶)", "(◵)", "(<>)"],
            "thinking_faces": ["(✦)", "(◇)", "(◈)", "(⌁)", "(<>)"],
            "thinking_verbs": [
                "pumping", "launching", "scanning the mints", "routing the swap",
                "reading the chart", "minting", "snapping the claw", "checking liquidity",
            ],
            "wings": [
                ["⟪◇", "◇⟫"],
                ["⟪✦", "✦⟫"],
                ["⟪>", "<⟫"],
                ["⟪◈", "◈⟫"],
            ],
        },
        "branding": {
            "agent_name": "ClawPump",
            "org": "ClawPump",
            "credit": "built on Hermes ☤ by Nous Research",
            "welcome": "Welcome to ClawPump 🦀 — Solana agents, trading & token launch. Type your message or /help for commands.",
            "goodbye": "Claws out! 🦀",
            "response_label": " ✦ ClawPump ",
            "prompt_symbol": "❯",
            "help_header": "(✦) Available Commands",
        },
        "tool_prefix": "┊",
        "banner_logo": """[bold #86EFAC] ██████╗██╗      █████╗ ██╗    ██╗██████╗ ██╗   ██╗███╗   ███╗██████╗ [/]
[bold #4ADE80]██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗██║   ██║████╗ ████║██╔══██╗[/]
[#22C55E]██║     ██║     ███████║██║ █╗ ██║██████╔╝██║   ██║██╔████╔██║██████╔╝[/]
[#16A34A]██║     ██║     ██╔══██║██║███╗██║██╔═══╝ ██║   ██║██║╚██╔╝██║██╔═══╝ [/]
[#15803D]╚██████╗███████╗██║  ██║╚███╔███╔╝██║     ╚██████╔╝██║ ╚═╝ ██║██║     [/]
[#166534] ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝      ╚═════╝ ╚═╝     ╚═╝╚═╝     [/]""",
        "banner_hero": """[#86EFAC]⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⣀⣂⣤⣤⣤⣤⣤⣤⠄[/]
[#7EE5A4]⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣢⣵⣾⣿⣿⣿⣿⣿⣿⣿⡿⠃⠀[/]
[#77DA9B]⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣴⠿⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠀⠀⠀[/]
[#6FD093]⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣾⠟⠁⢀⣼⣿⣿⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀[/]
[#68C58A]⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣜⡿⠁⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⠗⠀⠀⠀⠀⠀[/]
[#60BB82]⠀⠀⠀⠀⠀⠀⠀⠀⢀⣮⣿⣇⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀[/]
[#58B179]⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⠃⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀[/]
[#51A671]⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠃⠀⠀⠀⠀⠀⠀⠀[/]
[#499C68]⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀[/]
[#429160]⠀⠀⠀⠀⠀⣀⣈⡙⠻⢿⣿⣿⣿⣿⣿⣿⡿⠋⣡⣤⣤⠀⠀⠀⠀⠀⠐⢀⣠⣴[/]
[#3A8757]⠀⠀⠀⢀⣞⣿⠟⠉⣷⣦⣌⠙⢿⣿⣿⣿⣠⣾⣿⣿⣿⣷⣷⣶⣶⣶⣿⣿⣿⠃[/]
[#327D4F]⠀⠀⣀⣉⡛⠳⢴⣾⣿⣿⣿⣷⣄⠹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠁⠀[/]
[#2B7246]⢠⣞⣿⡟⣩⣿⣶⣌⠻⢿⣿⣿⣿⣆⠘⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠀⠀⠀[/]
[#23683E]⠀⠉⠙⠻⢿⣿⣿⣿⣷⣄⠻⣿⣿⣿⡀⠹⢿⣿⣿⣿⣿⠿⠟⠋⠁⠀⠀⠀⠀⠀[/]
[#1C5D35]⠀⠀⠀⠀⠀⠈⠻⣿⣿⣿⣆⠹⣿⠟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀[/]
[#14532D]⠀⠀⠀⠀⠀⠀⠀⠘⢿⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀[/]""",
    },
}


# ── Default-config overlay ───────────────────────────────────────────────
# ClawPump ships its remote MCP server pre-wired and the clawpump skin as the
# default brand. Applied onto DEFAULT_CONFIG by a hook in config.py.
_CLAWPUMP_MCP_SERVER = {
    # TODO: switch to https://mcp.clawpump.tech/mcp once the DNS CNAME is
    # configured; the custom domain is currently NXDOMAIN, so point at the
    # live Railway domain so a fresh install connects.
    "url": "https://clawpump-mcp-production.up.railway.app/mcp",
    "auth": "oauth",
    "enabled": True,
}


def apply_config_overlay(default_config: Dict[str, Any]) -> None:
    """Apply ClawPump defaults onto a freshly-built DEFAULT_CONFIG.

    Pre-wires the remote ClawPump MCP server (the full tool surface; first
    connect opens a browser for per-user OAuth, after which the mcp_clawpump_*
    tools load automatically -- prune with ``hermes mcp configure clawpump``)
    and makes the clawpump skin the default brand. Idempotent.
    """
    servers = default_config.setdefault("mcp_servers", {})
    if isinstance(servers, dict):
        servers.setdefault("clawpump", dict(_CLAWPUMP_MCP_SERVER))
    display = default_config.get("display")
    if isinstance(display, dict):
        display["skin"] = DEFAULT_SKIN


# ── OPTIONAL_ENV_VARS overlay ────────────────────────────────────────────
# ClawPump (Solana token launch, trading, perps, DeFi). Used by the stdio
# ClawPump MCP path (``npx @clawpump/agents``, catalog entry
# ``clawpump-stdio``). The remote OAuth path (``clawpump``) stores per-user
# tokens under ~/.hermes/mcp-tokens/ instead and needs no key here.
_CLAWPUMP_ENV_VARS: Dict[str, Dict[str, Any]] = {
    "CLAWPUMP_API_KEY": {
        "description": "ClawPump API key (cpk_*) for the ClawPump MCP stdio transport",
        "prompt": "ClawPump API key (cpk_…)",
        "url": "https://agents.clawpump.tech/dashboard/api",
        "password": True,
        "category": "tools",
    },
    "CLAWPUMP_API_URL": {
        "description": "ClawPump backend URL override (advanced — leave empty for the default)",
        "prompt": "ClawPump backend URL (leave empty for default)",
        "url": None,
        "password": False,
        "category": "tools",
        "advanced": True,
    },
    "CLAWPUMP_DEFAULT_AGENT": {
        "description": "Default ClawPump agent id (optional — skips agent-selection prompts)",
        "prompt": "Default ClawPump agent id (optional)",
        "url": None,
        "password": False,
        "category": "tools",
        "advanced": True,
    },
}


def apply_env_var_overlay(optional_env_vars: Dict[str, Any]) -> None:
    """Register ClawPump's env vars into config.OPTIONAL_ENV_VARS. Idempotent."""
    for name, spec in _CLAWPUMP_ENV_VARS.items():
        optional_env_vars.setdefault(name, dict(spec))


# ── CLI integration ──────────────────────────────────────────────────────


def register_subparsers(subparsers) -> None:
    """Register distribution-specific CLI subcommands.

    Wires the ``clawpump`` command (ClawPump MCP install / auth / tool
    selection) onto the top-level argparse subparsers.
    """
    from hermes_cli.clawpump_cli import add_parser as _add_clawpump_parser

    _add_clawpump_parser(subparsers)


def try_self_update(project_root: Any) -> bool:
    """Handle distribution-specific self-update; return True if handled.

    ClawPump agents installed via ``npx @clawpump/claw-agent`` have no git
    checkout (the bundle ships inside the npm package), so the normal git-pull
    update can't apply -- re-run the npm installer instead. Returns False when
    this isn't an npm-bundle install, so the caller falls through to the
    standard (git / pip / docker) update paths.
    """
    from pathlib import Path

    if not (Path(project_root) / ".claw-bundle").exists():
        return False

    import shutil
    import subprocess
    import sys

    print("→ Updating ClawPump agent via npm (npx @clawpump/claw-agent@latest)…")
    npx = shutil.which("npx")
    if not npx:
        print("✗ npx (Node.js) not found. Install Node.js, then run:")
        print("    npx @clawpump/claw-agent@latest")
        sys.exit(1)
    try:
        subprocess.run([npx, "-y", "@clawpump/claw-agent@latest"], check=True)
    except subprocess.CalledProcessError as exc:
        print(f"✗ Update failed (exit {exc.returncode}). Try manually:")
        print("    npx @clawpump/claw-agent@latest")
        sys.exit(1)
    print("✓ ClawPump agent updated. Restart your session with `claw`.")
    return True


# ── Model picker: promoted providers ──────────────────────────────────────
# ClawPump pins UsePod ("Pod") to the top of the /model + /provider picker so
# users can discover it. UsePod is a plugin api-key provider, so it can't be
# quick-switched like a configured provider — selecting it instead triggers a
# guided setup (the picker handler keys off the ``clawpump_setup`` flag and
# hands the agent a "configure Pod" instruction). No-op on vanilla Hermes.
PICKER_PROMOTED_PROVIDER = "usepod"
# Honest, defensible value-prop (no fabricated savings %). Swap in a real,
# backed figure here if/when there is one.
PICKER_PROMOTED_TAGLINE = "pay-per-use USDC from your ClawPump wallet"
PICKER_PROMOTED_DISPLAY = "Pod"


def promote_picker_providers(ctx: Any, providers: Any) -> Any:
    """Pin the promoted provider (UsePod) to the top of the model picker.

    Adds a Pod row (seeded with the provider's fallback models) tagged with
    ``clawpump_setup`` so the picker routes its selection to the guided setup
    flow rather than a (failing) quick-switch. Idempotent; returns the list
    unchanged on any error so the picker never breaks.
    """
    try:
        rows = list(providers or [])
    except Exception:
        return providers

    slug = PICKER_PROMOTED_PROVIDER
    existing = next(
        (r for r in rows if isinstance(r, dict) and r.get("slug") == slug), None
    )
    others = [
        r for r in rows if not (isinstance(r, dict) and r.get("slug") == slug)
    ]

    if existing is None:
        models = []
        try:
            from providers import get_provider_profile

            pp = get_provider_profile(slug)
            models = list(getattr(pp, "fallback_models", ()) or [])
        except Exception:
            models = []
        existing = {
            "slug": slug,
            "name": PICKER_PROMOTED_DISPLAY,
            "models": models,
            "total_models": len(models),
            "is_current": False,
            "authenticated": False,
        }

    # Selecting Pod always routes to setup (it can't be quick-switched).
    existing["clawpump_setup"] = True
    name = str(existing.get("name") or PICKER_PROMOTED_DISPLAY)
    if PICKER_PROMOTED_TAGLINE not in name:
        existing["name"] = f"{name}  ·  {PICKER_PROMOTED_TAGLINE}"

    return [existing] + others


def usepod_setup_request_message() -> str:
    """The instruction enqueued to the agent when a user picks Pod in the
    picker but it isn't configured — drives the step-by-step setup + funding."""
    return (
        "I picked Pod (UsePod) in the model picker but it isn't set up yet. "
        "Walk me through configuring it: (1) ask how much USDC to put on the pod "
        "(e.g. 5) — optionally check get_balance first; (2) ask which ClawPump "
        "agent wallet should fund it — call list_agents and let me pick one by "
        "agent_id; (3) once I approve the amount, call usepod_provision with that "
        "amount, the chosen agent_id, and confirm_deposit: true. It registers a "
        "fresh pod and funds it in one call. I do NOT need to paste anything: the "
        "moment usepod_provision returns the api_token, Hermes auto-applies it "
        "(writes USEPOD_API_KEY) and switches this session onto Pod automatically. "
        "Just confirm the amount before the on-chain spend and report the funding "
        "signature."
    )


# ── UsePod "Pod" auto-apply (downstream) ──────────────────────────────────
# When the agent calls the ClawPump MCP tool ``usepod_provision`` it gets back
# ``{api_token, deposit_code, amount, signature, funding_error}``. Instead of
# telling the user to paste the api_token via ``claw model``, the CLI intercepts
# that result (cli.py ``_on_tool_complete``), persists the token, and switches
# the live session onto Pod. These helpers hold the downstream-owned logic so
# the cli.py touch points stay tiny and no-op on vanilla Hermes.
USEPOD_PROVISION_TOOL_SUFFIX = "usepod_provision"


def _is_clawpump_provision_tool(name: str) -> bool:
    """True only for the ClawPump MCP's usepod_provision tool.

    The runtime names MCP tools ``mcp_<server>_<tool>`` — the remote entry is
    ``mcp_clawpump_usepod_provision`` and the stdio entry
    ``mcp_clawpump_stdio_usepod_provision``; both start with ``mcp_clawpump``.
    Binding to that namespace (rather than a bare ``endswith``) keeps a
    differently-named MCP server from minting a result that auto-rewrites the
    user's inference credential.
    """
    n = str(name or "")
    if n == USEPOD_PROVISION_TOOL_SUFFIX:
        return True
    return n.startswith("mcp_clawpump") and n.endswith(USEPOD_PROVISION_TOOL_SUFFIX)


def _unwrap_provision_payload(value: Any, _depth: int = 0):
    """Return the innermost dict carrying ``api_token``, unwrapping envelopes.

    Hermes' MCP client wraps a tool's text result as ``{"result": "<json>"}``
    (and ``{"result": ..., "structuredContent": {...}}`` when the server sends
    structured output) — see ``tools/mcp_tool.py``. The provision JSON therefore
    arrives nested and string-escaped, so we re-parse ``result`` /
    ``structuredContent`` until we find the object with the token.
    """
    if _depth > 4:
        return None
    if isinstance(value, str):
        import json

        try:
            value = json.loads(value)
        except Exception:
            return None
    if not isinstance(value, dict):
        return None
    if value.get("api_token"):
        return value
    for key in ("structuredContent", "result", "data"):
        if key in value:
            inner = _unwrap_provision_payload(value[key], _depth + 1)
            if inner is not None:
                return inner
    return None


def usepod_provision_token(function_name: str, function_result: Any):
    """Extract ``(api_token, deposit_code)`` from a ``usepod_provision`` result.

    Returns ``None`` unless *function_name* is the ClawPump MCP's
    usepod_provision tool AND the result carries a usable ``api_token``.
    Tolerant of the result arriving as a dict, a JSON string, or the
    ``{"result": "<escaped json>"}`` envelope Hermes' MCP client emits.
    """
    if not _is_clawpump_provision_tool(function_name):
        return None

    api_token = ""
    deposit_code = ""
    payload = _unwrap_provision_payload(function_result)
    if isinstance(payload, dict):
        api_token = str(payload.get("api_token") or "").strip()
        deposit_code = str(payload.get("deposit_code") or "").strip()

    # Last-resort fallback: dig the fields straight out of the raw text. The
    # quotes may be backslash-escaped (the JSON is a string value inside the
    # ``{"result": "..."}`` envelope), so tolerate leading backslashes.
    if not api_token and isinstance(function_result, str):
        import re

        m = re.search(r'\\*"api_token\\*"\s*:\s*\\*"([^"\\]+)', function_result)
        if m:
            api_token = m.group(1).strip()
        m = re.search(r'\\*"deposit_code\\*"\s*:\s*\\*"([0-9a-fA-F]{16})', function_result)
        if m:
            deposit_code = m.group(1).strip()

    if not api_token:
        return None
    # A funding_error means the deposit failed but the pod/token are still
    # valid — applying the token is exactly right (the user funds later).
    return (api_token, deposit_code)


def usepod_pod_switch_target(api_token: str, current_model: str = ""):
    """Return ``(model, provider, base_url)`` to switch onto for a Pod token.

    Keeps the user's current model only when the pod's LIVE catalog actually
    serves it; otherwise picks a pod-served model. Using the live catalog (not
    the static ``fallback_models``) matters: the static list includes names like
    ``gpt-5.5`` that the pod does NOT serve, so keeping the user's old model
    there left them on a model the pod can't run — the runtime then fell back to
    that model's native provider (e.g. Codex) and errored. The secret-bearing
    base_url is derived from the token (never persisted to config.yaml).
    """
    provider = "usepod"
    pp = None
    try:
        from providers import get_provider_profile

        pp = get_provider_profile(provider)
    except Exception:
        pp = None

    # Live catalog first (what the pod really serves), then the static list.
    models = []
    try:
        if pp is not None and api_token:
            live = pp.fetch_models(api_key=api_token)
            if live:
                models = list(live)
    except Exception:
        models = []
    if not models:
        models = list(getattr(pp, "fallback_models", ()) or []) if pp else []

    model = ""
    cur = (current_model or "").strip()
    if cur and cur in models:
        model = cur
    elif models:
        # Prefer a sensible default if present, else the first served model.
        for pref in ("claude-opus-4-8", "claude-sonnet-4-6"):
            if pref in models:
                model = pref
                break
        if not model:
            model = models[0]
    else:
        model = "claude-opus-4-8"

    base_url = ""
    try:
        from hermes_cli.auth import _resolve_usepod_base_url

        base_url = _resolve_usepod_base_url(api_token)
    except Exception:
        base_url = ""

    return (model, provider, base_url)


def persist_usepod_credentials(api_token: str, deposit_code: str = "") -> bool:
    """Write USEPOD_API_KEY (+ deposit_code) to ~/.hermes/.env. Returns success."""
    try:
        from hermes_cli.config import save_env_value

        save_env_value("USEPOD_API_KEY", api_token)
        if deposit_code:
            try:
                save_env_value("USEPOD_DEPOSIT_CODE", deposit_code)
            except Exception:
                pass  # deposit_code is a convenience; the token is what matters
        return True
    except Exception:
        return False


# ── Deterministic Pod setup (terminal flow, mirrors the desktop modal) ─────
# Lets the TUI run a clean "pick wallet → amount → confirm → provision" flow
# directly, instead of injecting a chat message and asking the agent to do it.


def _clawpump_mcp_config():
    """Return (server_name, resolved_config) for the ClawPump MCP, or (None, None)."""
    try:
        from hermes_cli.mcp_config import _get_mcp_servers, _resolve_mcp_server_config

        servers = _get_mcp_servers()
        name = next((n for n in ("clawpump", "clawpump-stdio") if n in servers), None)
        if not name:
            return (None, None)
        return (name, _resolve_mcp_server_config(servers[name]))
    except Exception:
        return (None, None)


def _clawpump_tool_struct(tool: str, arguments=None, *, timeout: float = 120):
    """Call a ClawPump MCP tool, returning its structuredContent when present.

    Like ``mcp_config._call_single_tool`` but keeps ``structuredContent`` — the
    machine channel where ``usepod_provision`` puts the REAL api_token (the text
    channel redacts it). Falls back to the parsed text JSON otherwise. Blocking.
    """
    import json as _json

    name, config = _clawpump_mcp_config()
    if not name:
        raise RuntimeError("ClawPump MCP is not configured. Run `claw clawpump setup`.")

    from tools.mcp_tool import (
        _ensure_mcp_loop,
        _run_on_mcp_loop,
        _connect_server,
        _stop_mcp_loop_if_idle,
    )

    _ensure_mcp_loop()
    out = {"data": None, "error": None}

    async def _call():
        import asyncio as _asyncio

        server = await _asyncio.wait_for(_connect_server(name, config), timeout=timeout)
        try:
            result = await server.session.call_tool(tool, arguments=arguments or {})
            text = "".join(b.text for b in (result.content or []) if hasattr(b, "text"))
            if getattr(result, "isError", False):
                out["error"] = text or "MCP tool returned an error"
                return
            sc = getattr(result, "structuredContent", None)
            if isinstance(sc, dict) and sc:
                out["data"] = sc
            else:
                try:
                    out["data"] = _json.loads(text) if text else None
                except Exception:
                    out["data"] = text
        finally:
            await server.shutdown()

    try:
        _run_on_mcp_loop(_call(), timeout=timeout + 30)
    finally:
        try:
            _stop_mcp_loop_if_idle()
        except Exception:
            pass

    if out["error"]:
        raise RuntimeError(out["error"])
    return out["data"]


def usepod_fetch_wallets():
    """Return [{agent_id, name, usdc_balance}] for the user's ClawPump wallets.

    Sorted by USDC balance (most-funded first) so the picker can default to it.
    """
    summaries = _clawpump_tool_struct("get_wallet_summaries", {}, timeout=30)
    if isinstance(summaries, dict):
        summaries = summaries.get("wallets") or summaries.get("summaries") or []
    rows = [w for w in (summaries or []) if isinstance(w, dict) and w.get("agent_id")]

    # Enrich with display names (summaries carry only the agent_id UUID).
    try:
        agents = _clawpump_tool_struct("list_agents", {}, timeout=30)
        if isinstance(agents, dict):
            agents = agents.get("agents") or []
        names = {a.get("id"): a.get("name") for a in (agents or []) if isinstance(a, dict)}
        for w in rows:
            w["name"] = names.get(w.get("agent_id")) or w.get("name")
    except Exception:
        pass

    rows.sort(key=lambda w: (w.get("usdc_balance") or 0), reverse=True)
    return rows


def usepod_provision_call(agent_id: str, amount: float) -> dict:
    """Register + fund a Pod from ``agent_id``'s wallet. Returns the parsed dict
    with the REAL api_token (read from structuredContent). Spends on-chain USDC."""
    raw = _clawpump_tool_struct(
        "usepod_provision",
        {"agent_id": agent_id, "amount": amount, "confirm_deposit": True},
        timeout=120,
    )
    data = raw if isinstance(raw, dict) else {}
    # Token may still arrive nested/escaped — the existing extractor handles it.
    tok = usepod_provision_token("mcp_clawpump_usepod_provision", raw)
    api_token = (tok[0] if tok else "") or str(data.get("api_token") or data.get("token") or "").strip()
    return {
        "api_token": api_token,
        "deposit_code": str(data.get("deposit_code") or "").strip(),
        "signature": str(data.get("signature") or ""),
        "funding_error": str(data.get("funding_error") or ""),
        "amount": data.get("amount"),
    }
