// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { fetchJSON, fetchWithRuntimeToken } from "./internal-helpers";
import type { StudioDesignAuditResult } from "./shared-types";

export async function runDesignAudit(
  options: { maxFiles?: number } = {},
  requestOptions: { signal?: AbortSignal } = {},
): Promise<StudioDesignAuditResult> {
  return fetchJSON<StudioDesignAuditResult>("/api/design-audit/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(options),
    signal: requestOptions.signal,
  });
}

// Bypasses the shared fetchJSON helper (matching the precedent in
// design-system-pane.ts's exportReviewPacketMarkdown): "never run yet" is a
// legitimate, expected first-run state signaled via a 404, not an error to
// throw and catch — the caller needs to tell it apart from a real failure.
export async function getLatestDesignAudit(): Promise<StudioDesignAuditResult | null> {
  const response = await fetchWithRuntimeToken("/api/design-audit/latest");
  if (response.status === 404) return null;
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(payload.error ?? response.statusText);
  }
  return response.json() as Promise<StudioDesignAuditResult>;
}

export async function acceptDesignAuditBaseline(): Promise<{ baseline: unknown }> {
  return fetchJSON<{ baseline: unknown }>("/api/design-audit/accept-baseline", { method: "POST" });
}
