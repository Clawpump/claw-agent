# Keeping ClawPump in sync with upstream Hermes

ClawPump (`Clawpump/claw-agent`) is a **fork of [`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent)** that shares full git history with upstream. Upstream ships very frequently (CalVer, ~daily), so we pull its changes in continuously rather than letting the fork drift.

## How divergence is kept small

All ClawPump-specific behavior lives in a single downstream-owned module, **`hermes_cli/distribution.py`** (skin, default skin, default MCP server, `CLAWPUMP_*` env vars, the `clawpump` subcommand, the npm self-update, the update-check repo URL). The upstream-owned files (`skin_engine.py`, `config.py`, `main.py`, `banner.py`) carry only a small, self-degrading hook each and otherwise match vanilla Hermes byte-for-byte.

**Rule of thumb:** never edit an upstream-owned file to add ClawPump behavior. Add it to `distribution.py` and wire a one-line hook. The smaller the divergence in upstream files, the cleaner every sync.

## Automated sync (`.github/workflows/upstream-sync.yml`)

Runs daily (and via **Actions → Upstream Sync → Run workflow**). Each run:

1. Fetches `upstream/main` and checks how far `main` is behind.
2. If behind **and** no `upstream-sync` PR is already open, creates a `sync/upstream-<timestamp>` branch and **merges** `upstream/main` into it (a real merge commit, to preserve history).
3. Opens a PR into `main`, labelled `upstream-sync` (and `has-conflicts` if the merge had conflicts — the markers are committed so you can resolve them in the branch).

It is self-throttling: only one open sync PR at a time, and it no-ops when already up to date.

### Reviewing / merging a sync PR

- **Clean merge:** review the diff + CI, then **merge with a merge commit** (not squash — squashing discards the upstream parent and breaks future merge-bases).
- **Conflicts:** they're almost always in docs (`README.md`, `.env.example`). Resolve in the branch:
  ```bash
  git fetch origin && git switch sync/upstream-<timestamp>
  # resolve conflicts; for docs you usually keep ours
  git add -A && git commit && git push
  ```
  If a conflict lands in an upstream-owned `.py` file, that's a signal a downstream edit leaked in — prefer moving that edit into `distribution.py` so it won't conflict again.

### One-time setup for full CI on sync PRs

PRs opened with the default `GITHUB_TOKEN` do **not** trigger other workflows, so the repo's CI (tests / lint / branding) won't auto-run on a sync PR. To get CI as the merge gate, add a repo secret **`UPSTREAM_SYNC_PAT`** (a fine-scoped PAT with `repo` + `workflow`); the workflow uses it automatically. Without it, re-run CI on the sync PR manually.

### Caveats

- **`contributor-check`** requires every new commit-author email to be in `AUTHOR_MAP` (`scripts/release.py`). A sync that brings in commits from a *new* upstream contributor will fail this check until you add their mapping — the check prints the exact lines to paste.
- **`history-check`** requires a common ancestor with `main`; a real merge from our shared-history upstream always satisfies it.

## Manual sync (by hand)

```bash
# one-time
git remote add upstream https://github.com/NousResearch/hermes-agent.git

git fetch --no-tags upstream main
git switch -c sync/upstream-manual main
git merge upstream/main
# resolve any conflicts (usually README.md / .env.example), then:
git commit
git push -u origin sync/upstream-manual
# open a PR into main
```

## Versioning

Tag ClawPump releases off the upstream CalVer base plus a suffix, e.g. `v2026.6.5-clawpump.1`, so it's always clear which upstream snapshot a release is built on.
