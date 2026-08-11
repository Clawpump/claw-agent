#!/usr/bin/env bash
# sap-mcp-setup.sh — SAP MCP integration setup for ClawPump Agent
#
# ClawPump is a Hermes downstream fork. Its configuration lives in the
# platform-native Hermes home (override via HERMES_HOME), resolved by Hermes'
# get_hermes_home(). This script merges the SAP MCP catalog server and the
# local sap_payments x402 bridge into that config WITHOUT clobbering existing
# hardening such as enabled: false or tools.include. It updates only the
# transport keys it owns, then writes via Hermes save_config().
#
# Usage:
#   ./scripts/sap-mcp-setup.sh           # interactive wizard
#   ./scripts/sap-mcp-setup.sh --repair  # repair bridge only, keep profile
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

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
while [ "$#" -gt 0 ]; do
  case "$1" in
    --repair)
      REPAIR_ONLY=true
      ;;
    -h|--help)
      sed -n '1,16p' "$0"
      exit 0
      ;;
    *)
      warn "Unknown argument: $1"
      echo "Usage: $0 [--repair]" >&2
      exit 2
      ;;
  esac
  shift
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    warn "$1 is required but was not found on PATH."
    exit 1
  fi
}

require_cmd python3
require_cmd node
require_cmd npx

# Resolve ClawPump/Hermes home through Hermes' own platform-aware helper.
if [ -n "${HERMES_HOME:-}" ]; then
  CLAWPUMP_HOME="$HERMES_HOME"
else
  CLAWPUMP_HOME="$(PYTHONPATH="$REPO_ROOT" python3 - <<'PY'
from hermes_constants import get_hermes_home
print(get_hermes_home())
PY
)"
fi
export HERMES_HOME="$CLAWPUMP_HOME"
CLAWPUMP_CONFIG="$CLAWPUMP_HOME/config.yaml"
CLAWPUMP_SKILLS="$CLAWPUMP_HOME/skills"

# --- 1. Ensure home exists ------------------------------------------------
if [ ! -d "$CLAWPUMP_HOME" ]; then
  warn "ClawPump/Hermes home not found at $CLAWPUMP_HOME"
  warn "Install ClawPump first, or set HERMES_HOME to your ClawPump home."
  warn "See: https://github.com/Clawpump/claw-agent"
  exit 1
fi

mkdir -p "$CLAWPUMP_HOME"

# --- 2. Merge SAP MCP + sap_payments into config.yaml --------------------
# Parse-and-merge (never append a duplicate top-level key) so existing
# mcp_servers entries (clawpump, linear, ...) are preserved.
merge_config() {
  SAP_MCP_HOSTED_URL="$SAP_MCP_HOSTED_URL" \
  SAP_MCP_PINNED="$SAP_MCP_PINNED" \
  CLAWPUMP_CONFIG="$CLAWPUMP_CONFIG" \
  PYTHONPATH="$REPO_ROOT" \
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

if raw.strip() and data is None:
    sys.stderr.write(
        f"[SAP MCP] {path} contains no YAML mapping; aborting to avoid discarding comments-only config.\n"
    )
    sys.exit(1)

if not isinstance(data, dict):
    sys.stderr.write(
        f"[SAP MCP] {path} does not contain a top-level YAML mapping; aborting to avoid data loss.\n"
    )
    sys.exit(1)

from hermes_cli.config import is_managed, managed_error, save_config

if is_managed():
    managed_error("configure SAP MCP")
    sys.exit(1)

servers = data.get("mcp_servers")
if not isinstance(servers, dict):
    servers = {}
    data["mcp_servers"] = servers

legacy = servers.get("sap")
if (
    "sap-mcp" not in servers
    and isinstance(legacy, dict)
    and legacy.get("url") == hosted_url
):
    servers["sap-mcp"] = servers.pop("sap")

def merge_entry(key, updates):
    entry = servers.get(key)
    if not isinstance(entry, dict):
        entry = {}
    entry.update(updates)
    servers[key] = entry
    return entry

merge_entry("sap-mcp", {"url": hosted_url})
payments = merge_entry("sap_payments", {
    "command": "npx",
    "args": ["--yes", "--package", pinned, "sap-mcp-server"],
})
env = payments.get("env")
if not isinstance(env, dict):
    env = {}
env.update({
    "SAP_MCP_PAYMENTS_BRIDGE_ONLY": "true",
    "SAP_LOG_LEVEL": "info",
})
payments["env"] = env

path.parent.mkdir(parents=True, exist_ok=True)
save_config(data)
print(f"[SAP MCP] merged sap-mcp + sap_payments into {path}")
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
echo "  2. Call sap_discover_agents with { protocol: 'clawpump' }"
echo "  3. For skills or on-chain registration, explicitly enable write/paid tools:"
echo "     hermes mcp configure sap-mcp"
echo "  4. Then call sap_skills_install or sap_payments_register_agent only after opt-in"
