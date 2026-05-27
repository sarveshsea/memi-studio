// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const checks = [
  {
    file: "src/App.tsx",
    forbidden: [
      "Start with a prompt. The run spine will fill in as the agent works.",
      "No tool calls yet.",
      "Awaiting run",
      "Hermes pending",
      "Study Hermes CLI, skills, tools, profiles, sessions",
      "pattern-empty",
      "codex-gpt-5-5",
      "hermes-harness",
      "deterministic-product-simulator",
      "studyHermesResearchHarness",
      "model-hermes",
      "data-harness-study=\"hermes\"",
      "data-composer-controls=\"readable\"",
      "https://github.com/sarveshsea/memoire#examples",
      "Select a run event, changed file, artifact, or approval to inspect details here.",
      "Readiness details",
      "Hide readiness",
    ],
  },
  {
    file: "src/workbench-components.tsx",
    forbidden: [
      "Mémoire E2E Scratch",
      "memoire/e2e/color",
      "FALLBACK_AGENTIC_ROLES",
      "FALLBACK_AGENTIC_OPEN_SOURCE_REFERENCES",
      "FALLBACK_AGENTIC_INTERACTION_PATTERNS",
    ],
  },
  {
    file: "src/workbench-copy.ts",
    forbidden: [
      "timelineFallback",
    ],
  },
  {
    file: "NOTICE",
    forbidden: [
      "sarveshsea/m-moire",
    ],
  },
];
const sourceHygieneChecks = [
  {
    file: "src/App.tsx",
    forbiddenPatterns: [
      {
        pattern: /\bfontSize\s*:/,
        message: "move inline font sizing into Studio CSS tokens",
      },
      {
        pattern: /\bfontFamily\s*:/,
        message: "move inline font family into Studio CSS tokens",
      },
    ],
  },
  {
    file: "src/workbench-components.tsx",
    forbiddenPatterns: [
      {
        pattern: /\bfontSize\s*:/,
        message: "move inline font sizing into Studio CSS tokens",
      },
      {
        pattern: /\bfontFamily\s*:/,
        message: "move inline font family into Studio CSS tokens",
      },
    ],
  },
  {
    file: "src/manager-view.tsx",
    forbiddenPatterns: [
      {
        pattern: /\bfontSize\s*:/,
        message: "move inline font sizing into Studio CSS tokens",
      },
      {
        pattern: /\bfontFamily\s*:/,
        message: "move inline font family into Studio CSS tokens",
      },
    ],
  },
];
const runtimeResourceTextExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".txt", ".xml"]);
const staleRuntimeResourceTokens = [
  "sarveshsea/m-moire",
  "MiroFish",
  "Mirofish",
];

const failures = [];
for (const check of checks) {
  const source = readFileSync(join(ROOT, check.file), "utf8");
  for (const token of check.forbidden) {
    if (source.includes(token)) failures.push(`${check.file}: remove user-facing mock token ${token}`);
  }
}

for (const check of sourceHygieneChecks) {
  const source = readFileSync(join(ROOT, check.file), "utf8");
  for (const item of check.forbiddenPatterns) {
    if (item.pattern.test(source)) failures.push(`${check.file}: ${item.message}`);
  }
}

const appSource = readFileSync(join(ROOT, "src/App.tsx"), "utf8");
if (!appSource.includes('data-mode-rail-density="icon-only"')) {
  failures.push("src/App.tsx: run mode rail must be icon-only; keep detailed mode text in tooltips and composer controls");
}

const studioCssSource = readFileSync(join(ROOT, "src/styles.css"), "utf8");
studioCssSource.split("\n").forEach((line, index) => {
  if (!/font-family\s*:/.test(line)) return;
  if (/var\(--font-(studio|mono)\)/.test(line)) return;
  failures.push(`src/styles.css:${index + 1}: font-family must use --font-studio or --font-mono`);
});
studioCssSource.split("\n").forEach((line, index) => {
  const trimmed = line.trim();
  if (/^--font-size-[\w-]+\s*:/.test(trimmed) || /^--font-weight-[\w-]+\s*:/.test(trimmed)) return;
  if (/font-size\s*:/.test(line) && !/var\(--font-size-[\w-]+\)/.test(line)) {
    failures.push(`src/styles.css:${index + 1}: font-size must use --font-size tokens`);
  }
  if (/font-weight\s*:/.test(line) && !/var\(--font-weight-[\w-]+\)/.test(line)) {
    failures.push(`src/styles.css:${index + 1}: font-weight must use --font-weight tokens`);
  }
  if (/\bfont\s*:/.test(line) && !/font\s*:\s*inherit\b/.test(line)) {
    failures.push(`src/styles.css:${index + 1}: font shorthand is only allowed for inherit`);
  }
});

function walkRuntimeResourceFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      if (entry === "node_modules" || entry === ".git") continue;
      files.push(...walkRuntimeResourceFiles(path));
      continue;
    }
    if (!stats.isFile()) continue;
    const dotIndex = entry.lastIndexOf(".");
    const extension = dotIndex >= 0 ? entry.slice(dotIndex) : "";
    if (runtimeResourceTextExtensions.has(extension)) files.push(path);
  }
  return files;
}

const runtimeResourceRoot = join(ROOT, "src-tauri", "resources", "memoire-runtime");
if (existsSync(runtimeResourceRoot)) {
  for (const file of walkRuntimeResourceFiles(runtimeResourceRoot)) {
    const source = readFileSync(file, "utf8");
    for (const token of staleRuntimeResourceTokens) {
      if (source.includes(token)) failures.push(`${file.replace(`${ROOT}/`, "")}: remove stale public token ${token}`);
    }
  }
}

const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const runtimeVersion = packageJson.memoireRuntime?.version;
const runtimeTagVersion = String(packageJson.memoireRuntime?.releaseTag ?? "").replace(/^runtime-v/, "");
if (runtimeVersion && runtimeTagVersion && runtimeVersion !== runtimeTagVersion) {
  failures.push(`package.json: memoireRuntime.version ${runtimeVersion} must match release tag ${runtimeTagVersion}`);
}

const packageInfoSource = readFileSync(join(ROOT, "src/runtime/package-info.ts"), "utf8");
function exportedConst(name) {
  const match = packageInfoSource.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*["']([^"']+)["']`));
  if (!match) failures.push(`src/runtime/package-info.ts: missing ${name}`);
  return match?.[1] ?? "";
}

const publicPackageName = exportedConst("MEMOIRE_PACKAGE_NAME");
const publicPackageVersion = exportedConst("MEMOIRE_PACKAGE_VERSION");
const publicPackageUrl = exportedConst("MEMOIRE_PACKAGE_URL");
const studioRustSource = readFileSync(join(ROOT, "src-tauri/src/studio.rs"), "utf8");
const runtimeResourcePackage = JSON.parse(readFileSync(join(ROOT, "src-tauri/resources/memoire-runtime/package.json"), "utf8"));
const runtimeInfo = JSON.parse(readFileSync(join(ROOT, "src-tauri/resources/memoire-runtime/studio-runtime-info.json"), "utf8"));

if (runtimeResourcePackage.name !== publicPackageName) {
  failures.push(`src-tauri/resources/memoire-runtime/package.json: name must be ${publicPackageName}, got ${runtimeResourcePackage.name}`);
}
if (runtimeResourcePackage.version !== publicPackageVersion) {
  failures.push(`src-tauri/resources/memoire-runtime/package.json: version must be ${publicPackageVersion}, got ${runtimeResourcePackage.version}`);
}
if (runtimeResourcePackage.homepage?.includes("m-moire") || runtimeResourcePackage.repository?.url?.includes("m-moire") || runtimeResourcePackage.bugs?.url?.includes("m-moire")) {
  failures.push("src-tauri/resources/memoire-runtime/package.json: remove stale m-moire public URLs");
}
if (runtimeInfo.packageName !== publicPackageName || runtimeInfo.packageVersion !== publicPackageVersion || runtimeInfo.packageUrl !== publicPackageUrl) {
  failures.push("src-tauri/resources/memoire-runtime/studio-runtime-info.json: public package metadata must match src/runtime/package-info.ts");
}
if (!studioRustSource.includes(`${publicPackageName}@${publicPackageVersion}`) || !studioRustSource.includes(publicPackageUrl)) {
  failures.push("src-tauri/src/studio.rs: agent prompt package reference must match src/runtime/package-info.ts");
}
if (!runtimeInfo.releaseTag || runtimeInfo.releaseTag !== packageJson.memoireRuntime?.releaseTag) {
  failures.push("src-tauri/resources/memoire-runtime/studio-runtime-info.json: releaseTag must match package.json memoireRuntime.releaseTag");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
