// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import type {
  MermaidBoard,
  MermaidBoardAgentSurface,
  MermaidBoardAgentSurfaceAction,
  MermaidBoardAgentSurfaceLane,
  MermaidBoardAgentSurfaceNodeDefault,
  MermaidBoardBrief,
  MermaidBoardFigJamSyncStatus,
} from "./studio-api";
import { WORKBENCH_COPY } from "./workbench-copy";

type HydratedMermaidBoard = MermaidBoard & { agentSurface: MermaidBoardAgentSurface };

const PM_BOARD_LANES: MermaidBoardAgentSurfaceLane[] = WORKBENCH_COPY.boardFallback.lanes.map((lane) => ({ ...lane }));
const PM_BOARD_ACTIONS: MermaidBoardAgentSurfaceAction[] = WORKBENCH_COPY.boardFallback.actions.map((action) => ({ ...action }));
const PM_BOARD_SYNC_STATES: MermaidBoardAgentSurface["sync"]["states"] = WORKBENCH_COPY.boardFallback.syncStates;

export function hydrateMermaidBoardAgentSurface(board: MermaidBoard): HydratedMermaidBoard {
  const fallback = defaultMermaidBoardAgentSurface(board);
  const surface = board.agentSurface;
  if (!surface) {
    return { ...board, mode: board.mode ?? "pm-brainstorm", templateId: board.templateId ?? "pm-brainstorm", brief: board.brief ?? defaultMermaidBrief(), agentSurface: fallback };
  }

  const agentSurface: MermaidBoardAgentSurface = {
    ...fallback,
    ...surface,
    actions: surface.actions?.length ? surface.actions : fallback.actions,
    promptChips: surface.promptChips?.length ? surface.promptChips : fallback.promptChips,
    lanes: surface.lanes?.length ? surface.lanes : fallback.lanes,
    nodeDefaults: surface.nodeDefaults?.length ? surface.nodeDefaults : fallback.nodeDefaults,
    empty: { ...fallback.empty, ...surface.empty },
    sketch: { ...fallback.sketch, ...surface.sketch },
    inspector: { ...fallback.inspector, ...surface.inspector },
    nodeMeta: { ...fallback.nodeMeta, ...surface.nodeMeta },
    sync: {
      ...fallback.sync,
      ...surface.sync,
      states: mergeSyncStates(surface.sync?.states, fallback.sync.states),
    },
  };
  return { ...board, mode: board.mode ?? "pm-brainstorm", templateId: board.templateId ?? "pm-brainstorm", brief: board.brief ?? defaultMermaidBrief(), agentSurface };
}

function defaultMermaidBoardAgentSurface(board: MermaidBoard): MermaidBoardAgentSurface {
  const copy = WORKBENCH_COPY.boardFallback.surface;
  const title = board.title || copy.title;
  const brief = board.brief ?? defaultMermaidBrief();
  return {
    ariaLabel: title,
    eyebrow: copy.eyebrow,
    fallbackTitle: title,
    startSummary: copy.startSummary,
    briefLabel: copy.briefLabel,
    cardsLabel: copy.cardsLabel,
    linksLabel: copy.linksLabel,
    actions: PM_BOARD_ACTIONS,
    promptChips: WORKBENCH_COPY.boardFallback.promptChips.map((chip) => ({ ...chip })),
    lanes: PM_BOARD_LANES,
    nodeDefaults: defaultNodeDefaults(brief),
    empty: {
      title: copy.emptyTitle,
      body: copy.emptyBody,
      actionLabel: copy.emptyActionLabel,
      offlineTitle: copy.offlineTitle,
    },
    sketch: {
      title: copy.sketchTitle,
      body: copy.sketchBody,
    },
    inspector: {
      empty: copy.inspectorEmpty,
      whyTitle: copy.whyTitle,
      authorshipTitle: copy.authorshipTitle,
      agentAuthored: copy.agentAuthored,
      humanAuthored: copy.humanAuthored,
      evidenceTitle: copy.evidenceTitle,
      noEvidence: copy.noEvidence,
      mermaidSourceTitle: copy.mermaidSourceTitle,
      decisionPrefix: copy.decisionPrefix,
      openDecision: copy.openDecision,
    },
    nodeMeta: {
      openState: copy.openState,
      linksLabel: copy.linksLabel,
      evidenceRefsLabel: copy.evidenceRefsLabel,
      separator: copy.separator,
    },
    sync: {
      title: copy.syncTitle,
      exportActionLabel: copy.exportActionLabel,
      staleDetail: copy.staleDetail,
      states: PM_BOARD_SYNC_STATES,
    },
  };
}

function defaultNodeDefaults(brief: MermaidBoardBrief): MermaidBoardAgentSurfaceNodeDefault[] {
  return WORKBENCH_COPY.boardFallback.nodeDefaults(brief);
}

function defaultMermaidBrief(): MermaidBoardBrief {
  return WORKBENCH_COPY.boardFallback.brief();
}

function mergeSyncStates(
  states: Partial<Record<MermaidBoardFigJamSyncStatus | "not_sent", { label: string; detail: string }>> | undefined,
  fallback: MermaidBoardAgentSurface["sync"]["states"],
): MermaidBoardAgentSurface["sync"]["states"] {
  return {
    not_sent: { ...fallback.not_sent, ...states?.not_sent },
    idle: { ...fallback.idle, ...states?.idle },
    synced: { ...fallback.synced, ...states?.synced },
    fallback: { ...fallback.fallback, ...states?.fallback },
    failed: { ...fallback.failed, ...states?.failed },
    unavailable: { ...fallback.unavailable, ...states?.unavailable },
  };
}
