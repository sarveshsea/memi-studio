// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import type { Harness, HarnessId } from "./studio-api";
import type { WORKBENCH_COPY } from "./workbench-copy";

export const PRIMARY_HARNESS_IDS = ["codex", "claude-code"] as const satisfies HarnessId[];
export const COMPOSER_HARNESS_IDS = ["codex", "claude-code", "ollama", "opencode"] as const satisfies HarnessId[];
export const DEFAULT_PRIMARY_HARNESS_ID: HarnessId = "codex";

export type HarnessVisibility = "primary" | "advanced";

export const DEFAULT_RIGHT_PANE_TAB_IDS = ["run", "changes", "memory"] as const;
export type WorkbenchRightPaneTab = (typeof WORKBENCH_COPY.rightPaneTabs)[number]["id"];

export function isPrimaryHarness(id: HarnessId): boolean {
  return (PRIMARY_HARNESS_IDS as readonly HarnessId[]).includes(id);
}

export function harnessVisibility(harness: Pick<Harness, "id" | "visibility">): HarnessVisibility {
  return harness.visibility ?? (isPrimaryHarness(harness.id) ? "primary" : "advanced");
}

export function primaryHarnesses(harnesses: Harness[]): Harness[] {
  const byId = new Map(harnesses.map((harness) => [harness.id, harness]));
  return PRIMARY_HARNESS_IDS.map((id) => byId.get(id)).filter((harness): harness is Harness => Boolean(harness));
}

export function composerHarnesses(harnesses: Harness[]): Harness[] {
  const byId = new Map(harnesses.map((harness) => [harness.id, harness]));
  return COMPOSER_HARNESS_IDS.map((id) => byId.get(id)).filter((harness): harness is Harness => Boolean(harness));
}

export function normalizePrimaryHarness(id: HarnessId, harnesses: Harness[]): HarnessId {
  if (isPrimaryHarness(id) && harnesses.some((harness) => harness.id === id)) return id;
  if (harnesses.some((harness) => harness.id === DEFAULT_PRIMARY_HARNESS_ID)) return DEFAULT_PRIMARY_HARNESS_ID;
  return primaryHarnesses(harnesses)[0]?.id ?? DEFAULT_PRIMARY_HARNESS_ID;
}

export function normalizeComposerHarness(id: HarnessId, harnesses: Harness[]): HarnessId {
  if (composerHarnesses(harnesses).some((harness) => harness.id === id)) return id;
  return normalizePrimaryHarness(id, harnesses);
}

export function isDefaultWorkbenchPane(tab: WorkbenchRightPaneTab): boolean {
  return (DEFAULT_RIGHT_PANE_TAB_IDS as readonly string[]).includes(normalizeRightPaneTab(tab));
}

export function normalizeRightPaneTab(tab: WorkbenchRightPaneTab): WorkbenchRightPaneTab {
  return tab;
}
