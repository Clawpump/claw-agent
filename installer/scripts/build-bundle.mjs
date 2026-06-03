#!/usr/bin/env node
// Bundles the ClawPump Hermes agent (the parent fork) into ./agent so it ships
// inside the npm package. This is what lets `npx claw-agent` install the agent
// without cloning the (private) GitHub repo. Runs automatically on `npm pack` /
// `npm publish` via the "prepack" script. The ./agent dir is gitignored — it's
// a build artifact, rebuilt fresh at publish time.
//
// Uses a manual recursive copy (not fs.cpSync) because the destination lives
// inside the source tree (installer/ is a subdir of the fork), which cpSync
// refuses. We exclude `installer` up front, so we never recurse into ourselves.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, "..");          // installer/
const FORK = path.resolve(PKG, "..");               // the agent fork (hermes-agent)
const OUT = path.join(PKG, "agent");

// Top-level dirs/files NOT needed at runtime (keep the npm tarball lean).
const EXCLUDE_TOP = new Set([
  "installer",            // self (avoid recursion into OUT)
  ".git", ".github",
  "node_modules", ".venv",
  "tests", "website",     // test suite + docs site
  "docker", "nix",        // build/packaging infra
  ".plans", "plans", "infographic", "datagen-config-examples",
  "dist", "build",
]);
// Path segments excluded at any depth.
const EXCLUDE_ANY = new Set(["__pycache__", ".pytest_cache", "node_modules", ".venv", ".DS_Store"]);

function keep(rel, name) {
  const parts = rel.split(path.sep);
  if (parts.length === 1 && EXCLUDE_TOP.has(name)) return false;
  if (EXCLUDE_ANY.has(name)) return false;
  if (name.endsWith(".pyc")) return false;
  if (parts.length === 1 && /^RELEASE_v.*\.md$/.test(name)) return false;
  return true;
}

let fileCount = 0;
function copyDir(srcDir, dstDir, relDir) {
  fs.mkdirSync(dstDir, { recursive: true });
  for (const e of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const rel = relDir ? path.join(relDir, e.name) : e.name;
    if (!keep(rel, e.name)) continue;
    const src = path.join(srcDir, e.name);
    const dst = path.join(dstDir, e.name);

    let isDir = e.isDirectory();
    let isFile = e.isFile();
    if (e.isSymbolicLink()) {
      try { const st = fs.statSync(src); isDir = st.isDirectory(); isFile = st.isFile(); }
      catch { continue; } // broken symlink — skip
    }

    if (isDir) copyDir(src, dst, rel);
    else if (isFile) { fs.copyFileSync(src, dst); fileCount++; }
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(FORK, OUT, "");
fs.writeFileSync(path.join(OUT, ".claw-bundle"), "claw-agent npm bundle\n");
console.log(`[build-bundle] bundled ${fileCount} files -> ${path.relative(PKG, OUT)}/`);
