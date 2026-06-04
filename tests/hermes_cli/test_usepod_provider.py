"""Tests for the UsePod provider (usepod.ai).

UsePod is a drop-in OpenAI-compatible inference marketplace whose defining
quirk is that it authenticates by the token embedded in the request *path*
(``/proxy/<token>/v1/...``) and ignores the Authorization header. The user
only pastes a token; the base URL is derived from it. These tests pin that
key-in-path derivation across every resolution surface.
"""

import os

import pytest

from hermes_cli.auth import (
    PROVIDER_REGISTRY,
    _resolve_usepod_base_url,
    get_api_key_provider_status,
    resolve_api_key_provider_credentials,
)


# Other provider env vars to clear so auto-detect / pool resolution does not
# pick up an unrelated key from the developer's environment.
_OTHER_PROVIDER_KEYS = (
    "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "DEEPSEEK_API_KEY",
    "GOOGLE_API_KEY", "GEMINI_API_KEY", "DASHSCOPE_API_KEY",
    "XAI_API_KEY", "KIMI_API_KEY", "MINIMAX_API_KEY",
    "OPENROUTER_API_KEY", "GLM_API_KEY", "ZAI_API_KEY",
    "HERMES_INFERENCE_PROVIDER",
)


@pytest.fixture
def usepod_env(monkeypatch):
    """Isolated env: only USEPOD_API_KEY set, base-url override cleared."""
    for key in _OTHER_PROVIDER_KEYS:
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("USEPOD_BASE_URL", raising=False)
    monkeypatch.setenv("USEPOD_API_KEY", "tok-deadbeef-uuid")
    return "tok-deadbeef-uuid"


# =============================================================================
# Profile registration
# =============================================================================


class TestUsePodProfile:
    def test_profile_registered(self):
        from providers import get_provider_profile

        p = get_provider_profile("usepod")
        assert p is not None
        assert p.name == "usepod"
        assert p.auth_type == "api_key"

    def test_metadata(self):
        from providers import get_provider_profile

        p = get_provider_profile("usepod")
        assert p.display_name == "UsePod"
        assert p.get_hostname() == "api.usepod.ai"
        # Token lives in the path → the static /models probe can't reach the
        # per-token catalog, so doctor must skip it.
        assert p.supports_health_check is False
        assert p.fallback_models  # non-empty offline picker list

    def test_registry_entry(self):
        assert "usepod" in PROVIDER_REGISTRY
        pc = PROVIDER_REGISTRY["usepod"]
        assert pc.auth_type == "api_key"
        assert pc.api_key_env_vars == ("USEPOD_API_KEY",)
        assert pc.base_url_env_var == "USEPOD_BASE_URL"


# =============================================================================
# Picker presence
# =============================================================================


class TestUsePodCanonicalProvider:
    def test_in_canonical_providers(self):
        from hermes_cli.models import CANONICAL_PROVIDERS

        slugs = [p.slug for p in CANONICAL_PROVIDERS]
        assert "usepod" in slugs

    def test_label(self):
        from hermes_cli.models import _PROVIDER_LABELS

        assert _PROVIDER_LABELS["usepod"] == "UsePod"

    def test_cli_dispatch_routes_through_api_key_flow(self):
        # The catch-all in select_provider_and_model dispatches profile
        # api_key providers to _model_flow_api_key_provider.
        from hermes_cli.main import _is_profile_api_key_provider

        assert _is_profile_api_key_provider("usepod") is True


# =============================================================================
# Key-in-path base URL derivation
# =============================================================================


class TestUsePodBaseUrlDerivation:
    def test_token_embedded_in_path(self):
        assert (
            _resolve_usepod_base_url("abc-123")
            == "https://api.usepod.ai/proxy/abc-123/v1"
        )

    def test_no_token_returns_proxy_root(self):
        # Degrades gracefully rather than producing a malformed URL.
        assert _resolve_usepod_base_url("") == "https://api.usepod.ai/proxy"

    def test_env_override_wins(self):
        assert (
            _resolve_usepod_base_url("abc-123", "https://self.host/proxy/x/v1/")
            == "https://self.host/proxy/x/v1"
        )

    def test_resolve_credentials_derives_url(self, usepod_env):
        creds = resolve_api_key_provider_credentials("usepod")
        assert creds["api_key"] == usepod_env
        assert creds["base_url"] == f"https://api.usepod.ai/proxy/{usepod_env}/v1"

    def test_status_derives_url(self, usepod_env):
        status = get_api_key_provider_status("usepod")
        assert status["configured"] is True
        assert status["base_url"] == f"https://api.usepod.ai/proxy/{usepod_env}/v1"

    def test_status_not_configured_without_key(self, monkeypatch):
        for key in _OTHER_PROVIDER_KEYS:
            monkeypatch.delenv(key, raising=False)
        monkeypatch.delenv("USEPOD_API_KEY", raising=False)
        assert get_api_key_provider_status("usepod")["configured"] is False


# =============================================================================
# Runtime resolution (the path the agent actually uses)
# =============================================================================


class TestUsePodRuntimeResolution:
    def test_env_var_path(self, usepod_env):
        from hermes_cli.runtime_provider import resolve_runtime_provider

        r = resolve_runtime_provider(requested="usepod")
        assert r["provider"] == "usepod"
        assert r["api_mode"] == "chat_completions"
        assert r["api_key"] == usepod_env
        assert r["base_url"] == f"https://api.usepod.ai/proxy/{usepod_env}/v1"

    def test_explicit_api_key_override(self, usepod_env):
        from hermes_cli.runtime_provider import resolve_runtime_provider

        r = resolve_runtime_provider(
            requested="usepod", explicit_api_key="explicit-xyz"
        )
        # base_url must follow the explicit token, not the stored one.
        assert r["api_key"] == "explicit-xyz"
        assert r["base_url"] == "https://api.usepod.ai/proxy/explicit-xyz/v1"

    def test_self_hosted_base_url_override(self, usepod_env, monkeypatch):
        from hermes_cli.runtime_provider import resolve_runtime_provider

        monkeypatch.setenv("USEPOD_BASE_URL", "https://my.gateway/proxy/k/v1")
        r = resolve_runtime_provider(requested="usepod")
        assert r["base_url"] == "https://my.gateway/proxy/k/v1"


# =============================================================================
# Model catalog fetch (token in path, not header)
# =============================================================================


class TestUsePodFetchModels:
    def test_fetch_models_hits_per_token_endpoint(self, monkeypatch):
        from providers import get_provider_profile

        captured = {}

        class _Resp:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return b'{"data": [{"id": "gpt-5.5"}, {"id": "claude-opus-4-8"}]}'

        def _fake_urlopen(req, timeout=8.0):
            captured["url"] = req.full_url
            return _Resp()

        monkeypatch.setattr("urllib.request.urlopen", _fake_urlopen)

        p = get_provider_profile("usepod")
        models = p.fetch_models(api_key="tok-xyz")
        assert models == ["gpt-5.5", "claude-opus-4-8"]
        assert captured["url"] == "https://api.usepod.ai/proxy/tok-xyz/v1/models"

    def test_fetch_models_without_key_returns_none(self):
        from providers import get_provider_profile

        p = get_provider_profile("usepod")
        assert p.fetch_models(api_key="") is None


# =============================================================================
# Agent init smoke test
# =============================================================================


class TestUsePodAgentInit:
    def test_run_agent_imports(self):
        import importlib

        importlib.import_module("run_agent")
