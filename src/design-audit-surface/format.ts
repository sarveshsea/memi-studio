// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import type { StudioAppQualityIssue, StudioAppQualitySeverity } from "../studio-api/shared-types";

const SEVERITY_ORDER: StudioAppQualitySeverity[] = ["critical", "high", "medium", "low"];

export function severityOrder(): StudioAppQualitySeverity[] {
  return SEVERITY_ORDER;
}

export function groupIssuesBySeverity(
  issues: StudioAppQualityIssue[],
): Record<StudioAppQualitySeverity, StudioAppQualityIssue[]> {
  const grouped: Record<StudioAppQualitySeverity, StudioAppQualityIssue[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };
  for (const issue of issues) {
    grouped[issue.severity].push(issue);
  }
  return grouped;
}

export interface ScoreDelta {
  label: string;
  direction: "up" | "down" | "flat";
}

export function formatScoreDelta(current: number, previous: number | null): ScoreDelta {
  if (previous === null) return { label: "—", direction: "flat" };
  const delta = current - previous;
  if (delta > 0) return { label: `+${delta}`, direction: "up" };
  if (delta < 0) return { label: `${delta}`, direction: "down" };
  return { label: "±0", direction: "flat" };
}

export type VerdictTone = "good" | "warn" | "critical";

export function verdictTone(score: number): VerdictTone {
  if (score >= 90) return "good";
  if (score >= 70) return "warn";
  return "critical";
}
