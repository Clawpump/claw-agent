from __future__ import annotations

import os
import stat
import subprocess
from pathlib import Path

import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "sap-mcp-setup.sh"
MANIFEST = REPO_ROOT / "optional-mcps" / "sap-mcp" / "manifest.yaml"


def _write_executable(path: Path, body: str) -> None:
    path.write_text(body, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR)


def _script_env(tmp_path: Path, home: Path) -> dict[str, str]:
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    _write_executable(bin_dir / "node", "#!/usr/bin/env bash\nexit 0\n")
    _write_executable(
        bin_dir / "npx",
        f"#!/usr/bin/env bash\nprintf '%s\\n' \"$*\" >> {tmp_path / 'npx.log'}\nexit 0\n",
    )

    env = os.environ.copy()
    env["HERMES_HOME"] = str(home)
    env["PATH"] = f"{bin_dir}{os.pathsep}{env['PATH']}"
    return env


def test_sap_mcp_setup_preserves_hardened_entries(tmp_path: Path) -> None:
    home = tmp_path / "hermes-home"
    home.mkdir()
    config = home / "config.yaml"
    config.write_text(
        yaml.safe_dump(
            {
                "mcp_servers": {
                    "clawpump": {"command": "npx", "args": ["@clawpump/agents"]},
                    "sap": {
                        "url": "https://mcp.sap.oobeprotocol.ai/mcp",
                        "enabled": False,
                        "tools": {"include": ["sap_discover_agents"]},
                    },
                    "sap_payments": {
                        "enabled": False,
                        "tools": {"include": ["sap_payments_status"]},
                        "env": {"CUSTOM_ENV": "keep-me"},
                    },
                }
            },
            sort_keys=False,
        ),
        encoding="utf-8",
    )

    result = subprocess.run(
        [str(SCRIPT), "--repair"],
        cwd=str(REPO_ROOT),
        env=_script_env(tmp_path, home),
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    merged = yaml.safe_load(config.read_text(encoding="utf-8"))
    servers = merged["mcp_servers"]
    assert "sap" not in servers
    assert servers["sap-mcp"]["url"] == "https://mcp.sap.oobeprotocol.ai/mcp"
    assert servers["sap-mcp"]["enabled"] is False
    assert servers["sap-mcp"]["tools"]["include"] == ["sap_discover_agents"]
    assert servers["sap_payments"]["enabled"] is False
    assert servers["sap_payments"]["tools"]["include"] == ["sap_payments_status"]
    assert servers["sap_payments"]["env"]["CUSTOM_ENV"] == "keep-me"
    assert servers["sap_payments"]["env"]["SAP_MCP_PAYMENTS_BRIDGE_ONLY"] == "true"
    assert servers["sap_payments"]["env"]["SAP_LOG_LEVEL"] == "info"


def test_sap_mcp_setup_refuses_comments_only_config(tmp_path: Path) -> None:
    home = tmp_path / "hermes-home"
    home.mkdir()
    config = home / "config.yaml"
    original = "# keep this hand-written config\n"
    config.write_text(original, encoding="utf-8")

    result = subprocess.run(
        [str(SCRIPT), "--repair"],
        cwd=str(REPO_ROOT),
        env=_script_env(tmp_path, home),
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 1
    assert "comments-only config" in result.stderr
    assert config.read_text(encoding="utf-8") == original


def test_sap_mcp_default_tools_are_read_only() -> None:
    manifest = yaml.safe_load(MANIFEST.read_text(encoding="utf-8"))
    defaults = manifest["tools"]["default_enabled"]

    assert "sap_skills_install" not in defaults
    assert "sap_skills_list" in defaults
    assert "sap_skills_bundle" in defaults
    assert "sap_skills_upgrade_plan" in defaults
