// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

/**
 * Manager view — top-level types shared by the aggregator and React surface.
 *
 * The manager view is a multi-workspace operator surface (Feature 6 of the
 * 0.18.0 plan). It aggregates task / workspace data from heterogeneous
 * sources into a single sortable, filterable list.
 */

export type ManagerTaskStatus =
  | "queued"
  | "running"
  | "awaiting-approval"
  | "succeeded"
  | "failed"
  | "cancelled";

export type ManagerTaskKind = "local" | "cloud" | "automation";

export interface ManagerTask {
  id: string;
  workspaceId: string;
  /** Friendly label rendered in the middle column. */
  title: string;
  status: ManagerTaskStatus;
  kind: ManagerTaskKind;
  /** Harness id (e.g. "codex"). Used for grouping and bulk approve. */
  harness: string;
  /** Human-readable agent label (e.g. "design-auditor"). */
  agent?: string;
  createdAt: string;
  updatedAt: string;
  /** Optional cost estimate (USD). */
  estimatedCostUsd?: number;
  /** Optional pointer back into the workspace surface. */
  permalink?: string;
  /** Free-form metadata exposed to the React layer. */
  metadata?: Record<string, string>;
}

export interface ManagerWorkspaceCard {
  workspaceId: string;
  /** Friendly workspace name. */
  name: string;
  /** Project root path on disk. */
  rootPath?: string;
  /** Aggregate counters used to render the column 1 card. */
  counts: {
    queued: number;
    running: number;
    awaitingApproval: number;
    succeededLast24h: number;
    failedLast24h: number;
  };
  /** ISO timestamp of the last activity. */
  lastActivityAt?: string;
  /** Optional accent color hint (theme token reference, NOT a hex). */
  accentToken?: string;
}

export interface ManagerFilter {
  status?: ManagerTaskStatus[];
  kind?: ManagerTaskKind[];
  harness?: string[];
  workspaceId?: string[];
  /** Inclusive ISO timestamp lower bound. */
  fromIso?: string;
  /** Inclusive ISO timestamp upper bound. */
  toIso?: string;
  /** Free-text title contains, case-insensitive. */
  query?: string;
}

export type ManagerSortField = "createdAt" | "updatedAt" | "agent" | "harness" | "status";

export interface ManagerSort {
  field: ManagerSortField;
  direction: "asc" | "desc";
}

export interface ManagerWorkspaceSource {
  workspaceId: string;
  name: string;
  rootPath?: string;
  accentToken?: string;
  /** Tasks owned by this workspace; aggregator concatenates across sources. */
  tasks(): ManagerTask[] | Promise<ManagerTask[]>;
}

export interface BulkApproveGroup {
  harness: string;
  workspaceId: string;
  tasks: ManagerTask[];
}
