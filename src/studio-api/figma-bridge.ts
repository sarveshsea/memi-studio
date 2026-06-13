// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { fetchJSON } from "./internal-helpers";
import type {
  FigmaActionRequest,
  FigmaActionResult,
  FigmaOpenResult,
  FigmaStatus,
} from "./shared-types";

export async function getFigmaStatus(): Promise<FigmaStatus> {
  return fetchJSON<FigmaStatus>("/api/figma/status");
}

export async function connectFigma(preferredPort?: number | null): Promise<FigmaStatus> {
  return fetchJSON<FigmaStatus>("/api/figma/connect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ preferredPort: preferredPort ?? null }),
  });
}

export async function disconnectFigma(): Promise<FigmaStatus> {
  return fetchJSON<FigmaStatus>("/api/figma/disconnect", { method: "POST" });
}

export async function runFigmaAction(input: FigmaActionRequest): Promise<FigmaActionResult> {
  return fetchJSON<FigmaActionResult>("/api/figma/action", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function openFigma(fileKey?: string | null): Promise<FigmaOpenResult> {
  return fetchJSON<FigmaOpenResult>("/api/figma/open", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileKey: fileKey ?? null }),
  });
}
