// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { describe, expect, it } from "vitest";
import { formatScoreDelta, groupIssuesBySeverity, severityOrder, sparklineHeights, verdictTone } from "../format";
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

describe("sparklineHeights", () => {
  it("returns an empty array for no scores", () => {
    expect(sparklineHeights([])).toEqual([]);
  });

  it("returns a single mid-height bar for one entry", () => {
    expect(sparklineHeights([96])).toEqual([50]);
  });

  it("returns uniform mid heights for a flat band", () => {
    expect(sparklineHeights([80, 80, 80])).toEqual([50, 50, 50]);
  });

  it("scales to the observed score band with small padding instead of always anchoring to [0, 100]", () => {
    const heights = sparklineHeights([92, 94, 96]);
    // Observed band [92, 96] padded to [90, 98]: flat 92-96 should no longer render as
    // uniformly flat bars against a fixed 0-100 scale.
    expect(heights[0]).toBeCloseTo(25, 5);
    expect(heights[1]).toBeCloseTo(50, 5);
    expect(heights[2]).toBeCloseTo(75, 5);
    const spread = Math.max(...heights) - Math.min(...heights);
    expect(spread).toBeGreaterThan(0);
  });

  it("keeps a visible minimum height for the lowest bar", () => {
    const heights = sparklineHeights([0, 100]);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(6);
  });
});
