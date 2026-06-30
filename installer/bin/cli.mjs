#!/usr/bin/env node
// claw-agent — one-command installer for your ClawPump Hermes agent.
//
//   npx @clawpump/claw-agent
//
// Bundles the agent (this npm package contains it), installs uv + Python 3.11,
// builds an isolated venv, installs the agent, and drops a `claw` launcher on
// your PATH. Then: `claw clawpump setup` (browser login) → all tools.
//
// Built on Hermes Agent by Nous Research (MIT).

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const C = {
  g: "\x1b[38;2;34;197;94m", lg: "\x1b[38;2;134;239;172m",
  dim: "\x1b[2m", bold: "\x1b[1m", red: "\x1b[31m", yellow: "\x1b[33m", r: "\x1b[0m",
};
const log = (m = "") => process.stdout.write(m + "\n");
const ok = (m) => log(`${C.g}✓${C.r} ${m}`);
const warn = (m) => log(`${C.yellow}⚠${C.r} ${m}`);
const die = (m) => { log(`${C.red}✗ ${m}${C.r}`); process.exit(1); };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, "..");                 // installer/
const BUNDLE = path.join(PKG, "agent");                    // bundled fork
const HOME = os.homedir();
const CLAW_HOME = process.env.CLAWPUMP_HOME || path.join(HOME, ".clawpump");
const AGENT_DIR = path.join(CLAW_HOME, "agent");
const VENV = path.join(AGENT_DIR, ".venv");
const BIN_DIR = path.join(HOME, ".local", "bin");
const isWin = process.platform === "win32";
const EXTRA = process.env.CLAW_EXTRA || "all";

const venvBin = () => path.join(VENV, isWin ? "Scripts" : "bin");
const venvExe = (n) => path.join(venvBin(), isWin ? `${n}.exe` : n);

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${cmd} exited with ${r.status}`);
}
function out(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: ["ignore", "pipe", "ignore"] });
  return r.status === 0 ? (r.stdout || "").toString().trim() : "";
}
function which(bin) {
  const r = out(isWin ? "where" : "command", isWin ? [bin] : ["-v", bin]);
  return r.split(/\r?\n/)[0] || "";
}

function banner() {
  log();
  log(`${C.bold}${C.g}  🦀 ClawPump Hermes — installer${C.r}`);
  log(`${C.dim}  Solana agents · trading · perps · token launch · DeFi${C.r}`);
  log(`${C.dim}  built on Hermes ☤ by Nous Research (MIT)${C.r}`);
  log();
}

function findUv() {
  const onPath = which("uv");
  if (onPath) return onPath;
  for (const p of [
    path.join(HOME, ".local", "bin", isWin ? "uv.exe" : "uv"),
    path.join(HOME, ".cargo", "bin", isWin ? "uv.exe" : "uv"),
  ]) if (fs.existsSync(p)) return p;
  return "";
}

function installUv() {
  log("Installing uv (Python toolchain manager)…");
  if (isWin) {
    run("powershell", ["-ExecutionPolicy", "Bypass", "-NoProfile", "-Command",
      "irm https://astral.sh/uv/install.ps1 | iex"]);
  } else {
    // curl | sh — uv's official installer (writes to ~/.local/bin)
    run("sh", ["-c", "curl -LsSf https://astral.sh/uv/install.sh | sh"]);
  }
}

function makeLauncher() {
  // The editable install creates `hermes` in the venv bin. Point `claw` (and
  // `hermes`) at it so it's on the user's PATH.
  const target = venvExe("hermes");
  if (!fs.existsSync(target)) { warn(`launcher target not found (${target})`); return; }
  fs.mkdirSync(BIN_DIR, { recursive: true });
  if (isWin) {
    for (const name of ["claw", "hermes"]) {
      const cmd = path.join(BIN_DIR, `${name}.cmd`);
      fs.writeFileSync(cmd, `@echo off\r\n"${target}" %*\r\n`);
    }
  } else {
    for (const name of ["claw", "hermes"]) {
      const link = path.join(BIN_DIR, name);
      try { fs.rmSync(link, { force: true }); } catch {}
      const script = `#!/bin/sh\nexec "${target}" "$@"\n`;
      fs.writeFileSync(link, script, { mode: 0o755 });
    }
  }
  const onPath = (process.env.PATH || "").split(path.delimiter).includes(BIN_DIR);
  return onPath;
}

function main() {
  banner();
  if (!fs.existsSync(path.join(BUNDLE, "pyproject.toml"))) {
    die("Bundled agent missing. Reinstall the package (run `npm run build` if developing).");
  }
  if (isWin) {
    warn("Native Windows is best-effort. If install fails, run it inside WSL2.");
  }

  // 1) uv
  let uv = findUv();
  if (!uv) { installUv(); uv = findUv(); }
  if (!uv) die("Could not find or install `uv`. Install it from https://astral.sh/uv and re-run.");
  ok(`uv: ${uv}`);

  // 2) place the agent under ~/.clawpump/agent (fresh)
  log("Installing agent files…");
  fs.mkdirSync(CLAW_HOME, { recursive: true });
  fs.rmSync(AGENT_DIR, { recursive: true, force: true });
  fs.cpSync(BUNDLE, AGENT_DIR, { recursive: true });
  ok(`agent → ${AGENT_DIR}`);

  // 3) venv + deps
  log("Creating Python 3.11 environment…");
  run(uv, ["venv", VENV, "--python", "3.11"]);
  log(`Installing dependencies (.[${EXTRA}]) — this can take a few minutes…`);
  run(uv, ["pip", "install", "--python", venvExe("python"), "-e", `${AGENT_DIR}[${EXTRA}]`]);
  ok("dependencies installed");

  // 3b) Seed the ClawPump MCP (133 tools — wallet, trading, marketplace) so
  // it's connected out of the box. Idempotent (skips if already configured)
  // and best-effort — a failure here must never abort the install. The remote
  // entry is OAuth-deferred, so the sign-in browser opens on first connect.
  try {
    const seed = [
      "import sys",
      "try:",
      "    from hermes_cli.clawpump_cli import _configured_entry",
      "    from hermes_cli.mcp_picker import install_by_name",
      "    sys.exit(0 if _configured_entry() else install_by_name('clawpump'))",
      "except Exception:",
      "    sys.exit(1)",
    ].join("\n");
    const r = spawnSync(venvExe("python"), ["-c", seed], { stdio: "ignore" });
    if (r.status === 0) ok("ClawPump MCP connected — sign in on first launch");
  } catch { /* best-effort: connect manually with `claw clawpump setup` */ }

  // 4) launcher
  const onPath = makeLauncher();
  ok(`launcher → ${path.join(BIN_DIR, "claw")}`);

  // 5) done
  log();
  log(`${C.bold}${C.g}  Done! 🦀${C.r}`);
  log();
  if (!onPath) {
    warn(`${BIN_DIR} is not on your PATH. Add it:`);
    log(`    ${C.dim}export PATH="${BIN_DIR}:$PATH"   # add to ~/.zshrc or ~/.bashrc${C.r}`);
    log();
  }
  log(`  Next:`);
  log(`    ${C.lg}claw clawpump setup${C.r}   ${C.dim}# browser login → all ClawPump tools${C.r}`);
  log(`    ${C.lg}claw${C.r}                  ${C.dim}# start chatting${C.r}`);
  log();
  log(`  ${C.dim}Update later:  npx @clawpump/claw-agent@latest${C.r}`);
  log();
}

try {
  main();
} catch (e) {
  log();
  die(`Install failed: ${e && e.message ? e.message : e}\n  Try WSL2 on Windows, or open an issue: https://github.com/Clawpump/claw-agent/issues`);
}
