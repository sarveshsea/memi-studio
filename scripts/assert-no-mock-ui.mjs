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
      "No trace",
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
      "No artifact yet",
      "<h2>No artifact",
      "No trace",
      "Design system text",
      "token refs pending",
      "runtime ready",
      "tests traced",
      "diff linked",
      "\"H1 / 32 / 700\"",
      "\"Primary\", \"Secondary\", \"Outline\", \"Danger\", \"Disabled\"",
      "\"transparent\", \"on surface\", \"on light\"",
      "{contract.source.name} / {contract.source.access}",
      "{role.atomicLevel}",
      "role.requiredSignals.slice(0, 2).join(\" / \")",
      "contract.outputSections.join(\" / \")",
      "reference.mappedRoles.join(\" / \")",
      "pattern.requiredSignals.join(\" / \")",
      "aria-label=\"Branch\" className=\"icon-button\" data-action-id=\"chat.branch-current\"",
      "aria-label=\"Pin memory\" data-action-id=\"chat.pin-memory\" title=\"Pin\"",
      "aria-label=\"Copy verification\" data-action-id=\"chat.copy-verification\" title={verification.summary}",
      "latestArtifact ? trimText(latestArtifact.title, 24) : \"No\"",
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
if (!appSource.includes('data-composer-tooltip="visible-on-hover"')) {
  failures.push("src/App.tsx: composer icon controls must expose visible hover/focus tooltips");
}
if (!appSource.includes('data-icon-tooltip="Command"') || !appSource.includes('data-icon-tooltip="Settings"')) {
  failures.push("src/App.tsx: topbar icon controls must expose visible hover/focus tooltips");
}
if (!appSource.includes('data-icon-tooltip={`Mode: ${activeChatModeLabel}`}') || !appSource.includes('data-icon-tooltip={`Action: ${effectiveActionLabel}`}')) {
  failures.push("src/App.tsx: composer icon controls must show the current value on hover");
}
if (appSource.includes("composer-control-text")) {
  failures.push("src/App.tsx: icon-only composer controls must not render duplicate hidden value text");
}
if (!appSource.includes("truth-strip-detail")) {
  failures.push("src/App.tsx: truth strip must show explicit compact state values instead of label-only chips");
}
if (!appSource.includes("aria-label={accessibleLabel}")) {
  failures.push("src/App.tsx: truth strip state values must be exposed to accessibility");
}
if (!appSource.includes("isWorkspaceAccessBlockedMessage") || !appSource.includes('data-action-id="workspace.reauthorize"')) {
  failures.push("src/App.tsx: macOS workspace access failures must offer Open folder reauthorization instead of only runtime restart");
}

const studioCssSource = readFileSync(join(ROOT, "src/styles.css"), "utf8");
const componentsSource = readFileSync(join(ROOT, "src/workbench-components.tsx"), "utf8");
if (!componentsSource.includes("data-icon-tooltip")) {
  failures.push("src/workbench-components.tsx: shared icon controls must emit data-icon-tooltip for visible labels");
}
if (!componentsSource.includes('actionId="chat.branch-current" ariaLabel="Branch conversation"') || !componentsSource.includes('title={`Copy verification: ${verification.summary}`}')) {
  failures.push("src/workbench-components.tsx: contextual chat icon controls must use shared visible tooltips instead of title-only icons");
}
if (!componentsSource.includes('data-icon-tooltip={props.collapsed ? "Expand sidebar" : "Collapse sidebar"}')) {
  failures.push("src/workbench-components.tsx: collapsed sidebar icon control must expose a visible tooltip");
}
if (!componentsSource.includes("displayableDesignTokens") || !componentsSource.includes("isDisplayableDesignToken")) {
  failures.push("src/workbench-components.tsx: design-system token evidence must filter raw JSON snippets before rendering");
}
if (!componentsSource.includes("formatAgenticContractTerm") || !componentsSource.includes("formatAgenticContractAccess")) {
  failures.push("src/workbench-components.tsx: agentic design-system contract must humanize raw event and token ids before rendering");
}
if (!studioCssSource.includes("[data-icon-tooltip]::after")) {
  failures.push("src/styles.css: icon controls must render visible hover/focus tooltips from data-icon-tooltip");
}
if (!studioCssSource.includes("visibility: hidden;") || !studioCssSource.includes("visibility: visible;")) {
  failures.push("src/styles.css: hidden tooltip text must not leak into the idle accessibility tree");
}
if (!studioCssSource.includes(".console-topbar [data-icon-tooltip]::after") || !studioCssSource.includes('.project-sidebar[data-sidebar-collapsed="true"] [data-icon-tooltip]::after')) {
  failures.push("src/styles.css: topbar and collapsed-sidebar icon tooltips must avoid clipped hover labels");
}
if (studioCssSource.includes("composer-control-text")) {
  failures.push("src/styles.css: remove stale composer text styles; values belong in hover tooltips and aria labels");
}
if (!studioCssSource.includes(".truth-strip-detail")) {
  failures.push("src/styles.css: truth strip detail copy must have tokenized compact styling");
}
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
const localCargoTargetEnv = "CARGO_TARGET_DIR=$HOME/Library/Caches/cv.memoire.studio/cargo-target";
for (const scriptName of ["check:rust", "tauri:dev", "tauri:build", "tauri:build:release"]) {
  const script = packageJson.scripts?.[scriptName] ?? "";
  if (!script.includes(localCargoTargetEnv)) {
    failures.push(`package.json: ${scriptName} must set ${localCargoTargetEnv} so Rust artifacts stay off external volumes`);
  }
}
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

function assertOpenCodeContract(manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const relativeManifestPath = manifestPath.replace(`${ROOT}/`, "");
  const opencode = manifest.harnesses?.find((item) => item.id === "opencode");
  if (!opencode) {
    failures.push(`${relativeManifestPath}: missing OpenCode harness`);
    return;
  }
  const expectedCommand = ["run", "--format", "json", "--dir", "{{cwd}}", "{{promptEnvelope}}"];
  for (const action of ["compose", "audit", "raw"]) {
    const actual = opencode.commandTemplates?.[action] ?? [];
    if (actual.join("\u0000") !== expectedCommand.join("\u0000")) {
      failures.push(`${relativeManifestPath}: OpenCode ${action} must use opencode run --format json --dir {{cwd}} {{promptEnvelope}}`);
    }
  }
  if (opencode.outputParser !== "opencode-jsonl") {
    failures.push(`${relativeManifestPath}: OpenCode outputParser must be opencode-jsonl`);
  }
}

const publicPackageName = exportedConst("MEMOIRE_PACKAGE_NAME");
const publicPackageVersion = exportedConst("MEMOIRE_PACKAGE_VERSION");
const publicPackageUrl = exportedConst("MEMOIRE_PACKAGE_URL");
const studioRustSource = readFileSync(join(ROOT, "src-tauri/src/studio.rs"), "utf8");
const runtimeResourcePackage = JSON.parse(readFileSync(join(ROOT, "src-tauri/resources/memoire-runtime/package.json"), "utf8"));
const runtimeInfo = JSON.parse(readFileSync(join(ROOT, "src-tauri/resources/memoire-runtime/studio-runtime-info.json"), "utf8"));
assertOpenCodeContract(join(ROOT, "src-tauri", "resources", "harness-manifest.json"));
assertOpenCodeContract(join(ROOT, "src-tauri", "resources", "memoire-runtime", "studio", "harness-manifest.json"));

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
