// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import type { Harness, HarnessId, SessionSummary, StudioAction, StudioChatMode, StudioPermissionMode } from "./studio-api";
import type { WORKBENCH_COPY, WorkbenchIconName, WorkbenchModePreset, WorkbenchStarterPrompt } from "./workbench-copy";

export const PRIMARY_HARNESS_IDS = ["codex", "claude-code"] as const satisfies HarnessId[];
export const COMPOSER_HARNESS_IDS = ["codex", "claude-code", "ollama", "opencode"] as const satisfies HarnessId[];
export const PERSISTENT_COMPOSER_HARNESS_IDS = ["codex", "claude-code", "ollama"] as const satisfies HarnessId[];
export const DEFAULT_PRIMARY_HARNESS_ID: HarnessId = "codex";
export const DEFAULT_COMPOSER_PRESET_ID = "build";
export const DEFAULT_COMPOSER_STATE = {
  action: "app-build",
  chatMode: "build",
  permissionMode: "guarded",
} as const satisfies ComposerRunState;

export type HarnessVisibility = "primary" | "advanced";
export type ComposerHarnessTier = "primary" | "local" | "advanced";
export interface ComposerRunState {
  action: StudioAction;
  chatMode: StudioChatMode;
  permissionMode: StudioPermissionMode;
}
export interface ComposerChipAction {
  id: string;
  label: string;
  shortLabel?: string;
  ariaLabel: string;
  title: string;
  icon: WorkbenchIconName;
  iconOnly: boolean;
}

export const DEFAULT_RIGHT_PANE_TAB_IDS = ["run", "changes", "memory"] as const;
export type WorkbenchRightPaneTab = (typeof WORKBENCH_COPY.rightPaneTabs)[number]["id"];

export function isPrimaryHarness(id: string): boolean {
  return (PRIMARY_HARNESS_IDS as readonly string[]).includes(id);
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

export function composerSwitcherHarnesses(harnesses: Harness[]): Harness[] {
  return composerHarnesses(harnesses).filter((harness) => isPersistentComposerHarness(harness.id) || harness.enabled);
}

export function researchLabHarness(harnesses: Harness[], selectedHarnessId: HarnessId): Harness | null {
  const byId = new Map(harnesses.map((harness) => [harness.id, harness]));
  const selected = byId.get(selectedHarnessId);
  if (selected?.enabled && harnessVisibility(selected) === "primary") return selected;
  return PRIMARY_HARNESS_IDS.map((id) => byId.get(id)).find((harness): harness is Harness => Boolean(harness?.enabled)) ?? primaryHarnesses(harnesses)[0] ?? null;
}

export function isPersistentComposerHarness(id: string): boolean {
  return (PERSISTENT_COMPOSER_HARNESS_IDS as readonly string[]).includes(id);
}

export function composerHarnessTier(id: string): ComposerHarnessTier {
  if (isPrimaryHarness(id)) return "primary";
  if (id === "ollama") return "local";
  return "advanced";
}

export function composerHarnessShortLabel(id: string, label = id): string {
  if (id === "codex") return "CX";
  if (id === "claude-code") return "CL";
  if (id === "ollama") return "OL";
  if (id === "opencode") return "OC";
  return label
    .split(/[\s_-]+/u)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || id.slice(0, 2).toUpperCase();
}

export function composerStarterAction(starter: WorkbenchStarterPrompt, index: number): ComposerChipAction {
  return {
    id: `starter.prompt.${index}`,
    label: starter.label,
    shortLabel: starter.shortLabel,
    ariaLabel: starter.label,
    title: starter.template,
    icon: starter.icon,
    iconOnly: true,
  };
}

export function modePresetIdForComposerState(
  presets: readonly WorkbenchModePreset[],
  state: ComposerRunState,
): WorkbenchModePreset["id"] | null {
  return presets.find((preset) =>
    preset.action === state.action
    && preset.chatMode === state.chatMode
    && preset.permissionMode === state.permissionMode,
  )?.id ?? null;
}

export function composerStateForSession(
  session: Pick<SessionSummary, "action" | "chatMode" | "permissionMode">,
  presets: readonly WorkbenchModePreset[],
): ComposerRunState {
  const action = (session.action as StudioAction | undefined) ?? DEFAULT_COMPOSER_STATE.action;
  const actionPreset = presets.find((preset) => preset.action === action);
  return {
    action,
    chatMode: session.chatMode ?? actionPreset?.chatMode ?? DEFAULT_COMPOSER_STATE.chatMode,
    permissionMode: session.permissionMode ?? actionPreset?.permissionMode ?? DEFAULT_COMPOSER_STATE.permissionMode,
  };
}

export function currentWorkspaceProject(
  currentWorkspace: string | null | undefined,
  sessions: Array<Pick<SessionSummary, "cwd">>,
): { id: string; label: string; path: string } | null {
  const path = normalizeWorkspacePath(currentWorkspace);
  if (!path) return null;
  const hasHydratedProject = sessions.some((session) => normalizeWorkspacePath(session.cwd) === path);
  if (hasHydratedProject) return null;
  return {
    id: path,
    label: workspaceProjectName(path),
    path,
  };
}

export function runVerificationMarker(value: string): string | null {
  return value.match(/\bMEMI_[A-Z0-9_]*(?:OK|DONE)(?:_[A-Z0-9]+)*\b/)?.[0] ?? null;
}

export function isVerificationRunText(value: string): boolean {
  return Boolean(runVerificationMarker(value)) || /smoke|e2e proof|verification/i.test(value);
}

export function isVerificationSession(session: Pick<SessionSummary, "prompt" | "conversationId">): boolean {
  return isVerificationRunText(`${session.prompt} ${session.conversationId ?? ""}`);
}

export function sidebarNavigationSessions(sessions: SessionSummary[], currentSessionId: string | null): SessionSummary[] {
  return sessions.filter((session) => {
    if (session.id === currentSessionId) return true;
    if (isVerificationSession(session)) return false;
    return isDefaultOpenableSession(session);
  });
}

export function defaultWorkbenchSession(sessions: SessionSummary[]): SessionSummary | null {
  return sessions.find((session) => !isVerificationSession(session) && isDefaultOpenableSession(session)) ?? null;
}

function isDefaultOpenableSession(session: Pick<SessionSummary, "status">): boolean {
  return !["failed", "cancelled", "interrupted"].includes(session.status);
}

export function compactRunLabel(value: string, harness?: HarnessId, maxLength = 32): string {
  if (runVerificationMarker(value)) return `${shortHarnessName(harness)} check`;
  if (/live studio agent smoke/i.test(value)) return `${shortHarnessName(harness)} live check`;
  if (/live e2e proof/i.test(value)) return `${shortHarnessName(harness)} E2E proof`;
  if (/lifecycle smoke/i.test(value)) return `${shortHarnessName(harness)} lifecycle`;
  if (/smoke test/i.test(value)) return `${shortHarnessName(harness)} smoke`;
  return trimRunText(value, maxLength);
}

export function compactRunSummary(value: string | null | undefined, harness?: HarnessId, maxLength = 180): string | null {
  if (!value?.trim()) return null;
  if (runVerificationMarker(value)) return `${shortHarnessName(harness)} check passed`;
  if (/live studio agent smoke/i.test(value)) return `${shortHarnessName(harness)} live check`;
  if (/live e2e proof/i.test(value)) return `${shortHarnessName(harness)} E2E proof`;
  if (/lifecycle smoke/i.test(value)) return `${shortHarnessName(harness)} lifecycle check`;
  if (/smoke test/i.test(value)) return `${shortHarnessName(harness)} smoke check`;
  return trimRunText(value, maxLength);
}

export function isQueueDockSession(session: Pick<SessionSummary, "status">): boolean {
  return session.status === "running" || session.status === "queued";
}

function shortHarnessName(harness?: HarnessId): string {
  if (harness === "codex") return "Codex";
  if (harness === "claude-code") return "Claude";
  if (harness === "ollama") return "Ollama";
  if (harness === "opencode") return "OpenCode";
  return "Run";
}

function trimRunText(value: string, maxLength: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeWorkspacePath(value: string | null | undefined): string {
  return value?.replaceAll("\\", "/").replace(/\/+$/u, "") ?? "";
}

function workspaceProjectName(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? "workspace";
}

export function normalizePrimaryHarness(id: HarnessId, harnesses: Harness[]): HarnessId {
  if (isPrimaryHarness(id) && harnesses.some((harness) => harness.id === id)) return id;
  if (harnesses.some((harness) => harness.id === DEFAULT_PRIMARY_HARNESS_ID)) return DEFAULT_PRIMARY_HARNESS_ID;
  return primaryHarnesses(harnesses)[0]?.id ?? DEFAULT_PRIMARY_HARNESS_ID;
}

export function normalizeComposerHarness(id: HarnessId, harnesses: Harness[]): HarnessId {
  if (composerSwitcherHarnesses(harnesses).some((harness) => harness.id === id)) return id;
  return normalizePrimaryHarness(id, harnesses);
}

export function isDefaultWorkbenchPane(tab: WorkbenchRightPaneTab): boolean {
  return (DEFAULT_RIGHT_PANE_TAB_IDS as readonly string[]).includes(normalizeRightPaneTab(tab));
}

export function normalizeRightPaneTab(tab: WorkbenchRightPaneTab): WorkbenchRightPaneTab {
  return tab;
}
