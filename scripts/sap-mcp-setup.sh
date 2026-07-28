#!/usr/bin/env bash
# sap-mcp-setup.sh — SAP MCP integration setup for ClawPump Agent
#
# This script configures SAP MCP as an optional coordination + payment layer
# for a ClawPump Agent installation. It:
#   1. Adds the hosted SAP MCP server to ~/.clawpump/config.yaml
#   2. Adds the local sap_payments stdio bridge for x402 challenge signing
#   3. Installs SAP MCP skills into ~/.clawpump/skills/
#   4. Runs the SAP MCP wizard (interactive) to create a profile + wallet
#
# Usage:
#   ./scripts/sap-mcp-setup.sh           # interactive wizard
#   ./scripts/sap-mcp-setup.sh --repair  # repair config only, keep profile
#
set -euo pipefail

CLAWPUMP_HOME="${CLAWPUMP_HOME:-$HOME/.clawpump}"
CLAWPUMP_CONFIG="$CLAWPUMP_HOME/config.yaml"
CLAWPUMP_SKILLS="$CLAWPUMP_HOME/skills"

SAP_MCP_PACKAGE="@oobe-protocol-labs/sap-mcp-server"
SAP_MCP_HOSTED_URL="https://mcp.sap.oobeprotocol.ai/mcp"
SAP_MCP_LATEST="${SAP_MCP_PACKAGE}@latest"

# Colors (disabled if not a TTY)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  CYAN='\033[0;36m'
  NC='\033[0m'
else
  GREEN='' YELLOW='' CYAN='' NC=''
fi

info()  { echo -e "${CYAN}[SAP MCP]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }

REPAIR_ONLY=false
if [ "${1:-}" = "--repair" ]; then
  REPAIR_ONLY=true
fi

# --- 1. Ensure config exists ------------------------------------------------

if [ ! -d "$CLAWPUMP_HOME" ]; then
  warn "ClawPump home not found at $CLAWPUMP_HOME"
  warn "Install ClawPump first: curl -fsSL https://raw.githubusercontent.com/Clawpump/claw-agent/main/scripts/install.sh | bash"
  exit 1
fi

mkdir -p "$CLAWPUMP_HOME"
touch "$CLAWPUMP_CONFIG"

# --- 2. Add SAP MCP + sap_payments to config.yaml ----------------------------

add_yaml_block() {
  local block="$1"
  if ! grep -q "sap:" "$CLAWPUMP_CONFIG" 2>/dev/null; then
    echo "" >> "$CLAWPUMP_CONFIG"
    echo "$block" >> "$CLAWPUMP_CONFIG"
    ok "Added SAP MCP server to $CLAWPUMP_CONFIG"
  else
    warn "SAP MCP entry already exists in $CLAWPUMP_CONFIG — skipping"
  fi
}

SAP_YAML=$(cat <<EOF
mcp_servers:
  sap:
    url: "$SAP_MCP_HOSTED_URL"
    transport: "streamable-http"
  sap_payments:
    command: "npx"
    args:
      - "--yes"
      - "--package"
      - "$SAP_MCP_LATEST"
      - "sap-mcp-server"
    env:
      SAP_MCP_PAYMENTS_BRIDGE_ONLY: "true"
      SAP_LOG_LEVEL: "info"
EOF
)

add_yaml_block "$SAP_YAML"

# --- 3. Create skills directory ----------------------------------------------

mkdir -p "$CLAWPUMP_SKILLS"
ok "Skills directory ready: $CLAWPUMP_SKILLS"

# --- 4. Run wizard or repair -------------------------------------------------

if [ "$REPAIR_ONLY" = true ]; then
  info "Running SAP MCP config repair (keeps existing profile)..."
  npx --yes --package "$SAP_MCP_LATEST" sap-mcp-config repair --runtime clawpump
else
  info "Running SAP MCP wizard (interactive)..."
  info "Choose 'ClawPump' when prompted for your runtime."
  npx --yes --package "$SAP_MCP_LATEST" sap-mcp-config wizard
fi

ok "SAP MCP integration complete."
echo ""
echo "Next steps:"
echo "  1. Restart your ClawPump agent so the new MCP servers load"
echo "  2. Call sap_skills_install with { agent: 'clawpump', confirm: true }"
echo "  3. Call sap_discover_agents with { protocol: 'clawpump' }"
echo "  4. Register your agent on-chain: sap_payments_register_agent"