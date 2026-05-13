// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC
//
// Walks the repository and prepends the SPDX header to every source file that
// does not already carry one. Idempotent: running it twice is a no-op.
//
// Usage:
//   node scripts/apply-license-headers.mjs           # apply
//   node scripts/apply-license-headers.mjs --check   # exit 1 if any file is missing the header

import { promises as fs } from "node:fs";
import { join, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const CHECK_ONLY = process.argv.includes("--check");

const SPDX = "SPDX-License-Identifier: FSL-1.1-ALv2";
const COPYRIGHT = "Copyright 2026 Humyn LLC";

const COMMENT_STYLES = {
  ".ts": { open: "// ", close: "" },
  ".tsx": { open: "// ", close: "" },
  ".js": { open: "// ", close: "" },
  ".mjs": { open: "// ", close: "" },
  ".cjs": { open: "// ", close: "" },
  ".jsx": { open: "// ", close: "" },
  ".rs": { open: "// ", close: "" },
  ".toml": { open: "# ", close: "" },
  ".sh": { open: "# ", close: "" },
  ".yml": { open: "# ", close: "" },
  ".yaml": { open: "# ", close: "" },
  ".css": { wrap: ["/* ", " */"] },
  ".html": { wrap: ["<!-- ", " -->"] },
};

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "target",
  "gen",
  ".git",
  ".tauri",
  ".vite",
  "build",
  "out",
]);

const SKIP_PATH_PREFIXES = [
  "src-tauri/resources/memoire-runtime",
];

const SKIP_FILES = new Set([
  "LICENSE",
  "NOTICE",
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "Cargo.lock",
  ".gitignore",
]);

function repoPath(path) {
  return relative(ROOT, path).split(sep).join("/");
}

function shouldSkipPath(path) {
  const normalized = repoPath(path);
  return SKIP_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (shouldSkipPath(full)) continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue;
      yield full;
    }
  }
}

function buildHeader(ext, hasShebang) {
  const style = COMMENT_STYLES[ext];
  if (!style) return null;
  const lines = [SPDX, COPYRIGHT];
  if (style.wrap) {
    return style.wrap[0] + lines.join("\n   ") + style.wrap[1] + "\n\n";
  }
  const prefix = style.open;
  const out = lines.map((line) => prefix + line).join("\n") + "\n";
  return hasShebang ? out : out + "\n";
}

async function processFile(path) {
  const ext = extname(path);
  if (!COMMENT_STYLES[ext]) {
    return { path, status: "skip-ext" };
  }
  const original = await fs.readFile(path, "utf8");

  if (original.includes(SPDX)) {
    return { path, status: "already-tagged" };
  }

  const hasShebang = original.startsWith("#!");
  const header = buildHeader(ext, hasShebang);
  if (!header) {
    return { path, status: "skip-no-style" };
  }

  let updated;
  if (hasShebang) {
    const newlineIdx = original.indexOf("\n");
    const shebang = original.slice(0, newlineIdx + 1);
    const rest = original.slice(newlineIdx + 1);
    updated = shebang + header + "\n" + rest;
  } else {
    updated = header + original;
  }

  if (CHECK_ONLY) {
    return { path, status: "missing" };
  }
  await fs.writeFile(path, updated, "utf8");
  return { path, status: "applied" };
}

async function main() {
  const counts = { applied: 0, "already-tagged": 0, "skip-ext": 0, "skip-no-style": 0, missing: 0 };
  const missing = [];
  for await (const path of walk(ROOT)) {
    const result = await processFile(path);
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    if (result.status === "missing") {
      missing.push(relative(ROOT, path));
    }
  }
  const summary = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}=${n}`)
    .join(" ");
  console.log(`SPDX header pass: ${summary}`);
  if (CHECK_ONLY && missing.length > 0) {
    console.error(`\n${missing.length} file(s) missing the SPDX header:`);
    for (const path of missing.slice(0, 20)) console.error(`  ${path}`);
    if (missing.length > 20) console.error(`  … and ${missing.length - 20} more`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
