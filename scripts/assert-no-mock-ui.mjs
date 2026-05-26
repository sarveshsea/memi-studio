// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { readFileSync } from "node:fs";
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
];

const failures = [];
for (const check of checks) {
  const source = readFileSync(join(ROOT, check.file), "utf8");
  for (const token of check.forbidden) {
    if (source.includes(token)) failures.push(`${check.file}: remove user-facing mock token ${token}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
