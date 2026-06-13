// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { fetchJSON, fetchWithRuntimeToken } from "./internal-helpers";
import type {
  DesignChangelogCaptureResult,
  DesignChangelogCreateInput,
  DesignChangelogEntry,
  DesignChangelogPatchInput,
  DesignSystemArtifact,
  DesignSystemArtifactReviewState,
  SessionSummary,
  StudioDesignSystemTrace,
  StudioEvent,
  StudioReviewPacket,
  StudioReviewPacketCaptureResult,
  StudioReviewPacketPatch,
} from "./shared-types";

export async function getDesignSystemTrace(): Promise<StudioDesignSystemTrace> {
  const payload = await fetchJSON<{ trace: StudioDesignSystemTrace }>("/api/design-system/trace");
  return payload.trace;
}

export async function listDesignSystemArtifacts(): Promise<DesignSystemArtifact[]> {
  const payload = await fetchJSON<{ artifacts: DesignSystemArtifact[] }>("/api/artifacts");
  return payload.artifacts;
}

export async function listDesignChangelogEntries(): Promise<DesignChangelogEntry[]> {
  try {
    const payload = await fetchJSON<{ entries: DesignChangelogEntry[] }>("/api/design-changelog");
    return payload.entries;
  } catch {
    return [];
  }
}

export async function createDesignChangelogEntry(input: DesignChangelogCreateInput): Promise<DesignChangelogEntry> {
  const payload = await fetchJSON<{ entry: DesignChangelogEntry }>("/api/design-changelog", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return payload.entry;
}

export async function updateDesignChangelogEntry(id: string, patch: DesignChangelogPatchInput): Promise<DesignChangelogEntry> {
  const payload = await fetchJSON<{ entry: DesignChangelogEntry }>(`/api/design-changelog/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  return payload.entry;
}

export async function archiveDesignChangelogEntry(id: string): Promise<DesignChangelogEntry> {
  const payload = await fetchJSON<{ entry: DesignChangelogEntry }>(`/api/design-changelog/${encodeURIComponent(id)}`, { method: "DELETE" });
  return payload.entry;
}

export async function restoreDesignChangelogEntry(id: string): Promise<DesignChangelogEntry> {
  const payload = await fetchJSON<{ entry: DesignChangelogEntry }>(`/api/design-changelog/${encodeURIComponent(id)}/restore`, { method: "POST" });
  return payload.entry;
}

export async function captureDesignChangelogEntry(input: { session?: Partial<SessionSummary> | null; events?: StudioEvent[]; event?: StudioEvent; trace?: StudioDesignSystemTrace | null }): Promise<DesignChangelogCaptureResult> {
  return fetchJSON<DesignChangelogCaptureResult>("/api/design-changelog/capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function exportDesignChangelogMarkdown(): Promise<string> {
  const response = await fetch("/api/design-changelog?format=markdown");
  if (!response.ok) throw new Error(await response.text());
  return response.text();
}

export async function listReviewPackets(): Promise<StudioReviewPacket[]> {
  const payload = await fetchJSON<{ packets: StudioReviewPacket[] }>("/api/review-packets");
  return payload.packets;
}

export async function getReviewPacket(id: string): Promise<StudioReviewPacket> {
  const payload = await fetchJSON<{ packet: StudioReviewPacket }>(`/api/review-packets/${encodeURIComponent(id)}`);
  return payload.packet;
}

export async function captureReviewPacket(input: { session?: Partial<SessionSummary> | null; events?: StudioEvent[]; event?: StudioEvent; trace?: StudioDesignSystemTrace | null }): Promise<StudioReviewPacketCaptureResult> {
  return fetchJSON<StudioReviewPacketCaptureResult>("/api/review-packets/capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateReviewPacket(id: string, patch: StudioReviewPacketPatch): Promise<StudioReviewPacket> {
  const payload = await fetchJSON<{ packet: StudioReviewPacket }>(`/api/review-packets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  return payload.packet;
}

export async function archiveReviewPacket(id: string): Promise<StudioReviewPacket> {
  const payload = await fetchJSON<{ packet: StudioReviewPacket }>(`/api/review-packets/${encodeURIComponent(id)}`, { method: "DELETE" });
  return payload.packet;
}

export async function exportReviewPacketMarkdown(id: string): Promise<string> {
  const response = await fetchWithRuntimeToken(`/api/review-packets/${encodeURIComponent(id)}/export`, { method: "POST" });
  if (!response.ok) throw new Error(await response.text());
  return response.text();
}

export async function getDesignSystemArtifact(id: string): Promise<DesignSystemArtifact> {
  const payload = await fetchJSON<{ artifact: DesignSystemArtifact }>(`/api/artifacts/${encodeURIComponent(id)}`);
  return payload.artifact;
}

export async function captureDesignSystemArtifact(input: {
  artifact?: DesignSystemArtifact;
  session?: Partial<SessionSummary> | null;
  events?: StudioEvent[];
  event?: StudioEvent;
}): Promise<DesignSystemArtifact> {
  const payload = await fetchJSON<{ artifact: DesignSystemArtifact }>("/api/artifacts/capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return payload.artifact;
}

export async function reviewDesignSystemArtifactSection(input: {
  artifactId: string;
  sectionId: string;
  reviewState: DesignSystemArtifactReviewState;
  comment?: string | null;
}): Promise<DesignSystemArtifact> {
  const payload = await fetchJSON<{ artifact: DesignSystemArtifact }>(
    `/api/artifacts/${encodeURIComponent(input.artifactId)}/sections/${encodeURIComponent(input.sectionId)}/review`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewState: input.reviewState, comment: input.comment ?? null }),
    },
  );
  return payload.artifact;
}
