// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { describe, expect, it } from "vitest";
import { classifyError } from "../errors";

describe("classifyError", () => {
  it("classifies a workspace-missing error when there is no workspace", () => {
    const result = classifyError(new Error("Open a folder to run"), { hasWorkspace: false });
    expect(result.kind).toBe("workspace-missing");
    expect(result.recoveryActionId).toBe("welcome.open-folder");
  });

  it("classifies the macOS workspace-access-blocked message even with a workspace present", () => {
    const result = classifyError(
      new Error("macOS blocked access to the saved workspace folder"),
      { hasWorkspace: true },
    );
    expect(result.kind).toBe("workspace-missing");
  });

  it("classifies runtime-offline from context health, independent of message text", () => {
    const result = classifyError(new Error("boom"), { hasWorkspace: true, runtimeHealth: "offline" });
    expect(result.kind).toBe("runtime-offline");
    expect(result.recoveryActionId).toBe("runtime.restart");
  });

  it("classifies runtime-offline from a fetch-failure message when health is unknown", () => {
    const result = classifyError(new TypeError("Failed to fetch"));
    expect(result.kind).toBe("runtime-offline");
  });

  it("classifies auth-required from a needs_login-style message", () => {
    const result = classifyError(new Error("Codex needs login"));
    expect(result.kind).toBe("auth-required");
    expect(result.recoveryActionId).toBe("harness.reauthenticate");
  });

  it("classifies bridge-timeout for a Figma connection timeout", () => {
    const result = classifyError(new Error("Figma bridge connection timed out"));
    expect(result.kind).toBe("bridge-timeout");
  });

  it("falls back to engine-error for an unrecognized failure, with no recovery action", () => {
    const result = classifyError(new Error("something truly unexpected happened"));
    expect(result.kind).toBe("engine-error");
    expect(result.recoveryActionId).toBeUndefined();
  });

  it("stringifies non-Error values instead of throwing", () => {
    const result = classifyError("plain string failure");
    expect(result.message).toBe("plain string failure");
    const objectResult = classifyError({ some: "object" });
    expect(objectResult.message).toContain("some");
  });

  it("stamps an ISO timestamp", () => {
    const result = classifyError(new Error("x"));
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
