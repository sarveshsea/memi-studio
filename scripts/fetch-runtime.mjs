// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC
//
// Downloads the memoire-studio-runtime sidecar binary + resources tarball
// from a release tag of the engine repo (default: sarveshsea/memi).
// Idempotent — skips download if the expected file is already present and
// matches the recorded repo/tag/asset metadata and sha256.
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

import { createHash } from "node:crypto";
import { createReadStream, promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { arch as nodeArch } from "node:os";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const PACKAGE_JSON = join(ROOT, "package.json");
const PACKAGE_INFO_TS = join(ROOT, "src", "runtime", "package-info.ts");
const BIN_DIR = join(ROOT, "src-tauri", "binaries");
const RES_DIR = join(ROOT, "src-tauri", "resources", "memoire-runtime");
const STUDIO_HARNESS_MANIFEST = join(ROOT, "src-tauri", "resources", "harness-manifest.json");

const ALL_ARCHS = process.argv.includes("--all-archs");
const OFFLINE = process.argv.includes("--offline");
const CACHE_META_FILE = ".memoire-runtime-assets.json";
const CACHE_SCHEMA_VERSION = 1;
const TEXT_RESOURCE_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".txt",
  ".xml",
]);

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

async function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function blankAssetCache() {
  return {
    schemaVersion: CACHE_SCHEMA_VERSION,
    assets: {},
  };
}

export function assetCacheEntryMatches(entry, expected) {
  return Boolean(
    entry
      && entry.schemaVersion === CACHE_SCHEMA_VERSION
      && entry.repo === expected.repo
      && entry.tag === expected.tag
      && entry.asset === expected.asset
      && entry.sha256 === expected.sha256
      && entry.size === expected.size,
  );
}

export async function readAssetCache(destDir) {
  const metaPath = join(destDir, CACHE_META_FILE);
  try {
    const cache = JSON.parse(await fs.readFile(metaPath, "utf8"));
    if (cache?.schemaVersion !== CACHE_SCHEMA_VERSION || typeof cache.assets !== "object") {
      return blankAssetCache();
    }
    return cache;
  } catch (error) {
    if (error.code === "ENOENT") return blankAssetCache();
    throw error;
  }
}

async function writeAssetCache(destDir, cache) {
  await ensureDir(destDir);
  await writeJson(join(destDir, CACHE_META_FILE), {
    schemaVersion: CACHE_SCHEMA_VERSION,
    assets: cache.assets ?? {},
  });
}

async function fileFingerprint(path) {
  const stats = await fs.stat(path);
  return {
    sha256: await sha256File(path),
    size: stats.size,
  };
}

export async function cachedAssetMatches(destDir, repo, tag, asset) {
  return (await cachedAssetState(destDir, repo, tag, asset)).status === "verified";
}

export async function cachedAssetState(destDir, repo, tag, asset) {
  const dest = join(destDir, asset);
  if (!(await exists(dest))) return { status: "missing-file" };
  const cache = await readAssetCache(destDir);
  const fingerprint = await fileFingerprint(dest);
  const entry = cache.assets[asset] ?? null;
  if (!entry) {
    return { status: "missing-metadata", fingerprint };
  }
  const verified = assetCacheEntryMatches(entry, {
    repo,
    tag,
    asset,
    ...fingerprint,
  });
  return {
    status: verified ? "verified" : "stale-metadata",
    fingerprint,
  };
}

export async function rememberCachedAsset(destDir, asset, repo, tag, path = join(destDir, asset)) {
  const cache = await readAssetCache(destDir);
  const fingerprint = await fileFingerprint(path);
  cache.assets[asset] = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    repo,
    tag,
    asset,
    ...fingerprint,
    cachedAt: new Date().toISOString(),
  };
  await writeAssetCache(destDir, cache);
}

async function forgetCachedAsset(destDir, asset) {
  const cache = await readAssetCache(destDir);
  delete cache.assets[asset];
  await writeAssetCache(destDir, cache);
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

async function walkTextResources(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      files.push(...await walkTextResources(path));
      continue;
    }
    if (!entry.isFile()) continue;
    const dotIndex = entry.name.lastIndexOf(".");
    const extension = dotIndex >= 0 ? entry.name.slice(dotIndex) : "";
    if (TEXT_RESOURCE_EXTENSIONS.has(extension)) files.push(path);
  }
  return files;
}

async function normalizePublicResourceNames(cfg) {
  if (!(await exists(RES_DIR))) return;
  const replacements = [
    [/sarveshsea\/m-moire/g, cfg.engineRepo],
    [/MiroFish/g, "external board adapter"],
    [/Mirofish/g, "external board adapter"],
  ];
  let changed = 0;
  for (const path of await walkTextResources(RES_DIR)) {
    const before = await fs.readFile(path, "utf8");
    const after = replacements.reduce((source, [pattern, replacement]) => source.replace(pattern, replacement), before);
    if (after === before) continue;
    await fs.writeFile(path, after);
    changed += 1;
  }
  if (changed > 0) console.log(`fetch-runtime: normalized stale public resource names in ${changed} files`);
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

  const pluginWidgetMetaPath = join(RES_DIR, "plugin", "widget-meta.json");
  if (await exists(pluginWidgetMetaPath)) {
    const widgetMeta = await readJson(pluginWidgetMetaPath);
    widgetMeta.packageVersion = publicPackage.version;
    await writeJson(pluginWidgetMetaPath, widgetMeta);
  }

  console.log(`fetch-runtime: overlaid public package metadata ${publicPackage.name}@${publicPackage.version}`);
}

async function downloadAsset(repo, tag, asset, destDir) {
  await ensureDir(destDir);
  const dest = join(destDir, asset);
  if (await exists(dest)) {
    const cacheState = await cachedAssetState(destDir, repo, tag, asset);
    if (cacheState.status === "verified") {
      console.log(`fetch-runtime: ${asset} cache verified, skipping download`);
      return dest;
    }
    if (OFFLINE) {
      if (cacheState.status === "missing-metadata") {
        console.log(`fetch-runtime: ${asset} exists without current metadata, using offline cache`);
        await rememberCachedAsset(destDir, asset, repo, tag, dest);
        return dest;
      }
      throw new Error(`offline mode but cached asset metadata is stale or missing: ${dest}`);
    }
    console.log(`fetch-runtime: ${asset} cache metadata is stale, refreshing`);
    await fs.rm(dest, { force: true });
    await forgetCachedAsset(destDir, asset);
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
  await rememberCachedAsset(destDir, asset, repo, tag, dest);
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
  await normalizePublicResourceNames(cfg);
  await overlayPublicPackageMetadata(cfg);
  console.log("fetch-runtime: done");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`fetch-runtime: ${error.message}`);
    process.exit(1);
  });
}
