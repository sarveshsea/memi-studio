// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { useEffect, useMemo, useState } from "react";
import type { MermaidBoard, MermaidBoardExport, MermaidBoardNode, StudioEvent } from "./studio-api";
import { IconButton, StudioControlIcon, trimText } from "./workbench-components";
import { WORKBENCH_ACTIONS } from "./workbench-copy";

export interface IASurfaceProps {
  board: MermaidBoard | null;
  exports: MermaidBoardExport[];
  events: StudioEvent[];
  loading: boolean;
  error: string | null;
  coreRuntimeReady: boolean;
  pmRuntimeReady: boolean;
  onCapture: () => void;
  onExport: () => void;
  onSyncFigJam: () => void;
  onUsePrompt: (prompt: string) => void;
}

const IA_PROMPTS = [
  "Create an Information Architecture section with sitemap, navigation, evidence, risks, and a fenced Mermaid flowchart.",
  "Create a User Journey section with phases, user actions, friction, screens, and a fenced Mermaid journey diagram.",
  "Create a screen map with routes, states, empty states, and a fenced Mermaid sequenceDiagram.",
];

export default function IASurface(props: IASurfaceProps) {
  const nodesByLane = useMemo(() => groupIANodes(props.board?.nodes ?? []), [props.board]);
  const mermaidNodes = (props.board?.nodes ?? []).filter((node) => node.kind === "mermaid");
  const sourceCount = props.events.filter((event) => isIAEventText(`${event.type} ${event.message ?? ""} ${JSON.stringify(event.data ?? {})}`)).length;
  return (
    <section className="ia-surface" data-information-architecture="mermaid-jam" aria-label="Information Architecture">
      <header className="ia-surface-head">
        <div>
          <p className="eyebrow">IA</p>
          <h2>{props.board?.title ?? "Information Architecture"}</h2>
          <span>{props.board?.nodes.length ?? 0} cards / {sourceCount} sources</span>
        </div>
        <div className="inline-actions">
          <IconButton actionId="board.capture_ia" ariaLabel="Capture IA" title="Capture IA" icon="ia" onClick={props.onCapture} disabled={props.loading || !props.coreRuntimeReady} />
          <IconButton {...WORKBENCH_ACTIONS.export} actionId="board.export_mermaid_jam.ia" onClick={props.onExport} disabled={props.loading || !props.board} />
          <IconButton actionId="board.sync_figjam.ia" ariaLabel="Sync IA to FigJam" title="Sync IA to FigJam" icon="figma" onClick={props.onSyncFigJam} disabled={props.loading || !props.board || !props.pmRuntimeReady} />
        </div>
      </header>

      {props.error ? <p className="error">{props.error}</p> : null}
      {!props.board ? (
        <div className="ia-empty-state" data-smart-empty-state="ia">
          <button type="button" data-action-id="board.capture_ia.empty" onClick={props.onCapture} disabled={props.loading || !props.coreRuntimeReady}>
            <StudioControlIcon name={props.loading ? "sync" : "ia"} />
            <span>{props.loading ? "Loading" : "Capture"}</span>
          </button>
          <div className="ia-prompt-row">
            {IA_PROMPTS.map((prompt) => (
              <button key={prompt} data-action-id={`ia.prompt.${shortPromptLabel(prompt).toLowerCase()}`} type="button" onClick={() => props.onUsePrompt(prompt)}>{shortPromptLabel(prompt)}</button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="ia-source-strip" data-research-source-strip="ia">
            <span>{props.board.mode ?? "ia"}</span>
            <span>{props.board.templateId ?? "ia-journeys"}</span>
            <span>{props.board.lastFigJamSync?.status ?? "not_sent"}</span>
            {props.exports.slice(0, 2).map((item) => <span key={item.id}>{item.format}</span>)}
          </div>
          <div className="ia-lane-grid">
            {Array.from(nodesByLane.entries()).map(([laneId, nodes]) => (
              <section className="ia-lane" data-ia-lane={laneId} key={laneId}>
                <header>
                  <strong>{laneLabel(laneId)}</strong>
                  <span>{nodes.length}</span>
                </header>
                {nodes.slice(0, 5).map((node) => (
                  <article className="ia-card" data-ia-card={node.kind} key={node.id}>
                    <strong>{node.title}</strong>
                    <span>{trimText(node.body || node.mermaidSource || "No source", 110)}</span>
                  </article>
                ))}
              </section>
            ))}
          </div>
          <section className="ia-mermaid-previews" data-ia-mermaid-previews>
            {mermaidNodes.length ? mermaidNodes.map((node) => <MermaidPreview key={node.id} node={node} />) : <span className="empty">No Mermaid</span>}
          </section>
        </>
      )}
    </section>
  );
}

function MermaidPreview({ node }: { node: MermaidBoardNode }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function renderMermaid() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "dark" });
        const rendered = await mermaid.render(`ia-${node.id.replace(/[^a-z0-9_-]/gi, "-")}`, node.mermaidSource ?? node.body);
        if (!cancelled) {
          setSvg(rendered.svg);
          setError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setSvg("");
          setError(nextError instanceof Error ? nextError.message : String(nextError));
        }
      }
    }
    void renderMermaid();
    return () => {
      cancelled = true;
    };
  }, [node.id, node.mermaidSource, node.body]);

  return (
    <article className="ia-mermaid-card" data-ia-mermaid-card={error ? "invalid" : "rendered"}>
      <header>
        <strong>{node.title}</strong>
        <span>{error ? "Invalid" : "SVG"}</span>
      </header>
      {error ? <pre>{node.mermaidSource ?? node.body}</pre> : <div className="ia-mermaid-svg" dangerouslySetInnerHTML={{ __html: svg }} />}
    </article>
  );
}

function groupIANodes(nodes: MermaidBoardNode[]): Map<string, MermaidBoardNode[]> {
  const groups = new Map<string, MermaidBoardNode[]>();
  for (const node of nodes) {
    const laneId = String(node.laneId ?? (node.kind === "mermaid" ? "journeys" : "evidence"));
    groups.set(laneId, [...(groups.get(laneId) ?? []), node]);
  }
  return groups;
}

function laneLabel(laneId: string): string {
  if (laneId === "next-steps") return "Next";
  if (laneId === "journeys") return "Journeys";
  return laneId.slice(0, 1).toUpperCase() + laneId.slice(1).replace(/-/g, " ");
}

function shortPromptLabel(prompt: string): string {
  if (prompt.includes("User Journey")) return "Journey";
  if (prompt.includes("screen map")) return "Screens";
  return "Sitemap";
}

function isIAEventText(text: string): boolean {
  return /\b(information architecture|ia\b|sitemap|navigation|journey|flow|screen map|sequenceDiagram|mermaid)\b/i.test(text);
}
