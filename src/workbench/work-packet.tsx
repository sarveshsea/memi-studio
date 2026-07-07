// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Work packet pane: review-packet summary, artifact sections, and starters.

import { type FormEvent, type ReactNode, useEffect, useState, memo } from "react";
import {
  type FigmaAction,
  type FigmaActionRequest,
  type FigmaActionResult,
  type FigmaStatus,
  type Harness,
  type MermaidBoardNode,
  type MarketplaceNotesPayload,
  type NoteForkDiff,
  type NoteForkFile,
  type NoteForkPrHandoff,
  type NoteForkSummary,
  type NoteForkValidation,
  type ProjectMemoryItem,
  type SessionSummary,
  type StudioAction,
  type AgentInstallTargetInput,
  type StudioAutomationDefinition,
  type StudioAutomationMutationPolicy,
  type StudioAutomationRun,
  type StudioAutomationSchedulerStatus,
  type StudioAutomationTemplate,
  type StudioCompatibilitySnapshot,
  type StudioCompatibilityToolAction,
  type StudioConfig,
  type StudioBrowserStatus,
  type StudioComputerStatus,
  type StudioDesignSystemTrace,
  type StudioDesignSystemTraceFile,
  type StudioDownloadJob,
  type DesignChangelogCreateInput,
  type DesignChangelogEntry,
  type DesignChangelogPatchInput,
  type DesignSystemArtifact,
  type DesignSystemArtifactReviewState,
  type DesignSystemArtifactSection,
  type StudioEvent,
  type StudioHarnessSetupAction,
  type StudioHarnessSetupPlan,
  type StudioInputMode,
  type StudioAttachment,
  type StudioActiveProcess,
  type StudioActivityItem,
  type StudioCodexApprovalPolicy,
  type StudioCodexConfig,
  type StudioCodexReasoningEffort,
  type StudioKnowledgeItem,
  type StudioPermissionMode,
  type StudioReferenceTraceItem,
  type StudioRecentWorkspace,
  type StudioReviewPacket,
  type StudioStatus,
  type StudioToolDefinition,
  type StudioWorkArtifact,
  type StudioWorkArtifactKind,
} from "../studio-api";
import { type StudioTraceModel, type StudioTraceTask } from "../runtime/index.js";
import { WorkbenchPanel } from "../studio-primitives";
import {
  WORKBENCH_ACTIONS,
  WORKBENCH_COPY,
  type WorkbenchActionCopy,
  type WorkbenchIconName,
} from "../workbench-copy";
import {
  compactRunLabel,
  compactRunSummary,
  currentWorkspaceProject,
  harnessVisibility,
  isPrimaryHarness,
  isVerificationRunText,
  sidebarNavigationSessions,
} from "../studio-workbench";
import { MEMOIRE_PACKAGE_NAME, MEMOIRE_PACKAGE_VERSION, MEMOIRE_STUDIO_VERSION } from "../runtime/package-info";
import {
  ActionChip,
  FigmaLogoMark,
  IconButton,
  MemoireLogoMark,
  SidebarIcon,
  StudioControlIcon,
  StudioLineIcon,
  type StudioControlIconName,
} from "./icons";
import {
  type FormattedNode,
  type OutputTabId,
  type ResearchSource,
  type TerminalBlock,
  type TerminalBlockKind,
  type WorkPacketStarter,
  AGENTIC_EVENT_TYPES,
  ARTIFACT_EVENT_TYPES,
  OUTPUT_TABS,
  activityGlyph,
  activityMeta,
  artifactCardsFromPacket,
  asEventRecord,
  compactName,
  copyText,
  deriveOutputItems,
  deriveSessionStatus,
  displaySourceLabel,
  eventLabel,
  expectedDmgPath,
  figmaStatusLabel,
  filterContextItems,
  filterKnowledgeItems,
  filterTerminalBlocksByQuery,
  firstMeaningfulLine,
  formatDataPreview,
  formatLogPayload,
  formatTime,
  groupSessionsByProject,
  isFigmaBridgeRunning,
  isFigmaPluginConnected,
  knowledgeKindLabel,
  marketplaceNoteFreshness,
  marketplaceSourceBucket,
  marketplaceSourceLabel,
  memoryFilterCounts,
  outputEventMatches,
  outputItemMatches,
  pickEventString,
  researchSourcesFromEvents,
  stripAnsi,
  trimText,
  workArtifactKindFromEvent,
  workArtifactKindLabel,
} from "./shared";
function WorkPacketPaneImpl(props: {
  events: StudioEvent[];
  packet: StudioReviewPacket | null;
  session: SessionSummary | null;
  harnessLabel?: string;
  starters?: WorkPacketStarter[];
  onExport: () => void;
  onOpenBoard: () => void;
  onOpenChangelog: () => void;
  onOpenFigma: () => void;
  onRefresh: () => void;
  onCreatePacket?: () => void;
  onOpenWorkspace?: () => void;
  onBrowseTemplates?: () => void;
  onViewExamples?: () => void;
}) {
  const packet = props.packet;
  const sources = researchSourcesFromEvents(props.events);
  if (!packet) {
    return (
      <section className="work-packet-pane" data-work-packet-pane="review-packet" aria-label="Work Packet">
        <header>
          <div>
            <span>Work Packet</span>
            <h2>No packet yet</h2>
            <p>Packets appear after a run captures artifacts, decisions, evidence, visuals, or next moves.</p>
          </div>
          <button data-action-id="work-packet.refresh" type="button" onClick={props.onRefresh}>Refresh</button>
        </header>
        <ResearchSourceStrip sources={sources} onSync={props.onRefresh} />
        <section className="work-packet-empty" data-empty-state="work-packet">
          <WorkPacketEmptyIllustration />
          <div className="work-packet-empty-body">
            <span className="work-packet-empty-pill">No packet captured yet</span>
            <h3>Run first, packet second</h3>
            <p>Use the composer to create work. memi will collect the packet when the agent produces something reviewable.</p>
            <div className="work-packet-empty-actions">
              {props.onCreatePacket ? (
                <button
                  className="primary"
                  type="button"
                  data-action-id="work-packet.create"
                  onClick={props.onCreatePacket}
                >
                  Start in composer
                </button>
              ) : null}
              {props.onOpenWorkspace ? (
                <button
                  type="button"
                  data-action-id="work-packet.open-existing"
                  onClick={props.onOpenWorkspace}
                >
                  Open folder
                </button>
              ) : null}
              {props.onBrowseTemplates ? (
                <button
                  type="button"
                  data-action-id="work-packet.browse-templates"
                  onClick={props.onBrowseTemplates}
                >
                  Browse templates
                </button>
              ) : null}
              {props.onViewExamples ? (
                <button
                  type="button"
                  data-action-id="work-packet.view-examples"
                  onClick={props.onViewExamples}
                >
                  View examples
                </button>
              ) : null}
              {props.onOpenBoard ? (
                <button
                  type="button"
                  data-action-id="work-packet.open-board"
                  onClick={props.onOpenBoard}
                >
                  Open board
                </button>
              ) : null}
            </div>
            {props.starters?.length ? (
              <div className="work-packet-empty-starters">
                <span className="work-packet-empty-starters-label">Starters</span>
                <div className="work-packet-empty-starters-row">
                  {props.starters.map((starter) => (
                    <button
                      key={starter.label}
                      type="button"
                      className="work-packet-empty-starter-chip"
                      data-action-id="work-packet.starter"
                      title={starter.description}
                      onClick={starter.onSelect}
                    >
                      {starter.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    );
  }
  return (
    <section className="work-packet-pane" data-work-packet-pane="review-packet" aria-label="Work Packet">
      <header>
        <div>
          <span>Work Packet / {packet.reviewState}</span>
          <h2>{packet.title}</h2>
          <p>{packet.objective}</p>
          <p className="work-packet-header-meta">
            {props.harnessLabel ? <span data-work-packet-meta="harness">{props.harnessLabel}</span> : null}
            {props.session ? <span data-work-packet-meta="session">{props.session.prompt ? trimText(props.session.prompt, 48) : props.session.id}</span> : null}
          </p>
        </div>
        <div className="work-packet-actions">
          <button data-action-id="work-packet.refresh" type="button" onClick={props.onRefresh}>Refresh</button>
          <button data-action-id="work-packet.export" type="button" onClick={props.onExport}>Export</button>
        </div>
      </header>
      <ResearchSourceStrip sources={sources} onSync={props.onRefresh} />
      <div className="work-packet-summary-grid">
        <article><span>Created Work</span><strong>{packet.artifacts.length}</strong></article>
        <article><span>Visuals</span><strong>{packet.artifacts.filter((artifact) => artifact.kind === "visual").length}</strong></article>
        <article><span>Decisions</span><strong>{packet.decisions.length}</strong></article>
        <article><span>Evidence</span><strong>{packet.evidence.length}</strong></article>
        <article><span>Risks</span><strong>{packet.risks.length}</strong></article>
      </div>
      <WorkPacketSection title="Created Work" items={packet.artifacts} />
      <WorkPacketSection title="Visuals" items={packet.artifacts.filter((artifact) => artifact.kind === "visual")} />
      <WorkPacketSection title="Decisions" items={packet.decisions} />
      <WorkPacketSection title="Evidence" items={packet.evidence} />
      <WorkPacketSection title="Risks" items={packet.risks} />
      <WorkPacketList title="Acceptance Criteria" items={packet.acceptanceCriteria} />
      <WorkPacketList title="Next Moves" items={packet.nextMoves} />
      {packet.captureWarnings.length ? <WorkPacketList title="Warnings" items={packet.captureWarnings} /> : null}
      <footer className="work-packet-feed-actions">
        <button data-action-id="work-packet.feed.changelog" type="button" onClick={props.onOpenChangelog}>Changelog</button>
      </footer>
    </section>
  );
}

function ResearchSourceStrip({ sources, onSync }: { sources: ResearchSource[]; onSync: () => void }) {
  if (!sources.length) {
    return (
      <div
        className="pane-empty-state work-packet-source-strip-empty"
        data-empty-variant="compact"
        data-smart-empty-state="memory-sync"
      >
        <p>No research sources synced yet. memi pulls sources into memory as the agent works.</p>
        <div className="pane-empty-state-actions">
          <button type="button" data-action-id="memory.empty.sync" onClick={onSync}>Sync memory</button>
        </div>
      </div>
    );
  }
  return (
    <div className="research-source-strip" data-research-source-strip="work-packet">
      {sources.slice(0, 6).map((source) => (
        <span key={`${source.url}-${source.title}`} title={source.url}>{trimText(source.title || source.url, 36)}</span>
      ))}
    </div>
  );
}

function WorkPacketEmptyIllustration() {
  return (
    <svg viewBox="0 0 220 180" role="img" aria-label="Work packet illustration" focusable="false" className="work-packet-empty-svg">
      <defs>
        <radialGradient id="wp-empty-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
          <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wp-empty-cube-front" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.78" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.42" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="148" rx="78" ry="14" fill="url(#wp-empty-glow)" />
      <g fill="none" stroke="var(--line)" strokeWidth="1" opacity="0.7">
        <rect x="40" y="36" width="76" height="48" rx="4" />
        <rect x="46" y="44" width="64" height="3" rx="1.5" fill="var(--line)" stroke="none" />
        <rect x="46" y="52" width="40" height="3" rx="1.5" fill="var(--line)" stroke="none" />
        <rect x="46" y="60" width="52" height="3" rx="1.5" fill="var(--line)" stroke="none" />
        <rect x="60" y="68" width="32" height="3" rx="1.5" fill="var(--line)" stroke="none" />
      </g>
      <g fill="none" stroke="var(--line-strong)" strokeWidth="1" opacity="0.85">
        <rect x="58" y="58" width="76" height="48" rx="4" />
        <rect x="64" y="66" width="48" height="3" rx="1.5" fill="var(--line-strong)" stroke="none" />
        <rect x="64" y="74" width="64" height="3" rx="1.5" fill="var(--line-strong)" stroke="none" />
        <rect x="64" y="82" width="36" height="3" rx="1.5" fill="var(--line-strong)" stroke="none" />
      </g>
      <g transform="translate(120 80)">
        <polygon points="0,28 22,14 44,28 22,42" fill="var(--surface-soft)" stroke="var(--accent)" strokeWidth="1.3" />
        <polygon points="0,28 22,42 22,70 0,56" fill="url(#wp-empty-cube-front)" stroke="var(--accent)" strokeWidth="1.3" />
        <polygon points="44,28 22,42 22,70 44,56" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.3" opacity="0.85" />
      </g>
      <g stroke="var(--accent)" strokeWidth="1" opacity="0.6">
        <line x1="110" y1="34" x2="110" y2="22" />
        <line x1="110" y1="120" x2="110" y2="132" />
        <line x1="40" y1="78" x2="28" y2="78" />
        <line x1="180" y1="78" x2="192" y2="78" />
      </g>
    </svg>
  );
}

function workArtifactStatusAccent(status: StudioWorkArtifact["status"]): "ok" | "warn" | "accent" {
  if (status === "ready") return "ok";
  if (status === "needs_review") return "warn";
  return "accent";
}

function workArtifactStatusLabel(status: StudioWorkArtifact["status"]): string {
  if (status === "needs_review") return "Needs review";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function WorkPacketSection({ title, items }: { title: string; items: StudioWorkArtifact[] }) {
  return (
    <section className="work-packet-section" data-work-packet-section={title.toLowerCase().replace(/\s+/g, "-")}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <div className="pane-empty-state" data-empty-variant="compact">
          <p>No items captured.</p>
        </div>
      ) : null}
      {items.slice(0, 8).map((item) => (
        <article key={item.id} data-work-artifact-kind={item.kind} data-status-accent={workArtifactStatusAccent(item.status)}>
          <strong>{item.title}</strong>
          <span>{item.summary || item.body}</span>
          <div className="work-packet-artifact-meta">
            <span className="work-packet-artifact-status" data-work-artifact-status={item.status}>{workArtifactStatusLabel(item.status)}</span>
            {item.confidence !== null ? (
              <span className="work-packet-artifact-confidence">{Math.round(item.confidence * 100)}% confidence</span>
            ) : null}
          </div>
          {item.fileRefs.length ? (
            <details className="work-packet-artifact-filerefs">
              <summary>{item.fileRefs.length} file refs</summary>
              <ul>
                {item.fileRefs.map((fileRef) => (
                  <li key={fileRef.path} data-file-ref-status={fileRef.status}>
                    <span className="work-packet-fileref-path" title={fileRef.path}>{fileRef.path}</span>
                    <span className="work-packet-fileref-status">{fileRef.status}</span>
                    <span className="work-packet-fileref-stats">
                      <span className="work-packet-fileref-insertions">+{fileRef.insertions}</span>
                      <span className="work-packet-fileref-deletions">-{fileRef.deletions}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function WorkPacketList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="work-packet-section" data-work-packet-section={title.toLowerCase().replace(/\s+/g, "-")}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <div className="pane-empty-state" data-empty-variant="compact">
          <p>No items captured.</p>
        </div>
      ) : null}
      {items.slice(0, 8).map((item) => <article key={item}><span>{item}</span></article>)}
    </section>
  );
}

// Memoized export: re-renders only when its (stabilized) props change.
export const WorkPacketPane = memo(WorkPacketPaneImpl);
