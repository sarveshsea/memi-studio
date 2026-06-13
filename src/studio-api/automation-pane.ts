// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { fetchJSON } from "./internal-helpers";
import type {
  StudioAutomationDefinition,
  StudioAutomationRun,
  StudioAutomationSchedulerStatus,
  StudioAutomationTemplate,
} from "./shared-types";

export async function getAutomationTemplates(): Promise<StudioAutomationTemplate[]> {
  const payload = await fetchJSON<{ templates: StudioAutomationTemplate[] }>("/api/automations/templates");
  return payload.templates;
}

export async function listAutomations(): Promise<StudioAutomationDefinition[]> {
  const payload = await fetchJSON<{ automations: StudioAutomationDefinition[] }>("/api/automations");
  return payload.automations;
}

export async function createAutomation(input: Partial<StudioAutomationDefinition> & { templateId?: string }): Promise<StudioAutomationDefinition> {
  const payload = await fetchJSON<{ automation: StudioAutomationDefinition }>("/api/automations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return payload.automation;
}

export async function updateAutomation(id: string, patch: Partial<StudioAutomationDefinition>): Promise<StudioAutomationDefinition> {
  const payload = await fetchJSON<{ automation: StudioAutomationDefinition }>(`/api/automations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  return payload.automation;
}

export async function deleteAutomation(id: string): Promise<boolean> {
  const payload = await fetchJSON<{ deleted: boolean }>(`/api/automations/${encodeURIComponent(id)}`, { method: "DELETE" });
  return payload.deleted;
}

export async function runAutomationNow(id: string): Promise<StudioAutomationRun> {
  const payload = await fetchJSON<{ run: StudioAutomationRun }>(`/api/automations/${encodeURIComponent(id)}/run`, { method: "POST" });
  return payload.run;
}

export async function listAutomationRuns(id: string): Promise<StudioAutomationRun[]> {
  const payload = await fetchJSON<{ runs: StudioAutomationRun[] }>(`/api/automations/${encodeURIComponent(id)}/runs`);
  return payload.runs;
}

export async function getAutomationSchedulerStatus(): Promise<StudioAutomationSchedulerStatus> {
  const payload = await fetchJSON<{ scheduler: StudioAutomationSchedulerStatus }>("/api/automations/scheduler/status");
  return payload.scheduler;
}

export async function installAutomationScheduler(): Promise<StudioAutomationSchedulerStatus> {
  const payload = await fetchJSON<{ scheduler: StudioAutomationSchedulerStatus }>("/api/automations/scheduler/install", { method: "POST" });
  return payload.scheduler;
}

export async function uninstallAutomationScheduler(): Promise<StudioAutomationSchedulerStatus> {
  const payload = await fetchJSON<{ scheduler: StudioAutomationSchedulerStatus }>("/api/automations/scheduler/uninstall", { method: "POST" });
  return payload.scheduler;
}
