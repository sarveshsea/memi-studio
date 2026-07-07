// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Error taxonomy — classifies a caught error into one of five kinds so the
// UI can show a specific recovery action instead of a raw string or nothing
// at all. Generalizes the existing isWorkspaceAccessBlockedMessage heuristic
// (App.tsx) into a broader classifier used by the notification center.

export type StudioErrorKind =
  | "runtime-offline"
  | "auth-required"
  | "workspace-missing"
  | "bridge-timeout"
  | "engine-error";

export interface StudioError {
  kind: StudioErrorKind;
  message: string;
  detail?: string;
  recoveryActionId?: string;
  timestamp: string;
}

export interface ClassifyErrorContext {
  hasWorkspace?: boolean;
  /** "offline" | "starting" | "ready" | "degraded" — the app's RuntimeHealth union, duplicated here to avoid importing from App.tsx. */
  runtimeHealth?: string;
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Recovery action ids follow the same data-action-id convention used throughout App.tsx, so a notification can render a "fix it" button by id. */
const RECOVERY_ACTION_BY_KIND: Record<StudioErrorKind, string | undefined> = {
  "runtime-offline": "runtime.restart",
  "auth-required": "harness.reauthenticate",
  "workspace-missing": "welcome.open-folder",
  "bridge-timeout": "settings.open.figma",
  "engine-error": undefined,
};

export function classifyError(err: unknown, context: ClassifyErrorContext = {}): StudioError {
  const message = messageOf(err);
  const normalized = message.toLowerCase();
  const timestamp = new Date().toISOString();

  let kind: StudioErrorKind = "engine-error";
  if (!context.hasWorkspace && /open a folder|no workspace|workspace root/.test(normalized)) {
    kind = "workspace-missing";
  } else if (/macos blocked access/.test(normalized) && /(saved workspace|workspace|removable|network volumes?)/.test(normalized)) {
    kind = "workspace-missing";
  } else if (context.runtimeHealth === "offline" || context.runtimeHealth === "degraded" || /runtime (unavailable|did not answer|is not running)|failed to fetch|econnrefused/.test(normalized)) {
    kind = "runtime-offline";
  } else if (/needs login|needs_login|not authenticated|unauthorized|401/.test(normalized)) {
    kind = "auth-required";
  } else if (/figma|bridge/.test(normalized) && /timeout|timed out|not connected/.test(normalized)) {
    kind = "bridge-timeout";
  }

  return {
    kind,
    message,
    timestamp,
    recoveryActionId: RECOVERY_ACTION_BY_KIND[kind],
  };
}
