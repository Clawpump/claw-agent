#!/usr/bin/env bash
# sap-mcp-setup.sh — SAP MCP integration setup for ClawPump Agent
#
# ClawPump is a Hermes downstream fork. Its configuration lives in
# ~/.hermes/config.yaml (override via HERMES_HOME), resolved by Hermes'
# get_hermes_home(). This script merges the SAP MCP hosted server and the
# local sap_payments x402 bridge into that config WITHOUT clobbering any
# existing mcp_servers entries: it parses the YAML, merges the two keys
# into the existing mcp_servers mapping, and writes it back. A second
# top-level mcp_servers: key is never appended.
#
# Usage:
#   ./scripts/sap-mcp-setup.sh           # interactive wizard
#   ./scripts/sap-mcp-setup.sh --repair  # repair bridge only, keep profile
set -euo pipefail

# Resolve ClawPump/Hermes home (matches Hermes get_hermes_home()).
CLAWPUMP_HOME="${HERMES_HOME:-$HOME/.hermes}"
CLAWPUMP_CONFIG="$CLAWPUMP_HOME/config.yaml"
CLAWPUMP_SKILLS="$CLAWPUMP_HOME/skills"

# Pin a known-good version instead of floating @latest. A machine that is
# about to receive a wallet must not run whatever is published at HEAD.
SAP_MCP_VERSION="0.9.68"
SAP_MCP_PACKAGE="@oobe-protocol-labs/sap-mcp-server"
SAP_MCP_PINNED="$SAP_MCP_PACKAGE@$SAP_MCP_VERSION"
SAP_MCP_HOSTED_URL="https://mcp.sap.oobeprotocol.ai/mcp"

# Colors (disabled if not a TTY)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  CYAN='\033[0;36m'
  NC='\033[0m'
else
  GREEN='' YELLOW='' CYAN='' NC=''
fi

info() { echo -e "${CYAN}[SAP MCP]${NC} $*"; }
ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

REPAIR_ONLY=false
if [ "${1:-}" = "--repair" ]; then
  REPAIR_ONLY=true
fi

# --- 1. Ensure home exists ------------------------------------------------
if [ ! -d "$CLAWPUMP_HOME" ]; then
  warn "ClawPump/Hermes home not found at $CLAWPUMP_HOME"
  warn "Install ClawPump first, or set HERMES_HOME to your ClawPump home."
  warn "See: https://github.com/Clawpump/claw-agent"
  exit 1
fi

mkdir -p "$CLAWPUMP_HOME"
touch "$CLAWPUMP_CONFIG"

# --- 2. Merge SAP MCP + sap_payments into config.yaml --------------------
# Parse-and-merge (never append a duplicate top-level key) so existing
# mcp_servers entries (clawpump, linear, ...) are preserved.
merge_config() {
  SAP_MCP_HOSTED_URL="$SAP_MCP_HOSTED_URL" \
  SAP_MCP_PINNED="$SAP_MCP_PINNED" \
  CLAWPUMP_CONFIG="$CLAWPUMP_CONFIG" \
  python3 - <<'PY'
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.stderr.write(
        "[SAP MCP] PyYAML is required to safely merge config.yaml. "
        "Install it (pip install pyyaml) or merge manually.\n"
    )
    sys.exit(1)

path = Path(os.environ["CLAWPUMP_CONFIG"])
hosted_url = os.environ["SAP_MCP_HOSTED_URL"]
pinned = os.environ["SAP_MCP_PINNED"]
raw = path.read_text() if path.exists() else ""

try:
    data = yaml.safe_load(raw) if raw.strip() else {}
except yaml.YAMLError as exc:
    sys.stderr.write(
        f"[SAP MCP] {path} is not valid YAML; aborting to avoid data loss: {exc}\n"
    )
    sys.exit(1)

if not isinstance(data, dict):
    data = {}

servers = data.get("mcp_servers")
if not isinstance(servers, dict):
    servers = {}
    data["mcp_servers"] = servers

servers["sap"] = {
    "url": hosted_url,
    "transport": "streamable-http",
}
servers["sap_payments"] = {
    "command": "npx",
    "args": ["--yes", "--package", pinned, "sap-mcp-server"],
    "env": {
        "SAP_MCP_PAYMENTS_BRIDGE_ONLY": "true",
        "SAP_LOG_LEVEL": "info",
    },
}

path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(yaml.safe_dump(data, sort_keys=False, default_flow_style=False))
print(f"[SAP MCP] merged sap + sap_payments into {path}")
PY
}

merge_config
ok "SAP MCP server entries present in $CLAWPUMP_CONFIG"

# --- 3. Create skills directory ------------------------------------------
mkdir -p "$CLAWPUMP_SKILLS"
ok "Skills directory ready: $CLAWPUMP_SKILLS"

# --- 4. Run wizard or repair ---------------------------------------------
if [ "$REPAIR_ONLY" = true ]; then
  info "Running SAP MCP payment bridge repair (keeps existing profile)..."
  npx --yes --package "$SAP_MCP_PINNED" sap-mcp-config repair
else
  info "Running SAP MCP wizard (interactive)..."
  info "Choose 'ClawPump' when prompted for your runtime."
  npx --yes --package "$SAP_MCP_PINNED" sap-mcp-config wizard
fi

ok "SAP MCP integration complete."
echo ""
echo "Next steps:"
echo "  1. Restart your ClawPump agent so the new MCP servers load"
echo "  2. Call sap_skills_install with { agent: 'clawpump', confirm: true }"
echo "  3. Call sap_discover_agents with { protocol: 'clawpump' }"
echo "  4. Register your agent on-chain: sap_payments_register_agent"
