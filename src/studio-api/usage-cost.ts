// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { fetchJSON } from "./internal-helpers";
import type { StudioUsageSnapshot } from "./shared-types";

export async function getUsageSnapshot(): Promise<StudioUsageSnapshot> {
  try {
    const payload = await fetchJSON<{ usage: StudioUsageSnapshot }>("/api/usage");
    return payload.usage;
  } catch {
    return emptyUsageSnapshot();
  }
}

function emptyUsageSnapshot(): StudioUsageSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    sessions: [],
    totals: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
      reasoningTokens: 0,
      estimatedCostUsd: 0,
    },
    byHarness: {},
    byProvider: {},
    rateLimits: [],
    budgets: {
      warningThreshold: 0.8,
      providers: {},
      harnesses: {},
    },
  };
}
