// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { describe, expect, it, vi } from "vitest";
import type { StudioDesignAuditResult } from "../shared-types";

const fetchJSON = vi.fn();
const fetchWithRuntimeToken = vi.fn();

vi.mock("../internal-helpers", () => ({
  fetchJSON: (...args: unknown[]) => fetchJSON(...args),
  fetchWithRuntimeToken: (...args: unknown[]) => fetchWithRuntimeToken(...args),
}));

const { acceptDesignAuditBaseline, getLatestDesignAudit, runDesignAudit } = await import("../design-audit");

function makeResult(overrides: Partial<StudioDesignAuditResult> = {}): StudioDesignAuditResult {
  return {
    diagnosis: {
      version: 1,
      target: ".",
      generatedAt: "2026-07-06T00:00:00.000Z",
      summary: {
        score: 96,
        verdict: "Solid",
        scannedFiles: 120,
        routes: 3,
        components: 40,
        styleFiles: 5,
        tailwindClasses: 200,
        shadcnImports: 10,
        cssVariables: 60,
        hexColors: 2,
      },
      scores: {
        "visual-system": 90, typography: 95, spacing: 92, color: 88,
        components: 96, accessibility: 94, responsive: 90, maintainability: 91,
      },
      issues: [],
    },
    active: [],
    suppressed: [],
    baselineExists: true,
    history: [],
    ...overrides,
  };
}

describe("runDesignAudit", () => {
  it("POSTs to /api/design-audit/run with the options body and passes the abort signal through", async () => {
    const result = makeResult();
    fetchJSON.mockResolvedValueOnce(result);
    const controller = new AbortController();
    const returned = await runDesignAudit({ maxFiles: 250 }, { signal: controller.signal });
    expect(returned).toBe(result);
    expect(fetchJSON).toHaveBeenCalledWith("/api/design-audit/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ maxFiles: 250 }),
      signal: controller.signal,
    });
  });
});

describe("getLatestDesignAudit", () => {
  it("returns null on a 404 (never run yet) without throwing", async () => {
    fetchWithRuntimeToken.mockResolvedValueOnce({ status: 404, ok: false });
    await expect(getLatestDesignAudit()).resolves.toBeNull();
  });

  it("returns the parsed result on a 200", async () => {
    const result = makeResult();
    fetchWithRuntimeToken.mockResolvedValueOnce({ status: 200, ok: true, json: async () => result });
    await expect(getLatestDesignAudit()).resolves.toEqual(result);
  });

  it("throws with the server's error message for a non-404 failure", async () => {
    fetchWithRuntimeToken.mockResolvedValueOnce({
      status: 500,
      ok: false,
      json: async () => ({ error: "engine crashed" }),
    });
    await expect(getLatestDesignAudit()).rejects.toThrow("engine crashed");
  });
});

describe("acceptDesignAuditBaseline", () => {
  it("POSTs to /api/design-audit/accept-baseline", async () => {
    fetchJSON.mockResolvedValueOnce({ baseline: { schemaVersion: 1 } });
    const returned = await acceptDesignAuditBaseline();
    expect(returned).toEqual({ baseline: { schemaVersion: 1 } });
    expect(fetchJSON).toHaveBeenCalledWith("/api/design-audit/accept-baseline", { method: "POST" });
  });
});
