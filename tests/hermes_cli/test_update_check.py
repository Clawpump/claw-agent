"""Tests for the update check mechanism in hermes_cli.banner."""

import json
import os
import threading
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest




def test_check_for_updates_uses_cache(tmp_path, monkeypatch):
    """When cache is fresh, check_for_updates should return cached value without calling git."""
    from hermes_cli.banner import check_for_updates
    from hermes_cli import __version__

    # Create a fake git repo and fresh cache
    repo_dir = tmp_path / "hermes-agent"
    repo_dir.mkdir()
    (repo_dir / ".git").mkdir()

    cache_file = tmp_path / ".update_check"
    cache_file.write_text(json.dumps({"ts": time.time(), "behind": 3, "ver": __version__}))

    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    with patch("hermes_cli.banner.subprocess.run") as mock_run:
        result = check_for_updates()

    assert result == 3
    mock_run.assert_not_called()


def test_check_for_updates_uses_bundled_revision(tmp_path, monkeypatch):
    """An npm bundle compares its baked revision, not a stale profile checkout."""
    from hermes_cli import banner

    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.delenv("HERMES_REVISION", raising=False)

    with (
        patch.object(banner, "_bundled_build_revision", return_value="a" * 40),
        patch.object(banner, "_check_via_rev", return_value=4) as check_via_rev,
        patch.object(banner, "_check_via_local_git") as check_via_local_git,
    ):
        result = banner.check_for_updates()

    assert result == 4
    check_via_rev.assert_called_once_with("a" * 40)
    check_via_local_git.assert_not_called()






def test_prefetch_non_blocking():
    """prefetch_update_check() should return immediately without blocking."""
    import hermes_cli.banner as banner

    # Reset module state
    banner._update_result = None
    banner._update_check_done = threading.Event()

    with patch.object(banner, "check_for_updates", return_value=5):
        start = time.monotonic()
        banner.prefetch_update_check()
        elapsed = time.monotonic() - start

        # Should return almost immediately (well under 1 second)
        assert elapsed < 1.0

        # Wait for the background thread to finish
        banner._update_check_done.wait(timeout=5)
        assert banner._update_result == 5



