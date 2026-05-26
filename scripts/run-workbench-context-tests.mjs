// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { execFileSync } from "node:child_process";
import { rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";

const outDir = mkdtempSync("/private/tmp/memi-workbench-context-");

try {
  execFileSync("./node_modules/.bin/tsc", [
    "--ignoreConfig",
    "--target",
    "ES2022",
    "--module",
    "ESNext",
    "--moduleResolution",
    "Bundler",
    "--lib",
    "ES2022,DOM",
    "--strict",
    "--skipLibCheck",
    "--esModuleInterop",
    "--allowSyntheticDefaultImports",
    "--outDir",
    outDir,
    "src/workbench-context.ts",
    "scripts/workbench-context.test.ts",
  ], { stdio: "inherit" });

  execFileSync(process.execPath, [join(outDir, "scripts/workbench-context.test.js")], { stdio: "inherit" });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
