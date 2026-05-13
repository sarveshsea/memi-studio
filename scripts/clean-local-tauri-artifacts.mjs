// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { readdir, rm } from "node:fs/promises";
import path from "node:path";

const targetRoot = path.resolve("src-tauri", "target");
const updaterArtifactPattern = /\.app\.tar\.gz(?:\.sig)?$/;

let removed = 0;

async function removeUpdaterArtifacts(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await removeUpdaterArtifacts(entryPath);
      return;
    }
    if (!entry.isFile() || !updaterArtifactPattern.test(entry.name)) return;
    await rm(entryPath, { force: true });
    removed += 1;
  }));
}

await removeUpdaterArtifacts(targetRoot);
console.log(`clean-local-tauri-artifacts: removed ${removed} stale updater artifact${removed === 1 ? "" : "s"}`);
