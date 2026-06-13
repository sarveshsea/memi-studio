// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { invoke } from "@tauri-apps/api/core";
import {
  fetchJSON,
  fetchRuntimeStatusWithoutToken,
  hasTauri,
  setRuntimeApiToken,
} from "./internal-helpers";
import type {
  DesktopAppConfig,
  StudioRecentWorkspace,
  StudioRuntimeMetrics,
  StudioRuntimeStatus,
  StudioStatus,
  StudioWorkspacePermissions,
  StudioWorkspaceResult,
} from "./shared-types";

export async function getStatus(): Promise<StudioStatus> {
  if (hasTauri()) {
    const shellStatus = await invoke<StudioStatus>("studio_status");
    if (shellStatus.runtime?.status === "running") return shellStatus;
    const runtimeStatus = await fetchRuntimeStatusWithoutToken();
    if (!runtimeStatus || !["ready", "running"].includes(runtimeStatus.status) || runtimeStatus.projectRoot !== shellStatus.projectRoot) {
      return shellStatus;
    }
    const shellRuntime = shellStatus.runtime;
    return {
      ...shellStatus,
      status: runtimeStatus.status,
      config: runtimeStatus.config ?? shellStatus.config,
      harnesses: runtimeStatus.harnesses ?? shellStatus.harnesses,
      security: runtimeStatus.security ?? shellStatus.security,
      metrics: runtimeStatus.metrics ?? shellStatus.metrics,
      runtime: {
        status: "running",
        port: shellRuntime?.port ?? 8765,
        url: shellRuntime?.url ?? "http://127.0.0.1:8765",
        pid: shellRuntime?.pid ?? null,
        workspaceRoot: shellRuntime?.workspaceRoot ?? runtimeStatus.projectRoot,
        apiToken: shellRuntime?.apiToken ?? null,
        packageRoot: shellRuntime?.packageRoot ?? null,
        runtimeBinary: shellRuntime?.runtimeBinary ?? null,
        runtimeSource: shellRuntime?.runtimeSource ?? "runtime-api",
        runtimeCacheRoot: shellRuntime?.runtimeCacheRoot ?? null,
        supervisorPhase: shellRuntime?.supervisorPhase ?? "runtime-api-reconciled",
        startupStartedAt: shellRuntime?.startupStartedAt ?? null,
        startupMs: shellRuntime?.startupMs ?? null,
        cachePrepareMs: shellRuntime?.cachePrepareMs ?? null,
        error: null,
      },
    };
  }
  return fetchJSON<StudioStatus>("/api/status");
}

export async function getRuntimeMetrics(): Promise<StudioRuntimeMetrics> {
  if (hasTauri()) {
    const status = await fetchJSON<StudioStatus>("/api/status");
    if (!status.metrics) throw new Error("Studio runtime metrics are unavailable");
    return status.metrics;
  }
  const status = await getStatus();
  if (!status.metrics) throw new Error("Studio runtime metrics are unavailable");
  return status.metrics;
}

export async function getRuntimeStatus(): Promise<StudioRuntimeStatus | null> {
  if (!hasTauri()) return null;
  return invoke<StudioRuntimeStatus>("studio_runtime_status");
}

export function canRestartStudioRuntime(): boolean {
  return hasTauri();
}

export async function restartStudioRuntime(): Promise<StudioRuntimeStatus | null> {
  if (!hasTauri()) return null;
  setRuntimeApiToken(undefined);
  const status = await invoke<StudioRuntimeStatus>("restart_studio_runtime");
  setRuntimeApiToken(status.apiToken ?? null);
  return status;
}

export async function loadAppConfig(): Promise<DesktopAppConfig | null> {
  if (!hasTauri()) return null;
  return invoke<DesktopAppConfig>("load_app_config");
}

export async function saveAppConfig(config: DesktopAppConfig): Promise<DesktopAppConfig> {
  return invoke<DesktopAppConfig>("save_app_config", { config });
}

export async function selectWorkspace(): Promise<DesktopAppConfig> {
  const result = await openWorkspace();
  return result.config ?? {
    schemaVersion: 1,
    workspaceRoot: result.workspace.path,
    recentWorkspaces: result.recent,
  };
}

export async function listRecentWorkspaces(): Promise<StudioRecentWorkspace[]> {
  if (hasTauri()) {
    const payload = await invoke<{ workspaces: StudioRecentWorkspace[] }>("list_recent_workspaces");
    return payload.workspaces ?? [];
  }
  const payload = await fetchJSON<{ workspaces: StudioRecentWorkspace[] }>("/api/workspaces/recent");
  return payload.workspaces ?? [];
}

export async function getWorkspacePermissions(): Promise<StudioWorkspacePermissions> {
  const payload = await fetchJSON<{ permissions: StudioWorkspacePermissions }>("/api/workspaces/permissions");
  return payload.permissions;
}

export async function openWorkspace(path?: string): Promise<StudioWorkspaceResult> {
  if (hasTauri()) {
    setRuntimeApiToken(undefined);
    const result = await invoke<StudioWorkspaceResult>("open_workspace", { path: path ?? null });
    setRuntimeApiToken(result.runtime?.apiToken ?? undefined);
    return result;
  }
  const requested = path ?? window.prompt("Open folder path") ?? "";
  return fetchJSON<StudioWorkspaceResult>("/api/workspaces/open", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: requested }),
  });
}

export async function createWorkspace(input: { parentPath?: string | null; name: string }): Promise<StudioWorkspaceResult> {
  if (hasTauri()) {
    setRuntimeApiToken(undefined);
    const result = await invoke<StudioWorkspaceResult>("create_workspace", {
      parentPath: input.parentPath ?? null,
      name: input.name,
    });
    setRuntimeApiToken(result.runtime?.apiToken ?? undefined);
    return result;
  }
  return fetchJSON<StudioWorkspaceResult>("/api/workspaces/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ parentPath: input.parentPath ?? null, name: input.name }),
  });
}
