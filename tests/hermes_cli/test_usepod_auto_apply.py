"""ClawPump UsePod ("Pod") auto-apply: the picker→provision→token flow.

When the agent calls the ClawPump MCP tool ``usepod_provision`` and gets back a
pod ``api_token``, the CLI auto-applies it (writes ``USEPOD_API_KEY`` and
switches the session onto Pod) instead of telling the user to paste it via
``claw model``. The pure logic lives in ``hermes_cli.distribution``; these tests
guard it so a regression that silently breaks Pod discovery/funding goes red.

See ``cli.py`` ``_on_tool_complete`` / ``_activate_pending_pod`` for the wiring.
"""

import json

import pytest

from hermes_cli import distribution as dist

# The runtime names the remote tool ``mcp_clawpump_<tool>`` (the stdio entry
# uses ``mcp_clawpump_stdio_<tool>``); matching is by suffix so both work.
PROVISION_TOOL = "mcp_clawpump_usepod_provision"

_OK_RESULT = {
    "api_token": "pod_live_abc123",
    "deposit_code": "0123456789abcdef",
    "amount": "5",
    "signature": "5xSig",
    "funding_error": None,
}


class TestUsepodProvisionToken:
    def test_extracts_token_from_json_string(self):
        tok = dist.usepod_provision_token(PROVISION_TOOL, json.dumps(_OK_RESULT))
        assert tok == ("pod_live_abc123", "0123456789abcdef")

    def test_extracts_token_from_dict(self):
        tok = dist.usepod_provision_token(PROVISION_TOOL, dict(_OK_RESULT))
        assert tok == ("pod_live_abc123", "0123456789abcdef")

    def test_extracts_token_from_real_mcp_result_envelope(self):
        # The shape Hermes' MCP client actually emits (tools/mcp_tool.py): a
        # single text content block wrapped as {"result": "<escaped inner json>"}.
        # This is the production path — it MUST be parsed.
        inner = json.dumps(_OK_RESULT, indent=2)
        envelope = json.dumps({"result": inner})
        tok = dist.usepod_provision_token(PROVISION_TOOL, envelope)
        assert tok == ("pod_live_abc123", "0123456789abcdef")

    def test_extracts_token_from_structured_content_envelope(self):
        # The variant emitted when the server returns structuredContent too.
        envelope = json.dumps({
            "result": "Pod created.",
            "structuredContent": {"api_token": "pod_live_abc123", "deposit_code": "0123456789abcdef"},
        })
        tok = dist.usepod_provision_token(PROVISION_TOOL, envelope)
        assert tok == ("pod_live_abc123", "0123456789abcdef")

    def test_prefers_structured_content_over_redacted_text(self):
        # The exact shape the hardened server emits: the human text REDACTS the
        # api_token, the real token lives only in structuredContent. The
        # extractor must pull the real token (not the redaction marker) and must
        # never surface the placeholder.
        redacted_text = json.dumps({
            "api_token": "<applied automatically by Hermes — hidden>",
            "deposit_code": "0123456789abcdef",
            "note": "Pod created. ...",
        }, indent=2)
        envelope = json.dumps({
            "result": redacted_text,
            "structuredContent": {
                "api_token": "pod_live_real",
                "deposit_code": "0123456789abcdef",
                "note": "Pod created. ...",
            },
        })
        tok = dist.usepod_provision_token(PROVISION_TOOL, envelope)
        assert tok == ("pod_live_real", "0123456789abcdef")
        assert tok[0] != "<applied automatically by Hermes — hidden>"

    def test_matches_stdio_prefix(self):
        tok = dist.usepod_provision_token(
            "mcp_clawpump_stdio_usepod_provision", json.dumps(_OK_RESULT)
        )
        assert tok and tok[0] == "pod_live_abc123"

    def test_ignores_other_tools(self):
        # A different tool (even one returning an api_token-looking blob) is left
        # alone — only usepod_provision results auto-apply.
        assert dist.usepod_provision_token("mcp_clawpump_wallet_transfer", json.dumps(_OK_RESULT)) is None
        assert dist.usepod_provision_token("usepod_deposit", json.dumps(_OK_RESULT)) is None

    def test_ignores_non_clawpump_mcp_server(self):
        # Namespace binding: a usepod_provision result from a DIFFERENT MCP server
        # must NOT auto-rewrite the user's inference credential.
        assert dist.usepod_provision_token("mcp_evil_usepod_provision", json.dumps(_OK_RESULT)) is None

    def test_none_when_no_api_token(self):
        assert dist.usepod_provision_token(PROVISION_TOOL, json.dumps({"deposit_code": "0123456789abcdef"})) is None
        assert dist.usepod_provision_token(PROVISION_TOOL, "not json at all") is None
        assert dist.usepod_provision_token(PROVISION_TOOL, json.dumps({"api_token": "  "})) is None

    def test_funding_error_still_applies_token(self):
        # Register succeeded, funding failed: the pod + token are still valid, so
        # the token must still be applied (the user funds later via usepod_deposit).
        result = dict(_OK_RESULT, funding_error="insufficient USDC", signature=None)
        tok = dist.usepod_provision_token(PROVISION_TOOL, json.dumps(result))
        assert tok == ("pod_live_abc123", "0123456789abcdef")

    def test_regex_fallback_for_wrapped_content(self):
        # MCP content envelope: the JSON is embedded in a larger text blob.
        wrapped = (
            'Pod created. {"api_token":"pod_live_xyz","deposit_code":"00ff11ee22dd33cc"} '
            "Set api_token as USEPOD_API_KEY."
        )
        tok = dist.usepod_provision_token(PROVISION_TOOL, wrapped)
        assert tok == ("pod_live_xyz", "00ff11ee22dd33cc")


class TestUsepodPodSwitchTarget:
    def test_returns_usepod_provider_and_token_derived_base_url(self):
        model, provider, base_url = dist.usepod_pod_switch_target("pod_live_abc123")
        assert provider == "usepod"
        assert model  # never empty — switch_model needs a model name
        # base_url is derived from the token (never persisted to config.yaml).
        assert "pod_live_abc123" in base_url
        assert base_url.startswith("https://api.usepod.ai/proxy/")

    def test_keeps_current_model_when_pod_serves_it(self):
        # claude-opus-4-8 is in the usepod fallback catalog, so a user already on
        # it stays on it rather than being bounced to a different model.
        model, _, _ = dist.usepod_pod_switch_target("tok", current_model="claude-opus-4-8")
        assert model == "claude-opus-4-8"

    def test_falls_back_when_current_model_not_on_pod(self):
        # A model Pod doesn't list (e.g. a Codex-only model) falls back to a
        # known Pod model instead of failing at runtime.
        model, _, _ = dist.usepod_pod_switch_target("tok", current_model="gpt-5.4-codex-only")
        assert model and model != "gpt-5.4-codex-only"


class TestPersistUsepodCredentials:
    def test_writes_api_key_and_deposit_code(self):
        from hermes_cli.config import get_env_value

        assert dist.persist_usepod_credentials("pod_live_abc123", "0123456789abcdef") is True
        assert get_env_value("USEPOD_API_KEY") == "pod_live_abc123"
        assert get_env_value("USEPOD_DEPOSIT_CODE") == "0123456789abcdef"

    def test_token_only_when_no_deposit_code(self):
        from hermes_cli.config import get_env_value

        assert dist.persist_usepod_credentials("pod_live_only") is True
        assert get_env_value("USEPOD_API_KEY") == "pod_live_only"


def test_setup_message_drives_provision_not_manual_paste():
    # The picker's enqueued setup instruction must steer the agent to the new
    # one-call provision flow (amount + agent_id + confirm_deposit) and must NOT
    # tell the user to paste a key via `claw model` (that step is gone).
    msg = dist.usepod_setup_request_message()
    assert "usepod_provision" in msg
    assert "agent_id" in msg
    assert "confirm_deposit" in msg
    assert "claw model" not in msg


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(pytest.main([__file__, "-v"]))
