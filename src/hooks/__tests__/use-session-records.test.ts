// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSessionRecords } from "../use-session-records";
import type { SessionSummary, StudioEvent, StudioTraceSnapshot } from "../../studio-api";

describe("useSessionRecords", () => {
  it("starts with no session, no recent sessions, no events, no server trace", () => {
    const { result } = renderHook(() => useSessionRecords());
    expect(result.current.session).toBeNull();
    expect(result.current.recentSessions).toEqual([]);
    expect(result.current.events).toEqual([]);
    expect(result.current.serverTrace).toBeNull();
  });

  it("setSession stores the active session summary", () => {
    const { result } = renderHook(() => useSessionRecords());
    act(() => {
      result.current.setSession({ id: "session-abc" } as SessionSummary);
    });
    expect(result.current.session).toEqual({ id: "session-abc" });
  });

  it("setRecentSessions stores the recent-sessions list", () => {
    const { result } = renderHook(() => useSessionRecords());
    act(() => {
      result.current.setRecentSessions([{ id: "session-abc" } as SessionSummary]);
    });
    expect(result.current.recentSessions).toHaveLength(1);
  });

  it("setEvents stores the live event stream", () => {
    const { result } = renderHook(() => useSessionRecords());
    act(() => {
      result.current.setEvents([{ type: "message", id: "event-1" } as unknown as StudioEvent]);
    });
    expect(result.current.events).toHaveLength(1);
  });

  it("setServerTrace stores the server-side trace snapshot", () => {
    const { result } = renderHook(() => useSessionRecords());
    act(() => {
      result.current.setServerTrace({ sessionId: "session-abc" } as StudioTraceSnapshot);
    });
    expect(result.current.serverTrace).toEqual({ sessionId: "session-abc" });
  });
});
