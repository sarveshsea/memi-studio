// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StudioRuntimeLifecycleEvent, StudioStatus } from "../../studio-api";

const lifecycleListeners: Array<(event: StudioRuntimeLifecycleEvent) => void> = [];
const logListeners: Array<(line: { stream: string; message: string; timestamp: string }) => void> = [];

vi.mock("../../studio-api", () => ({
  subscribeRuntimeLifecycle: vi.fn((handler: (event: StudioRuntimeLifecycleEvent) => void) => {
    lifecycleListeners.push(handler);
    return () => {
      const index = lifecycleListeners.indexOf(handler);
      if (index >= 0) lifecycleListeners.splice(index, 1);
    };
  }),
  subscribeRuntimeLog: vi.fn((handler: (line: { stream: string; message: string; timestamp: string }) => void) => {
    logListeners.push(handler);
    return () => {
      const index = logListeners.indexOf(handler);
      if (index >= 0) logListeners.splice(index, 1);
    };
  }),
}));

function emitLifecycleEvent(event: string, payload: Record<string, unknown> = {}) {
  const fullEvent: StudioRuntimeLifecycleEvent = { event, timestamp: "2026-07-06T00:00:00.000Z", payload };
  for (const listener of [...lifecycleListeners]) listener(fullEvent);
}

// Import after the mock so the hook picks up the mocked studio-api module.
const {
  useRuntimeLifecycle,
  runtimeHealthFromStatus,
  runtimeLifecycleEventIsFinalFailure,
  runtimeLifecyclePhaseLabel,
  runtimeHealthLabel,
  runtimeHealthDisplayLabel,
  isWorkspaceAccessBlockedMessage,
  workspaceRecoveryDisplayMessage,
} = await import("../use-runtime-lifecycle");

beforeEach(() => {
  lifecycleListeners.length = 0;
  logListeners.length = 0;
});

describe("runtimeHealthFromStatus", () => {
  it("maps a running runtime to ready", () => {
    expect(runtimeHealthFromStatus({ runtime: { status: "running" } } as StudioStatus)).toBe("ready");
  });
  it("maps a starting runtime to starting", () => {
    expect(runtimeHealthFromStatus({ runtime: { status: "starting" } } as StudioStatus)).toBe("starting");
  });
  it("maps a stopped or error runtime to degraded", () => {
    expect(runtimeHealthFromStatus({ runtime: { status: "stopped" } } as StudioStatus)).toBe("degraded");
    expect(runtimeHealthFromStatus({ runtime: { status: "error" } } as StudioStatus)).toBe("degraded");
  });
  it("falls back to the top-level status when runtime is absent", () => {
    expect(runtimeHealthFromStatus({ status: "ready" } as unknown as StudioStatus)).toBe("ready");
    expect(runtimeHealthFromStatus({ status: "unknown" } as unknown as StudioStatus)).toBe("degraded");
  });
});

describe("runtimeLifecycleEventIsFinalFailure", () => {
  it("is false for null", () => {
    expect(runtimeLifecycleEventIsFinalFailure(null)).toBe(false);
  });
  it("is true when a startup timeout gives up (shouldRestart: false)", () => {
    expect(runtimeLifecycleEventIsFinalFailure({ event: "runtime.startup-timeout-recovery", timestamp: "", payload: { shouldRestart: false } })).toBe(true);
  });
  it("is false when a startup timeout will retry", () => {
    expect(runtimeLifecycleEventIsFinalFailure({ event: "runtime.startup-timeout-recovery", timestamp: "", payload: { shouldRestart: true } })).toBe(false);
  });
  it("is true for a crashed exit with no further retries", () => {
    expect(runtimeLifecycleEventIsFinalFailure({ event: "runtime.exit", timestamp: "", payload: { success: false, shouldRestart: false } })).toBe(true);
  });
  it("is false for a clean exit", () => {
    expect(runtimeLifecycleEventIsFinalFailure({ event: "runtime.exit", timestamp: "", payload: { success: true, shouldRestart: false } })).toBe(false);
  });
});

describe("runtimeLifecyclePhaseLabel", () => {
  it("returns null for no event", () => {
    expect(runtimeLifecyclePhaseLabel(null)).toBeNull();
  });
  it("labels a ready event", () => {
    expect(runtimeLifecyclePhaseLabel({ event: "runtime.ready", timestamp: "", payload: {} })).toBe("Runtime ready");
  });
  it("distinguishes retrying from giving up on crash", () => {
    expect(runtimeLifecyclePhaseLabel({ event: "runtime.exit", timestamp: "", payload: { success: false, shouldRestart: true } })).toBe("Retrying after crash");
    expect(runtimeLifecyclePhaseLabel({ event: "runtime.exit", timestamp: "", payload: { success: false, shouldRestart: false } })).toBe("Runtime crashed — won't auto-retry");
  });
  it("returns null for an unrecognized event", () => {
    expect(runtimeLifecyclePhaseLabel({ event: "runtime.output", timestamp: "", payload: {} })).toBeNull();
  });
});

describe("isWorkspaceAccessBlockedMessage / workspaceRecoveryDisplayMessage", () => {
  it("detects the macOS blocked-access message shape", () => {
    expect(isWorkspaceAccessBlockedMessage("macOS blocked access to the saved workspace")).toBe(true);
    expect(isWorkspaceAccessBlockedMessage("some other error")).toBe(false);
    expect(isWorkspaceAccessBlockedMessage(null)).toBe(false);
  });
  it("gives a friendly recovery message for the blocked-access case", () => {
    expect(workspaceRecoveryDisplayMessage("macOS blocked access to the saved workspace", "degraded"))
      .toBe("Reopen the project folder to restore macOS access.");
  });
  it("shows a starting message while starting, otherwise trims the raw message", () => {
    expect(workspaceRecoveryDisplayMessage("anything", "starting")).toBe("Starting local runtime...");
    expect(workspaceRecoveryDisplayMessage("short message", "degraded")).toBe("short message");
  });
});

describe("runtimeHealthLabel / runtimeHealthDisplayLabel", () => {
  it("labels every health value", () => {
    expect(runtimeHealthLabel("ready")).toBe("Ready");
    expect(runtimeHealthLabel("starting")).toBe("Starting");
    expect(runtimeHealthLabel("degraded")).toBe("Degraded");
    expect(runtimeHealthLabel("offline")).toBe("Offline");
  });
  it("shows Attached when the runtime source is an attached existing runtime", () => {
    expect(runtimeHealthDisplayLabel("ready", "attached-existing-runtime")).toBe("Attached");
    expect(runtimeHealthDisplayLabel("ready", null)).toBe("Ready");
  });
});

describe("useRuntimeLifecycle", () => {
  it("starts in the starting state", () => {
    const { result } = renderHook(() => useRuntimeLifecycle(async () => {}));
    expect(result.current.runtimeHealth).toBe("starting");
  });

  it("transitions to ready on a runtime.ready event and triggers refresh()", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRuntimeLifecycle(refresh));
    act(() => {
      emitLifecycleEvent("runtime.ready", { readySource: "http" });
    });
    expect(result.current.runtimeHealth).toBe("ready");
    expect(result.current.runtimeLifecycleEvent?.event).toBe("runtime.ready");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("transitions to degraded on a port-blocked event without calling refresh()", () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRuntimeLifecycle(refresh));
    act(() => {
      emitLifecycleEvent("runtime.port-blocked", {});
    });
    expect(result.current.runtimeHealth).toBe("degraded");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("ignores events with no health implication (leaves health untouched)", () => {
    const { result } = renderHook(() => useRuntimeLifecycle(async () => {}));
    act(() => {
      emitLifecycleEvent("runtime.output", { stream: "stdout", message: "hello" });
    });
    expect(result.current.runtimeHealth).toBe("starting");
    // The event is still recorded even though it carries no health signal.
    expect(result.current.runtimeLifecycleEvent?.event).toBe("runtime.output");
  });

  it("accumulates log lines into a capped tail", () => {
    const { result } = renderHook(() => useRuntimeLifecycle(async () => {}));
    act(() => {
      for (const listener of logListeners) {
        listener({ stream: "stdout", message: "line one", timestamp: "t1" });
        listener({ stream: "stderr", message: "line two", timestamp: "t2" });
      }
    });
    expect(result.current.runtimeLogTail).toEqual([
      { stream: "stdout", message: "line one", timestamp: "t1" },
      { stream: "stderr", message: "line two", timestamp: "t2" },
    ]);
  });

  it("does not leave a subscription active after unmount", () => {
    const { unmount } = renderHook(() => useRuntimeLifecycle(async () => {}));
    expect(lifecycleListeners.length).toBe(1);
    unmount();
    expect(lifecycleListeners.length).toBe(0);
  });
});
