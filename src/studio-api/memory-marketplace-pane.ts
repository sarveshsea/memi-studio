// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { buildSseUrl, fetchJSON } from "./internal-helpers";
import type {
  MarketplaceNotesPayload,
  NoteForkDiff,
  NoteForkFile,
  NoteForkPrHandoff,
  NoteForkSummary,
  NoteForkValidation,
  ProjectMemoryIndex,
  ProjectMemoryItem,
  StudioDownloadEvent,
  StudioDownloadJob,
  StudioKnowledgeIndex,
  StudioKnowledgeItem,
} from "./shared-types";

export async function getProjectMemory(): Promise<ProjectMemoryIndex> {
  return fetchJSON<ProjectMemoryIndex>("/api/project-memory");
}

export async function refreshProjectMemory(): Promise<ProjectMemoryIndex> {
  return fetchJSON<ProjectMemoryIndex>("/api/project-memory/refresh", { method: "POST" });
}

export async function getMarketplaceNotes(options: { refresh?: boolean } = {}): Promise<MarketplaceNotesPayload> {
  return fetchJSON<MarketplaceNotesPayload>(`/api/marketplace/notes${options.refresh ? "?refresh=1" : ""}`);
}

export async function installMarketplaceNote(input: { noteId?: string; source?: string }): Promise<{ job: StudioDownloadJob; marketplace: MarketplaceNotesPayload }> {
  return fetchJSON<{ job: StudioDownloadJob; marketplace: MarketplaceNotesPayload }>("/api/marketplace/notes/install", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function forkMarketplaceNote(noteId: string): Promise<{ fork: NoteForkSummary; marketplace: MarketplaceNotesPayload }> {
  return fetchJSON<{ fork: NoteForkSummary; marketplace: MarketplaceNotesPayload }>("/api/marketplace/notes/fork", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ noteId }),
  });
}

export async function listNoteForks(): Promise<NoteForkSummary[]> {
  const payload = await fetchJSON<{ forks: NoteForkSummary[] }>("/api/marketplace/notes/forks");
  return payload.forks;
}

export async function getNoteForkFiles(name: string): Promise<NoteForkFile[]> {
  const payload = await fetchJSON<{ files: NoteForkFile[] }>(`/api/marketplace/notes/forks/${encodeURIComponent(name)}/files`);
  return payload.files;
}

export async function updateNoteForkFile(name: string, input: { path: string; content: string }): Promise<NoteForkFile> {
  const payload = await fetchJSON<{ file: NoteForkFile }>(`/api/marketplace/notes/forks/${encodeURIComponent(name)}/files`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return payload.file;
}

export async function getNoteForkDiff(name: string): Promise<NoteForkDiff> {
  const payload = await fetchJSON<{ diff: NoteForkDiff }>(`/api/marketplace/notes/forks/${encodeURIComponent(name)}/diff`);
  return payload.diff;
}

export async function validateNoteFork(name: string): Promise<NoteForkValidation> {
  const payload = await fetchJSON<{ validation: NoteForkValidation }>(`/api/marketplace/notes/forks/${encodeURIComponent(name)}/validate`, {
    method: "POST",
  });
  return payload.validation;
}

export async function exportNoteForkPr(name: string): Promise<NoteForkPrHandoff> {
  const payload = await fetchJSON<{ handoff: NoteForkPrHandoff }>(`/api/marketplace/notes/forks/${encodeURIComponent(name)}/export-pr`, {
    method: "POST",
  });
  return payload.handoff;
}

export function subscribeDownloadEvents(id: string, onEvent: (event: StudioDownloadEvent) => void): () => void {
  const source = new EventSource(buildSseUrl(`/api/downloads/${encodeURIComponent(id)}/events`));
  for (const type of ["queued", "progress", "completed", "failed"]) {
    source.addEventListener(type, (message) => {
      onEvent(JSON.parse((message as MessageEvent).data) as StudioDownloadEvent);
    });
  }
  source.onerror = () => source.close();
  return () => source.close();
}

export async function removeMarketplaceNote(name: string): Promise<MarketplaceNotesPayload> {
  return fetchJSON<MarketplaceNotesPayload>("/api/marketplace/notes/remove", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function getProjectMemoryItem(id: string): Promise<ProjectMemoryItem> {
  const payload = await fetchJSON<{ item: ProjectMemoryItem }>(`/api/project-memory/${encodeURIComponent(id)}`);
  return payload.item;
}

export async function getKnowledgeIndex(): Promise<StudioKnowledgeIndex> {
  return fetchJSON<StudioKnowledgeIndex>("/api/knowledge?detail=compact");
}

export async function refreshKnowledgeIndex(): Promise<StudioKnowledgeIndex> {
  return fetchJSON<StudioKnowledgeIndex>("/api/knowledge/refresh?detail=compact", { method: "POST" });
}

export async function getKnowledgeItem(id: string): Promise<StudioKnowledgeItem> {
  const payload = await fetchJSON<{ item: StudioKnowledgeItem }>(`/api/knowledge/${encodeURIComponent(id)}`);
  return payload.item;
}
