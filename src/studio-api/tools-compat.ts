// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { fetchJSON } from "./internal-helpers";
import type {
  StudioCompatibilitySnapshot,
  StudioToolCallRequest,
  StudioToolCallResult,
  StudioToolDefinition,
} from "./shared-types";

export async function listStudioTools(): Promise<StudioToolDefinition[]> {
  const payload = await fetchJSON<{ tools: StudioToolDefinition[] }>("/api/tools");
  return payload.tools;
}

export async function callStudioTool(input: StudioToolCallRequest): Promise<StudioToolCallResult> {
  const payload = await fetchJSON<{ call: StudioToolCallResult }>("/api/tools/call", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return payload.call;
}

export async function getCompatibility(options: { refresh?: boolean } = {}): Promise<StudioCompatibilitySnapshot> {
  const payload = await fetchJSON<{ compatibility: StudioCompatibilitySnapshot }>(`/api/compatibility${options.refresh ? "?refresh=1" : ""}`);
  return payload.compatibility;
}
