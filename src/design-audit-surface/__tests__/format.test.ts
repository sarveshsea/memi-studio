// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { describe, expect, it } from "vitest";
import { formatScoreDelta, groupIssuesBySeverity, severityOrder, verdictTone } from "../format";
import type { StudioAppQualityIssue } from "../../studio-api/shared-types";

function makeIssue(overrides: Partial<StudioAppQualityIssue> = {}): StudioAppQualityIssue {
  return {
    id: "color.raw-hex",
    category: "color",
    severity: "medium",
    title: "Raw colors are leaking into UI code",
    detail: "Hardcoded hex values make redesigns brittle.",
    evidence: ["1 unique hex color"],
    recommendation: "Move recurring colors into CSS variables.",
    ...overrides,
  };
}

describe("severityOrder", () => {
  it("is fixed: critical, high, medium, low", () => {
    expect(severityOrder()).toEqual(["critical", "high", "medium", "low"]);
  });
});

describe("groupIssuesBySeverity", () => {
  it("buckets issues by severity", () => {
    const issues = [
      makeIssue({ id: "a", severity: "high" }),
      makeIssue({ id: "b", severity: "low" }),
      makeIssue({ id: "c", severity: "high" }),
    ];
    const grouped = groupIssuesBySeverity(issues);
    expect(grouped.high.map((issue) => issue.id)).toEqual(["a", "c"]);
    expect(grouped.low.map((issue) => issue.id)).toEqual(["b"]);
    expect(grouped.critical).toEqual([]);
    expect(grouped.medium).toEqual([]);
  });

  it("returns all four severity keys, empty arrays, for an empty input", () => {
    expect(groupIssuesBySeverity([])).toEqual({ critical: [], high: [], medium: [], low: [] });
  });
});

describe("formatScoreDelta", () => {
  it("shows an em dash with no prior score", () => {
    expect(formatScoreDelta(96, null)).toEqual({ label: "—", direction: "flat" });
  });
  it("shows a plus-prefixed label and up direction for an improvement", () => {
    expect(formatScoreDelta(96, 90)).toEqual({ label: "+6", direction: "up" });
  });
  it("shows a negative label and down direction for a regression", () => {
    expect(formatScoreDelta(90, 96)).toEqual({ label: "-6", direction: "down" });
  });
  it("shows a flat marker when the score is unchanged", () => {
    expect(formatScoreDelta(96, 96)).toEqual({ label: "±0", direction: "flat" });
  });
});

describe("verdictTone", () => {
  it("is good at and above 90", () => {
    expect(verdictTone(100)).toBe("good");
    expect(verdictTone(90)).toBe("good");
  });
  it("is warn between 70 and 89", () => {
    expect(verdictTone(89)).toBe("warn");
    expect(verdictTone(70)).toBe("warn");
  });
  it("is critical below 70", () => {
    expect(verdictTone(69)).toBe("critical");
    expect(verdictTone(0)).toBe("critical");
  });
});
