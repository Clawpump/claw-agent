"""Guardrail: the ClawPump distribution overlay must actually take effect.

The rebrand lives in ``hermes_cli/distribution.py`` and is wired into the
upstream-owned modules (``config.py``, ``skin_engine.py``, ``main.py``,
``banner.py``) through small hooks guarded by ``try/except``. That keeps the
upstream files mergeable, but it also means a future upstream refactor that
breaks a hook's anchor would make the overlay **silently no-op** -- shipping a
de-branded build with no ClawPump MCP, no clawpump skin, and no ``clawpump``
command, and *no error*.

These tests fail loudly in exactly that case, so an upstream-sync PR that
breaks a hook goes red in CI before it can be merged/released. See
docs/UPSTREAM_SYNC.md.
"""


def test_distribution_module_present():
    import hermes_cli.distribution as dist

    assert dist.DEFAULT_SKIN == "clawpump"
    assert "clawpump" in dist.EXTRA_SUBCOMMANDS
    assert dist.UPDATE_REPO_URL.endswith("claw-agent.git")


class TestConfigOverlayApplied:
    def test_default_mcp_server_prewired(self):
        from hermes_cli.config import DEFAULT_CONFIG

        servers = DEFAULT_CONFIG.get("mcp_servers") or {}
        assert "clawpump" in servers, (
            "ClawPump MCP server missing from DEFAULT_CONFIG — the config overlay "
            "did not apply (a hook in config.py likely broke on an upstream merge)."
        )
        claw = servers["clawpump"]
        assert claw.get("url", "").startswith("https://")
        assert claw.get("auth") == "oauth"
        assert claw.get("enabled") is True

    def test_default_skin_is_clawpump(self):
        from hermes_cli.config import DEFAULT_CONFIG

        assert (DEFAULT_CONFIG.get("display") or {}).get("skin") == "clawpump"

    def test_clawpump_env_vars_registered(self):
        from hermes_cli.config import OPTIONAL_ENV_VARS

        for key in ("CLAWPUMP_API_KEY", "CLAWPUMP_API_URL", "CLAWPUMP_DEFAULT_AGENT"):
            assert key in OPTIONAL_ENV_VARS, f"{key} missing — env-var overlay not applied"


class TestSkinOverlayApplied:
    def test_clawpump_skin_registered(self):
        from hermes_cli import skin_engine

        names = [s["name"] for s in skin_engine.list_skins()]
        assert "clawpump" in names, "clawpump skin missing — skin overlay not applied"

    def test_clawpump_branding_intact(self):
        from hermes_cli import skin_engine

        skin = skin_engine.load_skin("clawpump")
        assert skin.get_branding("agent_name", "") == "ClawPump"
        assert skin.banner_logo and skin.banner_hero  # ASCII art survived the move

    def test_skin_engine_default_hook_resolved(self):
        # Immutable module-level value set by the hook at import time
        # (unlike the mutable _active_skin_name which tests reassign).
        from hermes_cli import skin_engine

        assert skin_engine._DISTRIBUTION_DEFAULT_SKIN == "clawpump"

    def test_empty_config_falls_back_to_clawpump(self):
        from hermes_cli.skin_engine import get_active_skin_name, init_skin_from_config

        init_skin_from_config({})
        assert get_active_skin_name() == "clawpump"


class TestCliOverlayApplied:
    def test_clawpump_in_builtin_subcommands(self):
        from hermes_cli.main import _BUILTIN_SUBCOMMANDS

        assert "clawpump" in _BUILTIN_SUBCOMMANDS, (
            "clawpump missing from _BUILTIN_SUBCOMMANDS — the subcommand overlay "
            "hook in main.py did not apply; `hermes clawpump ...` would be rejected."
        )

    def test_clawpump_subparser_registers(self):
        import argparse

        from hermes_cli import distribution

        parser = argparse.ArgumentParser()
        sub = parser.add_subparsers(dest="cmd")
        distribution.register_subparsers(sub)
        assert "clawpump" in sub.choices

    def test_self_update_noops_without_bundle(self, tmp_path):
        from hermes_cli import distribution

        # No `.claw-bundle` marker → not an npm install → returns False so the
        # caller falls through to the git/pip/docker update paths.
        assert distribution.try_self_update(str(tmp_path)) is False


class TestBannerOverlayApplied:
    def test_update_check_targets_clawpump_repo(self):
        from hermes_cli import banner

        assert "claw-agent" in banner._UPSTREAM_REPO_URL
