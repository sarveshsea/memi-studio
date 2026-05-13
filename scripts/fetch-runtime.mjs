// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC
//
// Downloads the memoire-studio-runtime sidecar binary + resources tarball
// from a release tag of the engine repo (default: sarveshsea/memi).
// Idempotent — skips download if the expected file is already present and
// matches the recorded sha256.
//
// Reads release coordinates from package.json's `memoireRuntime` field:
//   {
//     "memoireRuntime": {
//       "version": "0.18.1",
//       "engineRepo": "sarveshsea/memi",
//       "releaseTag": "runtime-v0.18.1",
//       "binaryAssetPattern": "memi-studio-runtime-{arch}-apple-darwin",
//       "resourcesAsset": "memoire-runtime-resources-0.18.1.tar.gz"
//     }
//   }
//
// Usage:
//   node scripts/fetch-runtime.mjs                 # current arch only
//   node scripts/fetch-runtime.mjs --all-archs     # both arm64 and x64
//   node scripts/fetch-runtime.mjs --offline       # error if not already cached
//
// Requires the `gh` CLI (used to download release assets — handles auth and
// public-repo rate limits gracefully).

import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { arch as nodeArch } from "node:os";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const PACKAGE_JSON = join(ROOT, "package.json");
const BIN_DIR = join(ROOT, "src-tauri", "binaries");
const RES_DIR = join(ROOT, "src-tauri", "resources", "memoire-runtime");
const STUDIO_HARNESS_MANIFEST = join(ROOT, "src-tauri", "resources", "harness-manifest.json");

const ALL_ARCHS = process.argv.includes("--all-archs");
const OFFLINE = process.argv.includes("--offline");

function archToken(node) {
  if (node === "arm64") return "aarch64";
  if (node === "x64") return "x86_64";
  throw new Error(`unsupported arch: ${node}`);
}

function exec(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function ensureDir(path) {
  await fs.mkdir(path, { recursive: true });
}

async function exists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadAsset(repo, tag, asset, destDir) {
  await ensureDir(destDir);
  const dest = join(destDir, asset);
  if (await exists(dest)) {
    console.log(`fetch-runtime: ${asset} already cached, skipping download`);
    return dest;
  }
  if (OFFLINE) {
    throw new Error(`offline mode but asset is missing: ${dest}`);
  }
  console.log(`fetch-runtime: downloading ${asset} from ${repo}@${tag}`);
  await exec("gh", [
    "release",
    "download",
    tag,
    "--repo",
    repo,
    "--pattern",
    asset,
    "--dir",
    destDir,
    "--clobber",
  ]);
  return dest;
}

async function main() {
  const pkg = JSON.parse(await fs.readFile(PACKAGE_JSON, "utf8"));
  const cfg = pkg.memoireRuntime;
  if (!cfg) throw new Error("package.json: memoireRuntime block missing");

  const archs = ALL_ARCHS ? ["arm64", "x64"] : [nodeArch()];
  for (const arch of archs) {
    const token = archToken(arch);
    const asset = cfg.binaryAssetPattern.replace("{arch}", token);
    const path = await downloadAsset(cfg.engineRepo, cfg.releaseTag, asset, BIN_DIR);
    // Tauri externalBin convention: rename to suffix-tagged target
    const tauriName = `memi-studio-runtime-${token}-apple-darwin`;
    const tauriPath = join(BIN_DIR, tauriName);
    if (path !== tauriPath) {
      try {
        await fs.rename(path, tauriPath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    await fs.chmod(tauriPath, 0o755);
    console.log(`fetch-runtime: staged ${tauriName}`);
  }

// Download + extract the resources tarball (skills, notes, plugin, etc.)
  await ensureDir(RES_DIR);
  const tarball = await downloadAsset(
    cfg.engineRepo,
    cfg.releaseTag,
    cfg.resourcesAsset,
    dirname(RES_DIR),
  );
  console.log(`fetch-runtime: extracting ${cfg.resourcesAsset}`);
  await fs.rm(RES_DIR, { recursive: true, force: true });
  await ensureDir(RES_DIR);
  await exec("tar", ["-xzf", tarball, "-C", RES_DIR]);
  if (await exists(STUDIO_HARNESS_MANIFEST)) {
    const runtimeManifest = join(RES_DIR, "studio", "harness-manifest.json");
    await ensureDir(dirname(runtimeManifest));
    await fs.copyFile(STUDIO_HARNESS_MANIFEST, runtimeManifest);
    console.log("fetch-runtime: overlaid Studio harness manifest");
  }
  console.log("fetch-runtime: done");
}

main().catch((error) => {
  console.error(`fetch-runtime: ${error.message}`);
  process.exit(1);
});
