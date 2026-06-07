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
