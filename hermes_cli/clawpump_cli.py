"""``hermes clawpump`` — one-command install/auth for the ClawPump MCP.

ClawPump ships its full feature set (131 tools) as an MCP server, bundled in
the Hermes catalog as two entries:

  - ``clawpump``        remote OAuth over Streamable HTTP (browser, paste cpk_*)
  - ``clawpump-stdio``  local ``npx @clawpump/agents`` (CLAWPUMP_API_KEY)

This command is a thin convenience layer over ``hermes mcp …`` — it picks the
transport, stores the key for the stdio path, and wraps install / login /
configure / status. Internals stay Hermes; nothing here renames anything.

Subcommands:
  setup    Install & authenticate ClawPump (choose remote or stdio).
  login    Re-run the browser OAuth flow (remote entry).
  status   Show install / token / key state.
  tools    Re-select which ClawPump tools are enabled.
"""
from __future__ import annotations

import argparse
import sys

from hermes_cli.colors import Colors, color

DASHBOARD_KEY_URL = "https://agents.clawpump.tech/dashboard/api"
REMOTE_ENTRY = "clawpump"
STDIO_ENTRY = "clawpump-stdio"


def _configured_entry() -> str | None:
    """Return whichever ClawPump catalog entry is in config.yaml, if any."""
    try:
        from hermes_cli.config import load_config
        servers = (load_config() or {}).get("mcp_servers") or {}
    except Exception:
        servers = {}
    for name in (REMOTE_ENTRY, STDIO_ENTRY):
        if name in servers:
            return name
    return None


def _tokens_present(name: str) -> bool:
    try:
        from hermes_cli.mcp_config import _oauth_tokens_present
        return bool(_oauth_tokens_present(name))
    except Exception:
        return False


def _install(identifier: str) -> int:
    from hermes_cli.mcp_picker import install_by_name
    return install_by_name(identifier)


def _cmd_setup(args) -> int:
    """Install + authenticate. Interactive transport pick; remote is default."""
    print()
    print(color("  ClawPump setup", Colors.GREEN + Colors.BOLD))
    print(color("  ──────────────", Colors.GREEN))
    print("  ClawPump's 131 tools (agents, trading, perps, DCA, lending,")
    print("  token launch, marketplace, predictions, gift cards, agent")
    print("  mail, intelligence) come in through an MCP server. Two ways")
    print("  to connect:")
    print()
    print(f"    1) {color('Remote', Colors.GREEN)}  — browser login, paste your cpk_* key (recommended)")
    print(f"    2) {color('Stdio', Colors.GREEN)}   — local npx, store the cpk_* key in ~/.hermes/.env")
    print()

    choice = "1"
    if sys.stdin.isatty():
        try:
            choice = (input("  Choose transport [1]: ").strip() or "1")
        except (EOFError, KeyboardInterrupt):
            print()
            return 1

    if choice == "2":
        return _setup_stdio()
    return _setup_remote()


def _setup_remote() -> int:
    print()
    print(color(f"  Installing the remote ClawPump MCP ({REMOTE_ENTRY})…", Colors.CYAN))
    print("  A browser opens on first connect — just log in with ClawPump and it")
    print(f"  connects automatically (no key to copy; pasting a cpk_* still works: {DASHBOARD_KEY_URL})")
    rc = _install(REMOTE_ENTRY)
    if rc == 0:
        print()
        print(color("  ✓ Installed. Restart your Hermes session to load the ClawPump tools.", Colors.GREEN))
        print(color("    Re-auth any time with:  hermes clawpump login", Colors.DIM))
    return rc


def _setup_stdio() -> int:
    import getpass
    from hermes_cli.config import save_env_value, get_env_value

    existing = ""
    try:
        existing = get_env_value("CLAWPUMP_API_KEY") or ""
    except Exception:
        existing = ""

    print()
    if existing:
        print(color("  A CLAWPUMP_API_KEY is already stored.", Colors.DIM))
    if sys.stdin.isatty():
        prompt = "  ClawPump API key (cpk_…, blank to keep existing): " if existing else \
                 f"  ClawPump API key (cpk_…, create at {DASHBOARD_KEY_URL}): "
        try:
            key = getpass.getpass(prompt).strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 1
        if key:
            if not key.startswith("cpk_"):
                print(color("  ⚠ Keys normally start with 'cpk_'. Saving anyway.", Colors.YELLOW))
            save_env_value("CLAWPUMP_API_KEY", key)
            print(color("  ✓ Saved CLAWPUMP_API_KEY to ~/.hermes/.env", Colors.GREEN))
        elif not existing:
            print(color("  ✗ No key provided — aborting stdio setup.", Colors.RED))
            return 1
    elif not existing:
        print(color("  ✗ CLAWPUMP_API_KEY not set and no TTY to prompt. "
                    "Set it in ~/.hermes/.env first.", Colors.RED))
        return 1

    import shutil
    if not shutil.which("npx"):
        print(color("  ⚠ 'npx' not found on PATH — install Node.js for the stdio transport.", Colors.YELLOW))

    print()
    print(color(f"  Installing the stdio ClawPump MCP ({STDIO_ENTRY})…", Colors.CYAN))
    rc = _install(STDIO_ENTRY)
    if rc == 0:
        print()
        print(color("  ✓ Installed. Restart your Hermes session to load the ClawPump tools.", Colors.GREEN))
    return rc


def _cmd_login(args) -> int:
    entry = _configured_entry()
    if entry is None:
        print(color("  ClawPump isn't installed yet — run `hermes clawpump setup`.", Colors.YELLOW))
        return 1
    if entry != REMOTE_ENTRY:
        print(color(f"  '{entry}' uses an API key, not OAuth. "
                    "Update it in ~/.hermes/.env (CLAWPUMP_API_KEY).", Colors.YELLOW))
        return 1
    from hermes_cli.mcp_config import cmd_mcp_login
    cmd_mcp_login(argparse.Namespace(name=REMOTE_ENTRY))
    return 0


def _cmd_tools(args) -> int:
    entry = _configured_entry()
    if entry is None:
        print(color("  ClawPump isn't installed yet — run `hermes clawpump setup`.", Colors.YELLOW))
        return 1
    from hermes_cli.mcp_config import cmd_mcp_configure
    cmd_mcp_configure(argparse.Namespace(name=entry))
    return 0


def _cmd_status(args) -> int:
    from hermes_cli.config import get_env_value
    entry = _configured_entry()

    print()
    print(color("  ClawPump", Colors.GREEN))
    print(color("  ────────", Colors.GREEN))
    if entry is None:
        print(f"  Status:  {color('not installed', Colors.YELLOW)}")
        print(color(f"  Install: hermes clawpump setup", Colors.DIM))
        return 0

    transport = "remote OAuth" if entry == REMOTE_ENTRY else "stdio (npx)"
    print(f"  Entry:   {color(entry, Colors.GREEN)}  ({transport})")

    if entry == REMOTE_ENTRY:
        if _tokens_present(entry):
            print(f"  Auth:    {color('✓ token present', Colors.GREEN)}")
        else:
            print(f"  Auth:    {color('not authenticated', Colors.YELLOW)} — run `hermes clawpump login`")
    else:
        try:
            has_key = bool(get_env_value("CLAWPUMP_API_KEY"))
        except Exception:
            has_key = False
        print(f"  Key:     {color('✓ CLAWPUMP_API_KEY set', Colors.GREEN) if has_key else color('missing', Colors.YELLOW)}")

    print(color("  Tools:   hermes clawpump tools   (re-select enabled tools)", Colors.DIM))
    return 0


def clawpump_command(args) -> int:
    """Top-level dispatch for `hermes clawpump <subcommand>`."""
    sub = getattr(args, "clawpump_action", None)
    if sub in {None, ""}:
        return _cmd_status(args)
    handler = {
        "setup": _cmd_setup,
        "login": _cmd_login,
        "status": _cmd_status,
        "tools": _cmd_tools,
    }.get(sub)
    if handler is None:
        print(f"Unknown clawpump subcommand: {sub}", file=sys.stderr)
        print("Run `hermes clawpump -h` for usage.", file=sys.stderr)
        return 1
    return handler(args)


def add_parser(subparsers) -> None:
    """Register `hermes clawpump` on the given argparse subparsers object."""
    clawpump_parser = subparsers.add_parser(
        "clawpump",
        help="ClawPump (Solana token launch, trading, perps, DeFi) via MCP",
        description=(
            "Install and authenticate the ClawPump MCP server, then manage which "
            "of its 131 tools are enabled. Subcommands: setup (default: status), "
            "login, status, tools."
        ),
    )
    cp_sub = clawpump_parser.add_subparsers(dest="clawpump_action")
    cp_sub.add_parser("setup", help="Install & authenticate ClawPump (remote or stdio)")
    cp_sub.add_parser("login", help="Re-run the browser OAuth flow (remote entry)")
    cp_sub.add_parser("status", help="Show ClawPump install / token / key state (default)")
    cp_sub.add_parser("tools", help="Re-select which ClawPump tools are enabled")
    clawpump_parser.set_defaults(func=clawpump_command)
