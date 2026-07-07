// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { invoke } from "@tauri-apps/api/core";
import {
  buildSseUrl,
  fetchJSON,
  hasTauri,
  normalizeStudioEvent,
  normalizeStudioTraceSnapshot,
} from "./internal-helpers";
import type {
  HarnessId,
  SessionSummary,
  StudioAction,
  StudioAttachment,
  StudioAttachmentCaptureRequest,
  StudioChatMode,
  StudioEffort,
  StudioEvent,
  StudioPermissionMode,
  StudioSessionMode,
  StudioTraceSnapshot,
} from "./shared-types";

export async function startSession(
  input: { harness: HarnessId; cwd: string; prompt: string; action?: StudioAction; mode?: StudioSessionMode; chatMode?: StudioChatMode; permissionMode?: StudioPermissionMode; attachments?: StudioAttachment[]; conversationId?: string; goal?: string; model?: string | null; effort?: StudioEffort },
  options: { signal?: AbortSignal } = {},
): Promise<SessionSummary> {
  const payload = await fetchJSON<{ session: SessionSummary }>("/api/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal: options.signal,
  });
  return payload.session;
}

export async function captureAttachment(input: StudioAttachmentCaptureRequest): Promise<StudioAttachment> {
  try {
    const payload = await fetchJSON<{ attachment: StudioAttachment }>("/api/attachments/capture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return payload.attachment;
  } catch (error) {
    if (!hasTauri()) throw error;
    return invoke<StudioAttachment>("capture_attachment", { payload: input });
  }
}

export async function getAttachment(id: string): Promise<StudioAttachment> {
  try {
    const payload = await fetchJSON<{ attachment: StudioAttachment }>(`/api/attachments/${encodeURIComponent(id)}`);
    return payload.attachment;
  } catch (error) {
    if (!hasTauri()) throw error;
    return invoke<StudioAttachment>("get_attachment", { id });
  }
}

export async function listSessions(): Promise<SessionSummary[]> {
  const payload = await fetchJSON<{ sessions: SessionSummary[] }>("/api/sessions");
  return payload.sessions;
}

export async function getSessionEvents(id: string, limit = 160): Promise<{ session: SessionSummary; events: StudioEvent[] }> {
  const payload = await fetchJSON<{ session: SessionSummary; events: StudioEvent[] }>(
    `/api/sessions/${encodeURIComponent(id)}/events?limit=${encodeURIComponent(String(limit))}`,
  );
  return { ...payload, events: payload.events.map(normalizeStudioEvent) };
}

export async function getSessionTrace(id: string): Promise<{ session: SessionSummary; trace: StudioTraceSnapshot }> {
  const payload = await fetchJSON<{ session: SessionSummary; trace: StudioTraceSnapshot }>(
    `/api/sessions/${encodeURIComponent(id)}/trace`,
  );
  return { ...payload, trace: normalizeStudioTraceSnapshot(payload.trace) };
}

export async function cancelSession(id: string): Promise<boolean> {
  const payload = await fetchJSON<{ cancelled: boolean }>(`/api/sessions/${encodeURIComponent(id)}/cancel`, { method: "POST" });
  return payload.cancelled;
}

export async function resolveApproval(
  sessionId: string,
  callId: string,
  decision: "approve" | "deny",
): Promise<{ resolved: boolean; status: "approved" | "denied" | "unknown" }> {
  return fetchJSON<{ resolved: boolean; status: "approved" | "denied" | "unknown" }>(
    `/api/sessions/${encodeURIComponent(sessionId)}/approvals/${encodeURIComponent(callId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    },
  );
}

export function subscribeSession(id: string, onEvent: (event: StudioEvent) => void): () => void {
  const source = new EventSource(buildSseUrl(`/api/sessions/${encodeURIComponent(id)}/events`));
  const types = [
    "session_started",
    "session_queued",
    "reference_trace",
    "stdout",
    "stderr",
    "package_log",
    "harness_log",
    "auth_status",
    "reasoning",
    "tool_call",
    "tool_result",
    "approval_request",
    "approval_resolved",
    "artifact",
    "design_system_artifact",
    "file_change",
    "screenshot",
    "browser_snapshot",
    "mcp_call",
    "design_preview",
    "research_note",
    "design_decision",
    "acceptance_statement",
    "token_usage",
    "session_result",
    "session_done",
    "session_error",
    "video_project_created",
    "video_render_started",
    "video_render_completed",
    "video_render_failed",
  ];
  for (const type of types) {
    source.addEventListener(type, (message) => {
      onEvent(normalizeStudioEvent(JSON.parse((message as MessageEvent).data) as StudioEvent));
    });
  }
  return () => source.close();
}
