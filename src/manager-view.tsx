// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

/**
 * Manager view — three-column React surface for the Studio multi-workspace
 * operator pane. Workspaces (left) -> Tasks (middle) -> Detail (right).
 *
 * The component is presentation-only: data comes from props, behavior is
 * routed back through callbacks so the host can wire it to whichever
 * orchestrator (local / cloud / automation) owns the underlying record.
 */
import { type CSSProperties, useMemo, useState } from "react";
import type {
  ManagerFilter,
  ManagerSort,
  ManagerTask,
  ManagerTaskStatus,
  ManagerWorkspaceCard,
} from "./runtime/index.js";
import { WorkbenchPanel } from "./studio-primitives";

export interface ManagerViewProps {
  workspaces: ManagerWorkspaceCard[];
  tasks: ManagerTask[];
  /** Optional initial filter (defaults to no filter). */
  initialFilter?: ManagerFilter;
  /** Optional initial sort (defaults to updatedAt desc). */
  initialSort?: ManagerSort;
  onSelect?: (task: ManagerTask) => void;
  onCancel?: (task: ManagerTask) => void;
  onApprove?: (task: ManagerTask) => void;
  /** Optional — renders a "Create workspace" empty-state CTA when the workspace list is empty. */
  onCreateWorkspace?: () => void;
}

const DEFAULT_SORT: ManagerSort = { field: "updatedAt", direction: "desc" };

const COLUMN_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "240px minmax(360px, 1fr) 360px",
  gap: "var(--space-2)",
  height: "100%",
  minHeight: 0,
  padding: "var(--space-2)",
  background: "var(--surface-bg)",
};

const COLUMN: CSSProperties = {
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
};

const SCROLL_BODY: CSSProperties = {
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-1-5)",
  padding: "var(--space-2)",
};

const ITEM_BUTTON_BASE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "var(--space-1)",
  padding: "var(--space-2)",
  borderRadius: "var(--radius-default)",
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink)",
  textAlign: "left",
  font: "inherit",
  cursor: "pointer",
};

const STATUS_TOKEN: Record<ManagerTaskStatus, string> = {
  queued: "var(--ink-muted)",
  running: "var(--accent)",
  "awaiting-approval": "var(--accent)",
  succeeded: "var(--ok)",
  failed: "var(--danger)",
  cancelled: "var(--ink-faint)",
};

export function ManagerView(props: ManagerViewProps) {
  const { workspaces, tasks, onSelect, onCancel, onApprove } = props;
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(
    props.initialFilter?.workspaceId?.[0] ?? null,
  );
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [sort] = useState<ManagerSort>(props.initialSort ?? DEFAULT_SORT);

  const visibleTasks = useMemo(() => {
    const filtered = activeWorkspace
      ? tasks.filter((task) => task.workspaceId === activeWorkspace)
      : tasks;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = readSortKey(a, sort.field);
      const bv = readSortKey(b, sort.field);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [tasks, activeWorkspace, sort]);

  const activeTask = useMemo(
    () => visibleTasks.find((task) => task.id === activeTaskId) ?? visibleTasks[0],
    [visibleTasks, activeTaskId],
  );

  return (
    <div className="manager-view" data-manager-view="three-column" style={COLUMN_GRID}>
      <div style={COLUMN}>
        <WorkbenchPanel eyebrow="Manager" title="Workspaces" meta={`${workspaces.length}`}>
          <div style={SCROLL_BODY}>
            <button
              style={{
                ...ITEM_BUTTON_BASE,
                outline: activeWorkspace === null ? "2px solid var(--accent)" : "none",
              }}
              onClick={() => setActiveWorkspace(null)}
              type="button"
            >
              <span>All workspaces</span>
              <small style={{ color: "var(--ink-muted)" }}>{tasks.length}</small>
            </button>
            {workspaces.map((card) => (
              <button
                key={card.workspaceId}
                style={{
                  ...ITEM_BUTTON_BASE,
                  outline:
                    activeWorkspace === card.workspaceId ? "2px solid var(--accent)" : "none",
                }}
                onClick={() => setActiveWorkspace(card.workspaceId)}
                type="button"
              >
                <div style={{ display: "grid", gap: "var(--space-0-5)" }}>
                  <strong>{card.name}</strong>
                  <small style={{ color: "var(--ink-muted)" }}>
                    {card.counts.running} running &middot; {card.counts.queued} queued &middot;{" "}
                    {card.counts.awaitingApproval} review
                  </small>
                </div>
                <small style={{ color: "var(--ink-faint)" }}>
                  {card.lastActivityAt ? formatRelative(card.lastActivityAt) : ""}
                </small>
              </button>
            ))}
            {workspaces.length === 0 && props.onCreateWorkspace ? (
              <button
                style={ITEM_BUTTON_BASE}
                onClick={props.onCreateWorkspace}
                type="button"
              >
                <span>Create workspace</span>
                <small style={{ color: "var(--ink-muted)" }}>+</small>
              </button>
            ) : null}
          </div>
        </WorkbenchPanel>
      </div>

      <div style={COLUMN}>
        <WorkbenchPanel
          eyebrow="Tasks"
          title={activeWorkspace ? labelFor(workspaces, activeWorkspace) : "All tasks"}
          meta={`${visibleTasks.length}`}
        >
          <div style={SCROLL_BODY}>
            {visibleTasks.length === 0 ? (
              <p style={{ color: "var(--ink-muted)", padding: "var(--space-2)" }}>
                No tasks match the current filter.
              </p>
            ) : null}
            {visibleTasks.map((task) => (
              <button
                key={task.id}
                style={{
                  ...ITEM_BUTTON_BASE,
                  borderColor: task.id === activeTask?.id ? "var(--accent)" : "var(--line)",
                }}
                onClick={() => {
                  setActiveTaskId(task.id);
                  onSelect?.(task);
                }}
                type="button"
              >
                <div style={{ display: "grid", gap: "var(--space-0-5)" }}>
                  <strong>{task.title}</strong>
                  <small style={{ color: "var(--ink-muted)" }}>
                    {task.harness}
                    {task.agent ? ` / ${task.agent}` : ""} &middot; {task.kind}
                  </small>
                </div>
                <span
                  className="status-dot"
                  data-status={task.status}
                  style={{
                    width: "var(--status-dot-size)",
                    height: "var(--status-dot-size)",
                    borderRadius: "999px",
                    background: STATUS_TOKEN[task.status],
                    alignSelf: "center",
                  }}
                  aria-label={task.status}
                />
              </button>
            ))}
          </div>
        </WorkbenchPanel>
      </div>

      <div style={COLUMN}>
        <WorkbenchPanel eyebrow="Detail" title={activeTask?.title ?? "No task selected"}>
          <div style={{ ...SCROLL_BODY, gap: "var(--space-2)" }}>
            {activeTask ? (
              <DetailBody
                task={activeTask}
                onCancel={onCancel}
                onApprove={onApprove}
              />
            ) : (
              <p style={{ color: "var(--ink-muted)" }}>Select a task to inspect it.</p>
            )}
          </div>
        </WorkbenchPanel>
      </div>
    </div>
  );
}

function DetailBody(props: {
  task: ManagerTask;
  onCancel?: (task: ManagerTask) => void;
  onApprove?: (task: ManagerTask) => void;
}) {
  const { task } = props;
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <DetailRow label="Workspace" value={task.workspaceId} />
      <DetailRow label="Status" value={task.status} />
      <DetailRow label="Kind" value={task.kind} />
      <DetailRow label="Harness" value={task.harness} />
      {task.agent ? <DetailRow label="Agent" value={task.agent} /> : null}
      <DetailRow label="Created" value={task.createdAt} />
      <DetailRow label="Updated" value={task.updatedAt} />
      {typeof task.estimatedCostUsd === "number" ? (
        <DetailRow label="Est. cost" value={`$${task.estimatedCostUsd.toFixed(2)}`} />
      ) : null}
      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
        {task.status === "awaiting-approval" && props.onApprove ? (
          <button
            style={{
              padding: "var(--space-1) var(--space-3)",
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "var(--primary-foreground)",
              borderRadius: "var(--radius-default)",
              cursor: "pointer",
            }}
            onClick={() => props.onApprove?.(task)}
            type="button"
          >
            Approve
          </button>
        ) : null}
        {task.status === "running" || task.status === "queued" || task.status === "awaiting-approval" ? (
          props.onCancel ? (
            <button
              style={{
                padding: "var(--space-1) var(--space-3)",
                border: "1px solid var(--line-strong)",
                background: "var(--surface)",
                color: "var(--ink)",
                borderRadius: "var(--radius-default)",
                cursor: "pointer",
              }}
              onClick={() => props.onCancel?.(task)}
              type="button"
            >
              Cancel
            </button>
          ) : null
        ) : null}
      </div>
    </div>
  );
}

function DetailRow(props: { label: string; value: string }) {
  return (
    <div className="manager-detail-row">
      <span className="manager-detail-label">{props.label}</span>
      <span className="manager-detail-value">{props.value}</span>
    </div>
  );
}

function readSortKey(task: ManagerTask, field: ManagerSort["field"]): string {
  switch (field) {
    case "createdAt":
      return task.createdAt;
    case "updatedAt":
      return task.updatedAt;
    case "agent":
      return task.agent ?? "";
    case "harness":
      return task.harness;
    case "status":
      return task.status;
    default:
      return task.updatedAt;
  }
}

function labelFor(workspaces: ManagerWorkspaceCard[], id: string): string {
  return workspaces.find((card) => card.workspaceId === id)?.name ?? id;
}

function formatRelative(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const diffMs = Date.now() - ts;
  if (diffMs < 60_000) return "just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}
