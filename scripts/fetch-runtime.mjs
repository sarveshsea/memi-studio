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
const PACKAGE_INFO_TS = join(ROOT, "src", "runtime", "package-info.ts");
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

function exportedConst(source, name) {
  const match = source.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*["']([^"']+)["']`));
  if (!match) throw new Error(`src/runtime/package-info.ts: missing ${name}`);
  return match[1];
}

async function readPublicPackageInfo() {
  const source = await fs.readFile(PACKAGE_INFO_TS, "utf8");
  return {
    name: exportedConst(source, "MEMOIRE_PACKAGE_NAME"),
    version: exportedConst(source, "MEMOIRE_PACKAGE_VERSION"),
    url: exportedConst(source, "MEMOIRE_PACKAGE_URL"),
  };
}

async function readJson(path) {
  return JSON.parse(await fs.readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await fs.writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function overlayPublicPackageMetadata(cfg) {
  const publicPackage = await readPublicPackageInfo();
  const runtimePackagePath = join(RES_DIR, "package.json");
  if (await exists(runtimePackagePath)) {
    const runtimePackage = await readJson(runtimePackagePath);
    const sourceName = runtimePackage.name;
    const sourceVersion = runtimePackage.version;
    runtimePackage.name = publicPackage.name;
    runtimePackage.version = publicPackage.version;
    runtimePackage.repository = {
      type: "git",
      url: `git+https://github.com/${cfg.engineRepo}.git`,
    };
    runtimePackage.bugs = { url: `https://github.com/${cfg.engineRepo}/issues` };
    runtimePackage.homepage = `https://github.com/${cfg.engineRepo}#readme`;
    runtimePackage.memoireRuntime = {
      releaseTag: cfg.releaseTag,
      runtimeVersion: cfg.version,
      resourcesAsset: cfg.resourcesAsset,
      sourcePackageName: sourceName ?? null,
      sourcePackageVersion: sourceVersion ?? null,
      publicPackageName: publicPackage.name,
      publicPackageVersion: publicPackage.version,
      publicPackageUrl: publicPackage.url,
    };
    await writeJson(runtimePackagePath, runtimePackage);
  }

  const runtimeInfoPath = join(RES_DIR, "studio-runtime-info.json");
  if (await exists(runtimeInfoPath)) {
    const runtimeInfo = await readJson(runtimeInfoPath);
    runtimeInfo.name = `${publicPackage.name} Studio runtime`;
    runtimeInfo.packageName = publicPackage.name;
    runtimeInfo.packageVersion = publicPackage.version;
    runtimeInfo.packageUrl = publicPackage.url;
    runtimeInfo.runtimeVersion = cfg.version;
    runtimeInfo.releaseTag = cfg.releaseTag;
    runtimeInfo.resourcesAsset = cfg.resourcesAsset;
    await writeJson(runtimeInfoPath, runtimeInfo);
  }

  console.log(`fetch-runtime: overlaid public package metadata ${publicPackage.name}@${publicPackage.version}`);
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
  await overlayPublicPackageMetadata(cfg);
  console.log("fetch-runtime: done");
}

main().catch((error) => {
  console.error(`fetch-runtime: ${error.message}`);
  process.exit(1);
});
