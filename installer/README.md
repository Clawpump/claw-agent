# claw-agent

One command to install and run your own **ClawPump Hermes agent** — Solana AI
agents, trading, Phoenix perps, DCA, Jupiter lending, token launch, marketplace,
and DeFi. Built on [Hermes Agent](https://github.com/NousResearch/hermes-agent)
by Nous Research (MIT).

```bash
npx @clawpump/claw-agent
```

That's it. The installer:

1. installs **uv** + **Python 3.11** if you don't have them,
2. sets up an isolated virtualenv under `~/.clawpump/agent`,
3. installs the bundled agent,
4. drops a `claw` (and `hermes`) launcher on your PATH.

Then connect — one browser login, no key to copy:

```bash
claw clawpump setup     # → "Continue with ClawPump login" → all tools load
claw                    # start chatting
```

Update any time:

```bash
npx @clawpump/claw-agent@latest
```

## Notes

- **macOS / Linux / WSL2** are fully supported. Native Windows is best-effort —
  if it fails, run inside WSL2.
- The agent is bundled **inside this npm package**, so installing does not
  require cloning any GitHub repo. (It's a source app — the Python code lives
  under `~/.clawpump/agent` after install.)
- Env knobs: `CLAWPUMP_HOME` (install dir, default `~/.clawpump`), `CLAW_EXTRA`
  (pip extra, default `all`; use `termux` on Android).

## For maintainers

`npm publish` runs `prepack` → `scripts/build-bundle.mjs`, which copies the
agent fork (the parent dir) into `./agent`, excluding `.git`, `tests`,
`website`, `docker`, `nix`, etc. The `agent/` dir is gitignored and rebuilt
fresh on each publish.

```bash
npm run build      # build the bundle locally to inspect it
npm pack           # produce the tarball (runs prepack)
npm publish        # publish to npm (requires npm login)
```

---

MIT. Built on Hermes Agent by Nous Research.
