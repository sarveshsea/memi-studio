// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { clearNotifications, dismissNotification, notify, useNotifications } from "../notification-center";
import type { StudioError } from "../studio-api/errors";

afterEach(() => {
  clearNotifications();
});

function makeError(overrides: Partial<StudioError> = {}): StudioError {
  return {
    kind: "engine-error",
    message: "something failed",
    timestamp: "2026-07-06T00:00:00.000Z",
    ...overrides,
  };
}

describe("notification-center", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current).toEqual([]);
  });

  it("notify() defaults to toast severity and appends to the list", () => {
    const { result } = renderHook(() => useNotifications());
    act(() => {
      notify(makeError({ message: "explicit action failed" }));
    });
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ message: "explicit action failed", severity: "toast" });
    expect(result.current[0].id).toMatch(/^notification-/);
  });

  it("notify() respects an explicit background severity", () => {
    const { result } = renderHook(() => useNotifications());
    act(() => {
      notify(makeError({ kind: "runtime-offline" }), { severity: "background" });
    });
    expect(result.current[0].severity).toBe("background");
  });

  it("assigns distinct, monotonically-increasing ids across calls", () => {
    act(() => {
      notify(makeError());
      notify(makeError());
    });
    const { result } = renderHook(() => useNotifications());
    expect(result.current).toHaveLength(2);
    expect(result.current[0].id).not.toBe(result.current[1].id);
  });

  it("dismissNotification() removes only the targeted entry", () => {
    const { result } = renderHook(() => useNotifications());
    act(() => {
      notify(makeError({ message: "first" }));
      notify(makeError({ message: "second" }));
    });
    const firstId = result.current[0].id;
    act(() => {
      dismissNotification(firstId);
    });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].message).toBe("second");
  });

  it("clearNotifications() empties the list", () => {
    const { result } = renderHook(() => useNotifications());
    act(() => {
      notify(makeError());
      notify(makeError());
    });
    act(() => {
      clearNotifications();
    });
    expect(result.current).toEqual([]);
  });

  it("subscribers already rendered see updates pushed after mount (useSyncExternalStore wiring)", () => {
    const { result: a } = renderHook(() => useNotifications());
    const { result: b } = renderHook(() => useNotifications());
    act(() => {
      notify(makeError({ message: "seen by both" }));
    });
    expect(a.current).toHaveLength(1);
    expect(b.current).toHaveLength(1);
    expect(a.current[0].message).toBe("seen by both");
  });
});
