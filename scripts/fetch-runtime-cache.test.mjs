// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  assetCacheEntryMatches,
  cachedAssetMatches,
  cachedAssetState,
  readAssetCache,
  rememberCachedAsset,
} from "./fetch-runtime.mjs";

const root = await mkdtemp(join(tmpdir(), "memi-fetch-runtime-cache-"));

try {
  const asset = "memi-studio-runtime-aarch64-apple-darwin";
  const assetPath = join(root, asset);

  await writeFile(assetPath, "runtime-one");
  assert.equal(await cachedAssetMatches(root, "sarveshsea/memi", "runtime-v0.18.2", asset), false);
  assert.equal((await cachedAssetState(root, "sarveshsea/memi", "runtime-v0.18.2", asset)).status, "missing-metadata");

  await rememberCachedAsset(root, asset, "sarveshsea/memi", "runtime-v0.18.2", assetPath);
  assert.equal(await cachedAssetMatches(root, "sarveshsea/memi", "runtime-v0.18.2", asset), true);
  assert.equal((await cachedAssetState(root, "sarveshsea/memi", "runtime-v0.18.2", asset)).status, "verified");
  assert.equal(await cachedAssetMatches(root, "sarveshsea/memi", "runtime-v0.18.3", asset), false);
  assert.equal((await cachedAssetState(root, "sarveshsea/memi", "runtime-v0.18.3", asset)).status, "stale-metadata");

  await writeFile(assetPath, "runtime-two");
  assert.equal(await cachedAssetMatches(root, "sarveshsea/memi", "runtime-v0.18.2", asset), false);
  assert.equal((await cachedAssetState(root, "sarveshsea/memi", "runtime-v0.18.2", asset)).status, "stale-metadata");

  const cache = await readAssetCache(root);
  assert.equal(
    assetCacheEntryMatches(cache.assets[asset], {
      repo: "sarveshsea/memi",
      tag: "runtime-v0.18.2",
      asset,
      sha256: cache.assets[asset].sha256,
      size: cache.assets[asset].size,
    }),
    true,
  );

  console.log("fetch-runtime-cache: ok");
} finally {
  await rm(root, { recursive: true, force: true });
}
