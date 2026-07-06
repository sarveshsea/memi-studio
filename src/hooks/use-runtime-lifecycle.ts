// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Runtime lifecycle: health state, the pushed-event subscription (primary
// readiness signal) and the slower reconciliation poll (fallback), plus the
// pure classification functions used to render it. First cut of the
// App.tsx decomposition (2.4 Phase B) — extracted verbatim from App.tsx,
// no behavior change.

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  subscribeRuntimeLifecycle,
  subscribeRuntimeLog,
  type StudioRuntimeLifecycleEvent,
  type StudioStatus,
} from "../studio-api";
import { trimText } from "../workbench-components";

export type RuntimeHealth = "offline" | "starting" | "ready" | "degraded";

const RUNTIME_LOG_TAIL_LIMIT = 200;

export function runtimeHealthFromStatus(status: StudioStatus): RuntimeHealth {
  const runtimeStatus = status.runtime?.status;
  if (runtimeStatus === "running") return "ready";
  if (runtimeStatus === "starting") return "starting";
  if (runtimeStatus === "stopped" || runtimeStatus === "error") return "degraded";
  if (status.status === "running" || status.status === "ready") return "ready";
  return "degraded";
}

/**
 * Maps a pushed runtime lifecycle event to a health value. Returns null for
 * events with no health implication (raw stdout/stderr lines, pid-file
 * write failures) so the caller can leave the current health untouched.
 */
function runtimeHealthFromLifecycleEvent(event: StudioRuntimeLifecycleEvent): RuntimeHealth | null {
  const shouldRestart = event.payload.shouldRestart === true;
  const exitedCleanly = event.payload.success === true;
  switch (event.event) {
    case "runtime.supervisor.queued":
    case "runtime.supervisor.preparing":
    case "runtime.spawned":
      return "starting";
    case "runtime.ready":
    case "runtime.attached-existing":
      return "ready";
    case "runtime.status-timeout":
    case "runtime.workspace-access-blocked":
    case "runtime.port-blocked":
    case "runtime.resolve-failed":
    case "runtime.cache-failed":
    case "runtime.spawn-failed":
      return "degraded";
    case "runtime.startup-timeout-recovery":
      return shouldRestart ? "starting" : "degraded";
    case "runtime.exit":
      return exitedCleanly ? "offline" : shouldRestart ? "starting" : "degraded";
    case "runtime.stop":
      return "offline";
    default:
      return null;
  }
}

/** A terminal failure the supervisor has given up retrying — distinct from a transient "degraded" that may still self-heal. */
export function runtimeLifecycleEventIsFinalFailure(event: StudioRuntimeLifecycleEvent | null): boolean {
  if (!event) return false;
  if (event.event === "runtime.startup-timeout-recovery") return event.payload.shouldRestart === false;
  if (event.event === "runtime.exit") return event.payload.success !== true && event.payload.shouldRestart === false;
  return false;
}

/** Human-readable phase label for the live status chip / recovery strip, derived from the last pushed lifecycle event. */
export function runtimeLifecyclePhaseLabel(event: StudioRuntimeLifecycleEvent | null): string | null {
  if (!event) return null;
  const shouldRestart = event.payload.shouldRestart === true;
  const exitedCleanly = event.payload.success === true;
  switch (event.event) {
    case "runtime.supervisor.queued": return "Queued";
    case "runtime.supervisor.preparing": return "Preparing runtime";
    case "runtime.spawned": return "Starting runtime";
    case "runtime.ready": return "Runtime ready";
    case "runtime.attached-existing": return "Attached to existing runtime";
    case "runtime.status-timeout": return "Runtime did not answer in time";
    case "runtime.workspace-access-blocked": return "Workspace access blocked";
    case "runtime.port-blocked": return "Port already in use";
    case "runtime.resolve-failed": return "Could not resolve runtime";
    case "runtime.cache-failed": return "Failed to prepare runtime cache";
    case "runtime.spawn-failed": return "Failed to start runtime";
    case "runtime.startup-timeout-recovery": return shouldRestart ? "Retrying after timeout" : "Gave up after timeout";
    case "runtime.exit": return exitedCleanly ? "Runtime stopped" : shouldRestart ? "Retrying after crash" : "Runtime crashed — won't auto-retry";
    case "runtime.stop": return "Runtime stopped";
    default: return null;
  }
}

export function isWorkspaceAccessBlockedMessage(message: string | null | undefined): boolean {
  const normalized = (message ?? "").trim();
  return /\bmacOS blocked access\b/i.test(normalized)
    && /\b(saved workspace|workspace|removable|network volumes?)\b/i.test(normalized);
}

export function workspaceRecoveryDisplayMessage(message: string, health: RuntimeHealth): string {
  if (isWorkspaceAccessBlockedMessage(message)) {
    return "Reopen the project folder to restore macOS access.";
  }
  if (health === "starting") return "Starting local runtime...";
  return trimText(message, 72);
}

export function runtimeHealthLabel(health: RuntimeHealth): string {
  if (health === "ready") return "Ready";
  if (health === "starting") return "Starting";
  if (health === "degraded") return "Degraded";
  return "Offline";
}

export function runtimeHealthDisplayLabel(health: RuntimeHealth, source?: string | null): string {
  if (source === "attached-existing-runtime") return "Attached";
  return runtimeHealthLabel(health);
}

export interface RuntimeLifecycleState {
  runtimeHealth: RuntimeHealth;
  setRuntimeHealth: Dispatch<SetStateAction<RuntimeHealth>>;
  runtimeRecoveryMessage: string | null;
  setRuntimeRecoveryMessage: Dispatch<SetStateAction<string | null>>;
  runtimeLifecycleEvent: StudioRuntimeLifecycleEvent | null;
  runtimeLogTail: Array<{ stream: string; message: string; timestamp: string }>;
}

/**
 * `refresh` is captured once at mount (both effects below intentionally use
 * `[]`/`[runtimeHealth]` dependency arrays that don't list it) — this
 * matches the exact behavior already in place before this extraction:
 * `refresh` is a plain function re-created every render in the host
 * component, not a stable useCallback, so the effects close over whichever
 * `refresh` existed at first mount. Not a regression introduced here.
 */
export function useRuntimeLifecycle(refresh: () => Promise<void>): RuntimeLifecycleState {
  const [runtimeHealth, setRuntimeHealth] = useState<RuntimeHealth>("starting");
  const [runtimeRecoveryMessage, setRuntimeRecoveryMessage] = useState<string | null>(null);
  const [runtimeLifecycleEvent, setRuntimeLifecycleEvent] = useState<StudioRuntimeLifecycleEvent | null>(null);
  const [runtimeLogTail, setRuntimeLogTail] = useState<Array<{ stream: string; message: string; timestamp: string }>>([]);
  const runtimeStartupRefreshInFlightRef = useRef(false);

  // Live push feed of every runtime supervisor transition — primary
  // readiness signal now, replacing the poll below for latency. Mount-once:
  // the subscription itself never depends on component state.
  useEffect(() => {
    const unsubscribeLifecycle = subscribeRuntimeLifecycle((event) => {
      // Note: intentionally does NOT touch runtimeRecoveryMessage — that
      // stays sourced from refresh()'s actual backend error string (needed
      // verbatim for the workspace-access-blocked heuristic). The phase
      // label derived from this event is surfaced as a separate,
      // display-only value instead of overwriting the raw error.
      setRuntimeLifecycleEvent(event);
      const nextHealth = runtimeHealthFromLifecycleEvent(event);
      if (nextHealth) setRuntimeHealth(nextHealth);
      if (nextHealth === "ready") {
        void refresh();
      }
    });
    const unsubscribeLog = subscribeRuntimeLog((line) => {
      setRuntimeLogTail((current) => [...current, line].slice(-RUNTIME_LOG_TAIL_LIMIT));
    });
    return () => {
      unsubscribeLifecycle();
      unsubscribeLog();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (runtimeHealth !== "starting" && runtimeHealth !== "degraded") return undefined;
    // Reconciliation fallback only — the lifecycle-event subscription above is
    // now the primary readiness signal, so this no longer needs sub-second
    // latency; it exists to recover if an event was ever missed.
    const delay = runtimeHealth === "starting" ? 2000 : 5000;
    const interval = window.setInterval(() => {
      if (runtimeStartupRefreshInFlightRef.current) return;
      runtimeStartupRefreshInFlightRef.current = true;
      void refresh().finally(() => {
        runtimeStartupRefreshInFlightRef.current = false;
      });
    }, delay);
    return () => {
      window.clearInterval(interval);
      runtimeStartupRefreshInFlightRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeHealth]);

  return {
    runtimeHealth,
    setRuntimeHealth,
    runtimeRecoveryMessage,
    setRuntimeRecoveryMessage,
    runtimeLifecycleEvent,
    runtimeLogTail,
  };
}
