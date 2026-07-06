// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Always-visible runtime readiness pill. Replaces "nothing visible happening"
// during boot/spawn with a live, low-latency status driven by the pushed
// runtime lifecycle event stream (see subscribeRuntimeLifecycle in
// studio-api/core-runtime.ts) rather than the slower reconciliation poll.

export type RuntimeStatusChipHealth = "offline" | "starting" | "ready" | "degraded";

export interface RuntimeStatusChipProps {
  health: RuntimeStatusChipHealth;
  /** Live phase label derived from the last pushed lifecycle event, e.g. "Preparing runtime". */
  phaseLabel?: string | null;
}

const HEALTH_LABEL: Record<RuntimeStatusChipHealth, string> = {
  ready: "Ready",
  starting: "Starting",
  degraded: "Degraded",
  offline: "Offline",
};

export function RuntimeStatusChip(props: RuntimeStatusChipProps) {
  const label = HEALTH_LABEL[props.health];
  const detail = props.phaseLabel ?? label;
  return (
    <span
      className="runtime-status-chip"
      data-runtime-status-chip={props.health}
      title={detail}
      aria-label={`Runtime ${label}${props.phaseLabel ? `: ${props.phaseLabel}` : ""}`}
    >
      <i className="status-dot" data-runtime-status={props.health} aria-hidden="true" />
      <span className="runtime-status-chip-label">{detail}</span>
    </span>
  );
}
