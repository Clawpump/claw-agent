"""UsePod provider profile.

UsePod (usepod.ai) is a drop-in OpenAI- and Anthropic-compatible inference
marketplace.  Independent operators serve open-weight models (or relay their
own upstream keys) and centralized providers stay available as a fallback;
billing is pay-per-request, settled in USDC from a per-token balance.

Unlike a normal API-key provider, UsePod authenticates by the token embedded
in the request *path* (``/proxy/<token>/v1/...``) and ignores the
Authorization header.  The base URL is therefore DERIVED from the API key
rather than being static — see ``hermes_cli.auth._resolve_usepod_base_url`` and
the ``usepod`` branches in ``resolve_api_key_provider_credentials`` /
``get_api_key_provider_status`` (auth.py) and ``_resolve_explicit_runtime``
(runtime_provider.py).

The net effect for the user: they only paste the token they obtained from
``POST https://api.usepod.ai/v1/register`` (and funded on https://usepod.ai/fund)
— the proxy URL is built for them.  An explicit ``USEPOD_BASE_URL`` env var
still wins, e.g. for a self-hosted UsePod gateway.
"""

from __future__ import annotations

import json
import logging
import urllib.request

from providers import register_provider
from providers.base import ProviderProfile, _profile_user_agent

logger = logging.getLogger(__name__)

# Production gateway host. The token-bearing inference base URL is
# ``{USEPOD_API_BASE}/proxy/<token>/v1``; the catalog is
# ``{USEPOD_API_BASE}/proxy/<token>/v1/models``.
USEPOD_API_BASE = "https://api.usepod.ai"


class UsePodProfile(ProviderProfile):
    """UsePod — OpenAI-compatible proxy with the auth token in the URL path."""

    def fetch_models(self, *, api_key: str | None = None, base_url: str | None = None, timeout: float = 8.0):
        """List models from the per-token catalog endpoint.

        UsePod exposes ``/proxy/<token>/v1/models``; the token lives in the
        path, so the base-class implementation (which builds the URL from the
        static ``base_url``) cannot reach it. Returns None when no token is
        available so callers fall back to ``fallback_models``.

        ``base_url`` is accepted (and ignored — the URL is derived from the
        token) only so the generic picker fetch in ``models.provider_model_ids``
        — which calls ``fetch_models(api_key=…, base_url=…)`` for every api-key
        provider — doesn't raise a TypeError. That TypeError was silently
        swallowed, leaving UsePod with zero models in the picker. (#pod-models)
        """
        token = (api_key or "").strip()
        if not token:
            return None
        url = f"{USEPOD_API_BASE}/proxy/{token}/v1/models"
        req = urllib.request.Request(url)
        # Harmless — UsePod ignores it (auth is the path token) — but send it
        # for parity with standard OpenAI clients / intermediaries.
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Accept", "application/json")
        req.add_header("User-Agent", _profile_user_agent())
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode())
            items = data if isinstance(data, list) else data.get("data", [])
            return [m["id"] for m in items if isinstance(m, dict) and "id" in m]
        except Exception as exc:
            logger.debug("fetch_models(usepod): %s", exc)
            return None


usepod = UsePodProfile(
    name="usepod",
    # USEPOD_API_KEY = the token (paste-in). USEPOD_BASE_URL = optional override
    # for self-hosted gateways; the registry auto-maps the *_BASE_URL var to the
    # base_url override env var.
    env_vars=("USEPOD_API_KEY", "USEPOD_BASE_URL"),
    display_name="UsePod",
    description="UsePod (drop-in OpenAI-compatible inference marketplace, pay-per-use in USDC)",
    signup_url="https://usepod.ai",
    # Non-empty so the picker + live-fetch plumbing engages; the *effective*
    # inference URL is derived per-token (see module docstring). hostname pins
    # the URL→provider reverse mapping to api.usepod.ai.
    base_url=f"{USEPOD_API_BASE}/proxy",
    hostname="api.usepod.ai",
    # The token is in the URL path, so doctor's static /models probe (built from
    # base_url) can't reach the per-token catalog. Skip it — key presence is the
    # meaningful "configured" signal for this provider.
    supports_health_check=False,
    # Best-effort offline picker list — UsePod's real catalog is dynamic and is
    # fetched live from /proxy/<token>/v1/models whenever a key is present.
    fallback_models=(
        "claude-opus-4-8",
        "claude-sonnet-4-6",
        "gpt-5.5",
        "deepseek-v4",
        "glm-4-7",
        "kimi-k2.5",
    ),
)

register_provider(usepod)
