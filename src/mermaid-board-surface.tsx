// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { useEffect, useMemo, useState } from "react";
import {
  type MermaidBoard,
  type MermaidBoardAgentSurface,
  type MermaidBoardAgentSurfaceAction,
  type MermaidBoardAgentSurfaceLane,
  type MermaidBoardNodeKind,
  type MermaidBoardExport,
} from "./studio-api";

const CARD_BODY_CHAR_BUDGET = 220;

type BoardRuntimeRecovery = {
  state: "ready" | "stale" | "offline";
  title: string;
  message: string;
  actionLabel: string;
  canRestart: boolean;
};

export interface MermaidBoardSurfaceProps {
  board: MermaidBoard | null;
  exports: MermaidBoardExport[];
  loading: boolean;
  error: string | null;
  coreRuntimeReady: boolean;
  pmRuntimeReady: boolean;
  recovery: BoardRuntimeRecovery;
  onCreate: () => void | Promise<void>;
  onRestartRuntime: () => void | Promise<void>;
  onApplyTemplate: () => void | Promise<void>;
  onAddNode: (kind: MermaidBoardNodeKind) => void | Promise<void>;
  onLayout: () => void | Promise<void>;
  onExport: () => void | Promise<void>;
  onSyncFigJam: () => void | Promise<void>;
  onUsePrompt: (prompt: string) => void;
}

export default function MermaidBoardSurface(props: MermaidBoardSurfaceProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const board = props.board;
  const surface = board?.agentSurface;
  const selectedNode = board?.nodes.find((node) => node.id === selectedNodeId) ?? board?.nodes[0] ?? null;
  const coreControlsDisabled = props.loading || !props.coreRuntimeReady;
  const pmControlsDisabled = coreControlsDisabled || !props.pmRuntimeReady;
  const sync = board?.lastFigJamSync ?? null;
  const lanes = useMemo(() => surface ? boardLanes(board, surface) : [], [board, surface]);

  useEffect(() => {
    if (!selectedNodeId || board?.nodes.some((node) => node.id === selectedNodeId)) return;
    setSelectedNodeId(null);
  }, [board, selectedNodeId]);

  if (!surface) {
    return (
      <section
        className="mermaid-board-surface"
        data-mermaid-board="pm-brainstorm"
        data-agent-copy="pending"
        data-core-runtime-ready={props.coreRuntimeReady ? "true" : "false"}
        data-pm-runtime-ready={props.pmRuntimeReady ? "true" : "false"}
      >
        <RuntimeRecoveryBanner recovery={props.recovery} loading={props.loading} onRestartRuntime={props.onRestartRuntime} />
        {props.error ? <p className="mermaid-board-error">{props.error}</p> : null}
      </section>
    );
  }

  const syncLabel = figJamSyncLabel(sync, surface);
  return (
    <section
      className="mermaid-board-surface"
      data-mermaid-board="pm-brainstorm"
      data-core-runtime-ready={props.coreRuntimeReady ? "true" : "false"}
      data-pm-runtime-ready={props.pmRuntimeReady ? "true" : "false"}
      aria-label={surface.ariaLabel}
    >
      <header className="mermaid-board-header">
        <div>
          <p className="eyebrow">{surface.eyebrow}</p>
          <h2>{board?.title || surface.fallbackTitle}</h2>
          <span>{board ? `${board.nodes.length} ${surface.cardsLabel} / ${board.edges.length} ${surface.linksLabel} / ${syncLabel.label}` : surface.startSummary}</span>
        </div>
        <div className="mermaid-board-actions">
          {surface.actions.map((action) => (
            <button
              data-action-id={action.id}
              disabled={actionDisabled(action, board, coreControlsDisabled, pmControlsDisabled)}
              key={action.id}
              onClick={() => runBoardAction(action, props)}
              title={action.requires === "pm" && !props.pmRuntimeReady ? props.recovery.title : undefined}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      </header>

      {props.recovery.state !== "ready" ? (
        <RuntimeRecoveryBanner recovery={props.recovery} loading={props.loading} onRestartRuntime={props.onRestartRuntime} />
      ) : null}

      {props.error ? <p className="mermaid-board-error">{props.error}</p> : null}

      <section className="mermaid-board-brief" data-mermaid-board-brief="pm-workflow">
        <div>
          <span>{surface.briefLabel}</span>
          <strong>{board?.brief?.problem}</strong>
          <small>{board?.brief?.targetUser}</small>
        </div>
        <div className="mermaid-board-prompt-chips" data-mermaid-board-prompts="agent-pm-workflows">
          {surface.promptChips.map((chip) => (
            <button data-action-id={`board.prompt.${chip.id}`} key={chip.id} type="button" onClick={() => props.onUsePrompt(chip.prompt)} disabled={props.loading}>
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      <div className="mermaid-board-layout">
        <main className="mermaid-board-canvas" data-mermaid-board-canvas="product-cards">
          {props.coreRuntimeReady ? (
            <>
              {board ? (
                <div className="mermaid-board-lanes" data-mermaid-board-lanes="pm-cards">
                  {lanes.map((lane) => (
                    <section className="mermaid-board-lane" data-mermaid-board-lane={lane.id} data-mermaid-board-lane-overflow={lane.overflow ? "true" : undefined} key={lane.id}>
                      <header>
                        <span>{lane.label}</span>
                        <small>{lane.intent}</small>
                      </header>
                      <div>
                        {lane.nodes.map((node) => (
                          <BoardNodeCard
                            active={selectedNodeId === node.id}
                            edgeCount={board.edges.filter((edge) => edge.fromNodeId === node.id || edge.toNodeId === node.id).length}
                            key={node.id}
                            meta={surface.nodeMeta}
                            node={node}
                            onSelect={() => setSelectedNodeId(node.id)}
                          />
                        ))}
                        {lane.nodes.length === 0 ? <p className="mermaid-board-lane-empty">{lane.emptyCopy}</p> : null}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="mermaid-board-empty">
                  <strong>{surface.empty.title}</strong>
                  <span>{surface.empty.body}</span>
                  <button data-action-id="board.create" type="button" onClick={() => void props.onCreate()} disabled={coreControlsDisabled}>{surface.empty.actionLabel}</button>
                </div>
              )}
              <section className="mermaid-board-sketch-layer" data-mermaid-board-sketch-layer="optional">
                <span>{surface.sketch.title}</span>
                <small>{surface.sketch.body}</small>
              </section>
            </>
          ) : (
            <div className="mermaid-board-empty hard-offline">
              <strong>{surface.empty.offlineTitle}</strong>
              <span>{props.recovery.message}</span>
              {props.recovery.canRestart ? (
                <button type="button" onClick={() => void props.onRestartRuntime()} disabled={props.loading}>
                  {props.recovery.actionLabel}
                </button>
              ) : <small>{props.recovery.actionLabel}</small>}
            </div>
          )}
        </main>
        <aside className="mermaid-board-inspector" data-mermaid-board-inspector="node-detail">
          {selectedNode ? (
            <>
              <span>{selectedNode.laneId ?? fallbackLaneId(selectedNode.kind)} {surface.nodeMeta.separator} {selectedNode.kind} {surface.nodeMeta.separator} {selectedNode.author}</span>
              <h3>{selectedNode.title}</h3>
              <section>
                <strong>{surface.inspector.whyTitle}</strong>
                <p>{selectedNode.body || selectedNode.mermaidSource}</p>
              </section>
              <section>
                <strong>{surface.inspector.authorshipTitle}</strong>
                <p>{selectedNode.author === "agent" ? surface.inspector.agentAuthored : surface.inspector.humanAuthored}</p>
                <small>{surface.inspector.decisionPrefix}: {selectedNode.decisionStatus ?? surface.inspector.openDecision}</small>
              </section>
              <section className="mermaid-board-source-list">
                <strong>{surface.inspector.evidenceTitle}</strong>
                {safeList(selectedNode.researchBacking).length || safeList(selectedNode.sourceEventIds).length ? (
                  <>
                    {safeList(selectedNode.researchBacking).length > 0 ? (
                      <div className="mermaid-board-evidence-group" data-mermaid-board-evidence-group="research">
                        <span>Research</span>
                        <ul className="mermaid-board-evidence-entries">
                          {safeList(selectedNode.researchBacking).map((source) => (
                            <li key={source}><code>{source}</code></li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {safeList(selectedNode.sourceEventIds).length > 0 ? (
                      <div className="mermaid-board-evidence-group" data-mermaid-board-evidence-group="source-events">
                        <span>Source events</span>
                        <ul className="mermaid-board-evidence-entries">
                          {safeList(selectedNode.sourceEventIds).map((eventId) => (
                            <li key={eventId}><code>{eventId}</code></li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : <small>{surface.inspector.noEvidence}</small>}
              </section>
              {selectedNode.mermaidSource ? (
                <details className="mermaid-board-source-details">
                  <summary>{surface.inspector.mermaidSourceTitle}</summary>
                  <pre className="mermaid-board-preview" data-mermaid-preview="source">{selectedNode.mermaidSource}</pre>
                </details>
              ) : null}
            </>
          ) : (
            <p>{surface.inspector.empty}</p>
          )}
          <section className="mermaid-board-export-list" data-mermaid-board-export="figjam-sync">
            <strong>{surface.sync.title}</strong>
            <span>{props.pmRuntimeReady ? syncLabel.detail : surface.sync.staleDetail}</span>
            <button data-action-id="board.export_mermaid_jam" type="button" onClick={() => void props.onExport()} disabled={coreControlsDisabled || !board}>
              {surface.sync.exportActionLabel}
            </button>
            {sync?.fallbackReason ? <small>{sync.fallbackReason}</small> : null}
            {props.exports.length > 0 ? (
              props.exports.slice(0, 3).map((item) => (
                <article key={item.id}>
                  <span>{item.format}</span>
                  <small>{item.outputPath}</small>
                </article>
              ))
            ) : (
              <div className="pane-empty-state" data-empty-variant="compact">
                <h3>No exports yet</h3>
                <p>Export to FigJam to see sync history here.</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

function RuntimeRecoveryBanner(props: { recovery: BoardRuntimeRecovery; loading: boolean; onRestartRuntime: () => void | Promise<void> }) {
  if (props.recovery.state === "ready") return null;
  const contents = (
    <>
      <div>
        <strong>{props.recovery.title}</strong>
        <span>{props.recovery.message}</span>
      </div>
      {props.recovery.canRestart ? (
        <button type="button" onClick={() => void props.onRestartRuntime()} disabled={props.loading}>
          {props.recovery.actionLabel}
        </button>
      ) : <small>{props.recovery.actionLabel}</small>}
    </>
  );
  if (props.recovery.state === "stale") {
    return (
      <section className="mermaid-board-runtime-banner stale" data-mermaid-board-runtime="stale" data-mermaid-board-recovery="runtime">
        {contents}
      </section>
    );
  }
  return (
    <section className="mermaid-board-runtime-banner offline" data-mermaid-board-runtime="offline" data-mermaid-board-recovery="runtime">
      {contents}
    </section>
  );
}

function BoardNodeCard(props: {
  node: MermaidBoard["nodes"][number];
  active: boolean;
  edgeCount: number;
  meta: MermaidBoardAgentSurface["nodeMeta"];
  onSelect: () => void;
}) {
  const evidenceCount = safeList(props.node.researchBacking).length + safeList(props.node.sourceEventIds).length;
  return (
    <button
      className={`mermaid-board-node ${props.active ? "active" : ""}`}
      data-mermaid-board-node={props.node.kind}
      data-mermaid-board-lane={props.node.laneId ?? fallbackLaneId(props.node.kind)}
      data-node-id={props.node.id}
      type="button"
      onClick={props.onSelect}
    >
      <span>{props.node.author} {props.meta.separator} {props.node.decisionStatus ?? props.meta.openState}</span>
      <strong>{props.node.title}</strong>
      <small title={props.node.body}>{trimBoardText(props.node.body || props.node.mermaidSource || "", CARD_BODY_CHAR_BUDGET)}</small>
      <em>{props.edgeCount} {props.meta.linksLabel} {props.meta.separator} {evidenceCount} {props.meta.evidenceRefsLabel}</em>
    </button>
  );
}

function runBoardAction(action: MermaidBoardAgentSurfaceAction, props: MermaidBoardSurfaceProps) {
  if (action.id === "board.apply_template") return void props.onApplyTemplate();
  if (action.id === "board.layout") return void props.onLayout();
  if (action.id === "board.sync_figjam") return void props.onSyncFigJam();
  if (action.nodeKind) return void props.onAddNode(action.nodeKind);
  return undefined;
}

function actionDisabled(
  action: MermaidBoardAgentSurfaceAction,
  board: MermaidBoard | null,
  coreControlsDisabled: boolean,
  pmControlsDisabled: boolean,
): boolean {
  if (action.requires === "pm") return pmControlsDisabled;
  return coreControlsDisabled || (action.id === "board.layout" && !board);
}

function boardLanes(board: MermaidBoard | null, surface: MermaidBoardAgentSurface): Array<MermaidBoardAgentSurfaceLane & { nodes: MermaidBoard["nodes"]; overflow?: boolean }> {
  const nodes = board?.nodes ?? [];
  const lanes: Array<MermaidBoardAgentSurfaceLane & { nodes: MermaidBoard["nodes"]; overflow?: boolean }> = surface.lanes.map((lane) => ({
    ...lane,
    nodes: nodes.filter((node) => (node.laneId ?? fallbackLaneId(node.kind)) === lane.id),
  }));
  const knownLaneIds = new Set(surface.lanes.map((lane) => lane.id));
  const overflowNodes = nodes.filter((node) => !knownLaneIds.has(node.laneId ?? fallbackLaneId(node.kind)));
  const overflowByLaneId = new Map<string, MermaidBoard["nodes"]>();
  for (const node of overflowNodes) {
    const laneId = node.laneId ?? fallbackLaneId(node.kind);
    const bucket = overflowByLaneId.get(laneId);
    if (bucket) {
      bucket.push(node);
    } else {
      overflowByLaneId.set(laneId, [node]);
    }
  }
  for (const [laneId, laneNodes] of overflowByLaneId) {
    lanes.push({
      id: laneId,
      label: `Unassigned: ${laneId}`,
      intent: "",
      emptyCopy: "",
      nodes: laneNodes,
      overflow: true,
    });
  }
  return lanes;
}

function fallbackLaneId(kind: MermaidBoardNodeKind): string {
  if (kind === "persona") return "users";
  if (kind === "mermaid") return "journey";
  if (kind === "spec") return "opportunities";
  if (kind === "comment") return "decisions";
  if (kind === "risk") return "risks";
  if (kind === "metric") return "metrics";
  if (kind === "evidence") return "next-steps";
  return "problem";
}

function figJamSyncLabel(sync: MermaidBoard["lastFigJamSync"] | null, surface: MermaidBoardAgentSurface): { label: string; detail: string } {
  const state = sync ? surface.sync.states[sync.status] : surface.sync.states.not_sent;
  if (sync?.status === "synced") {
    return {
      label: state.label,
      detail: `${sync.createdNodeCount} ${state.detail}`,
    };
  }
  return state;
}

function safeList(value: string[] | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function trimBoardText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}
