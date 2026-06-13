// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { invoke } from "@tauri-apps/api/core";
import { fetchJSON, hasTauri, normalizeHarnessStatus } from "./internal-helpers";
import { getStatus } from "./core-runtime";
import type {
  AgentInstallTarget,
  AgentInstallTargetInput,
  AgentKitInstallResult,
  AgentKitPlansPayload,
  Harness,
  HarnessId,
  HarnessModelRegistry,
  StudioEffort,
  StudioHarnessDiagnostic,
  StudioHarnessSetupPlan,
} from "./shared-types";

export const AGENT_KIT_TARGETS: AgentInstallTarget[] = [
  "hermes",
  "openclaw",
  "claude-code",
  "cursor",
  "codex",
  "opencode",
];

export async function listHarnesses(options: { refresh?: boolean } = {}): Promise<Harness[]> {
  const payload = await fetchJSON<{ harnesses: Harness[] }>(`/api/harnesses${options.refresh ? "?refresh=1" : ""}`);
  return payload.harnesses.map(normalizeHarnessStatus);
}

export async function getHarnessSetupPlan(harnessId: HarnessId, options: { refresh?: boolean } = {}): Promise<StudioHarnessSetupPlan> {
  const payload = await fetchJSON<{ setupPlan: StudioHarnessSetupPlan }>(`/api/harnesses/${encodeURIComponent(harnessId)}/setup-plan${options.refresh ? "?refresh=1" : ""}`);
  return payload.setupPlan;
}

export async function diagnoseHarness(harnessId: HarnessId, options: { refresh?: boolean } = {}): Promise<StudioHarnessDiagnostic> {
  const payload = await fetchJSON<{ diagnostic: StudioHarnessDiagnostic }>(`/api/harnesses/${encodeURIComponent(harnessId)}/diagnose${options.refresh ? "?refresh=1" : ""}`);
  return payload.diagnostic;
}

export async function getAgentKitPlans(input: { target?: AgentInstallTargetInput; force?: boolean; global?: boolean } = {}): Promise<AgentKitPlansPayload> {
  const target = input.target ?? "all";
  if (hasTauri()) {
    const status = await getStatus();
    const result = await invoke<AgentKitInstallResult>("agent_install", {
      target,
      project: status.projectRoot,
      dryRun: true,
      force: Boolean(input.force),
    });
    return {
      targets: ["hermes", "openclaw", "claude-code", "cursor", "codex", "opencode"],
      projectRoot: status.projectRoot,
      suiteManifest: result.suiteManifest,
      plans: result.plans,
    };
  }
  const params = new URLSearchParams({
    target,
    force: String(Boolean(input.force)),
    global: String(Boolean(input.global)),
  });
  return fetchJSON<AgentKitPlansPayload>(`/api/agents/kits?${params}`);
}

export async function installAgentKit(input: {
  target: AgentInstallTargetInput;
  dryRun?: boolean;
  force?: boolean;
  global?: boolean;
  project?: string;
}): Promise<AgentKitInstallResult> {
  if (hasTauri()) {
    const status = await getStatus();
    return invoke<AgentKitInstallResult>("agent_install", {
      target: input.target,
      project: input.project ?? status.projectRoot,
      dryRun: Boolean(input.dryRun),
      force: Boolean(input.force),
    });
  }
  return fetchJSON<AgentKitInstallResult>("/api/agents/kits/install", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export const EFFORT_OPTIONS_FOR_HARNESS: Record<HarnessId, StudioEffort[]> = {
  memoire: [],
  "claude-code": [],
  codex: ["minimal", "low", "medium", "high", "xhigh"],
  opencode: [],
  gemini: [],
  ollama: [],
  hermes: [],
  shell: [],
};

export function effortOptionsForRegistry(registry: HarnessModelRegistry | null, modelId: string | null | undefined): StudioEffort[] {
  if (!registry) return [];
  if (registry.supportsEffort) return ["minimal", "low", "medium", "high", "xhigh"];
  const model = registry.models.find((candidate) => candidate.id === modelId);
  return model?.supportsEffort ? ["low", "medium", "high"] : [];
}

export async function listHarnessModels(harness: HarnessId): Promise<HarnessModelRegistry> {
  return fetchJSON<HarnessModelRegistry>(`/api/harnesses/${encodeURIComponent(harness)}/models`);
}
