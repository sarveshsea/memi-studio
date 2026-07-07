// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Re-export barrel for the Studio runtime API.
//
// The implementation now lives in ./studio-api/*. This file preserves the
// exact public surface so the ~9 import sites (App.tsx, workbench-components,
// mermaid-board-surface, ia-surface, cost-hud, slash-commands, workbench-copy,
// mermaid-board-contract, studio-workbench) keep importing from "./studio-api"
// unchanged. ./studio-api/internal-helpers is intentionally NOT re-exported:
// it holds private fetch/token/normalization plumbing, not public API.

export * from "./studio-api/shared-types";
export * from "./studio-api/errors";
export * from "./studio-api/core-runtime";
export * from "./studio-api/harness-setup";
export * from "./studio-api/config";
export * from "./studio-api/automation-pane";
export * from "./studio-api/session-harness";
export * from "./studio-api/tools-compat";
export * from "./studio-api/mermaid-mcp";
export * from "./studio-api/browser-computer";
export * from "./studio-api/design-system-pane";
export * from "./studio-api/usage-cost";
export * from "./studio-api/memory-marketplace-pane";
export * from "./studio-api/figma-bridge";
