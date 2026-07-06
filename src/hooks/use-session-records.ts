// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Session run records: the active session summary, the recent-sessions
// list, the live event stream for the active session, and the server-side
// trace snapshot. Part of the App.tsx decomposition (2.4 Phase B).
//
// Deliberately narrower than "everything session-related": composer input
// state (prompt/queuedPrompt/startingPrompt) and the run/cancel
// orchestration (run, runWithPrompt, cancel, cancelStartingSession, the
// live-session event subscription, openSessionSummary, trace refresh
// scheduling) all stay in App.tsx — none of these 4 fields have an owned
// effect of their own (no persistence, no subscription), they're pure
// data written by many call sites across the run lifecycle. Extracting
// the orchestration itself is a separate, higher-risk pass: it's the
// product's core interactive loop and needs a real backend to verify
// live-event and cancellation behavior end-to-end.

import { useState } from "react";
import type { SessionSummary, StudioEvent, StudioTraceSnapshot } from "../studio-api";

export function useSessionRecords() {
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [serverTrace, setServerTrace] = useState<StudioTraceSnapshot | null>(null);

  return {
    session,
    setSession,
    recentSessions,
    setRecentSessions,
    events,
    setEvents,
    serverTrace,
    setServerTrace,
  };
}
