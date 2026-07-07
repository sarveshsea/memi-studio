// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useWorkspaceState } from "../use-workspace-state";
import type { StudioStatus, StudioWorkspacePermissions } from "../../studio-api";

describe("useWorkspaceState", () => {
  it("starts with no status, no permissions, no recent workspaces, and hasWorkspace false", () => {
    const { result } = renderHook(() => useWorkspaceState());
    expect(result.current.status).toBeNull();
    expect(result.current.workspacePermissions).toBeNull();
    expect(result.current.recentWorkspaces).toEqual([]);
    expect(result.current.hasWorkspace).toBe(false);
  });

  it("hasWorkspace becomes true once status.projectRoot is a non-blank path", () => {
    const { result } = renderHook(() => useWorkspaceState());
    act(() => {
      result.current.setStatus({ projectRoot: "/Users/dev/my-project" } as StudioStatus);
    });
    expect(result.current.hasWorkspace).toBe(true);
  });

  it("hasWorkspace stays false when projectRoot is only whitespace", () => {
    const { result } = renderHook(() => useWorkspaceState());
    act(() => {
      result.current.setStatus({ projectRoot: "   " } as StudioStatus);
    });
    expect(result.current.hasWorkspace).toBe(false);
  });

  it("falls back to workspacePermissions.currentWorkspace when status has no projectRoot", () => {
    const { result } = renderHook(() => useWorkspaceState());
    act(() => {
      result.current.setWorkspacePermissions({ currentWorkspace: "/Users/dev/other-project" } as StudioWorkspacePermissions);
    });
    expect(result.current.hasWorkspace).toBe(true);
  });

  it("setRecentWorkspaces updates the recent workspace list", () => {
    const { result } = renderHook(() => useWorkspaceState());
    act(() => {
      result.current.setRecentWorkspaces([{ path: "/Users/dev/my-project", label: "my-project" } as never]);
    });
    expect(result.current.recentWorkspaces).toHaveLength(1);
  });
});
