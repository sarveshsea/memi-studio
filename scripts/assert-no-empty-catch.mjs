// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Hygiene check: no error handler in src/ may swallow a failure silently.
// Route it through notify(classifyError(err), { severity }) instead (see
// src/notification-center.ts) — "background" severity for retry-loop
// noise, "toast" (default) for user-initiated actions. Matches the
// project's existing bespoke-script hygiene convention (assert-no-mock-ui.mjs)
// rather than introducing a new lint toolchain.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC_ROOT = join(ROOT, "src");
const SCAN_EXTENSIONS = new Set([".ts", ".tsx"]);

const FORBIDDEN_PATTERNS = [
  { pattern: /\.catch\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*undefined\s*\)/, message: "silently swallows a rejection with .catch(() => undefined) — route it through notify(classifyError(err), { severity })" },
  { pattern: /\.catch\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{\s*\}\s*\)/, message: "silently swallows a rejection with .catch(() => {}) — route it through notify(classifyError(err), { severity })" },
  { pattern: /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/, message: "empty catch block swallows an error — route it through notify(classifyError(err), { severity })" },
];

function walkSourceFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const path = join(root, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...walkSourceFiles(path));
      continue;
    }
    if (!stats.isFile()) continue;
    const dotIndex = entry.lastIndexOf(".");
    const extension = dotIndex >= 0 ? entry.slice(dotIndex) : "";
    if (SCAN_EXTENSIONS.has(extension)) files.push(path);
  }
  return files;
}

const failures = [];
for (const file of walkSourceFiles(SRC_ROOT)) {
  const relativePath = file.replace(`${ROOT}/`, "");
  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");
  lines.forEach((line, index) => {
    for (const { pattern, message } of FORBIDDEN_PATTERNS) {
      if (pattern.test(line)) failures.push(`${relativePath}:${index + 1}: ${message}`);
    }
  });
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
