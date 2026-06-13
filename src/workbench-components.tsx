// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
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
} from "./studio-api";
import { type StudioTraceModel, type StudioTraceTask } from "./runtime/index.js";
import { WorkbenchPanel } from "./studio-primitives";
import {
  WORKBENCH_ACTIONS,
  WORKBENCH_COPY,
  type WorkbenchActionCopy,
  type WorkbenchIconName,
} from "./workbench-copy";
import {
  compactRunLabel,
  compactRunSummary,
  currentWorkspaceProject,
  harnessVisibility,
  isPrimaryHarness,
  isVerificationRunText,
  sidebarNavigationSessions,
} from "./studio-workbench";
import { MEMOIRE_PACKAGE_NAME, MEMOIRE_PACKAGE_VERSION, MEMOIRE_STUDIO_VERSION } from "./runtime/package-info";
import {
  ActionChip,
  FigmaLogoMark,
  IconButton,
  MemoireLogoMark,
  SidebarIcon,
  StudioControlIcon,
  StudioLineIcon,
  type StudioControlIconName,
} from "./workbench/icons";
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
} from "./workbench/shared";
import {
  CODEX_MODEL_OPTIONS,
  CODEX_REASONING_OPTIONS,
  DEFAULT_CODEX_UI_CONFIG,
  type SettingsTone,
  fallbackMacOSPermissionAction,
  isCoreHarness,
  normalizeCodexUiConfig,
} from "./workbench/settings";
import { CommandPaletteIconGlyph, harnessIcon } from "./workbench/icons";
import { type CommandPaletteIcon, formatAutomationDate } from "./workbench/shared";
import { FileReferenceChip } from "./workbench/terminal";

const FIGMA_ACTIONS: Array<{ id: FigmaAction; label: string; primary?: boolean }> = [
  { id: "fullSync", label: "Full sync", primary: true },
  { id: "inspectSelection", label: "Inspect" },
  { id: "pullTokens", label: "Pull tokens" },
  { id: "pullComponents", label: "Pull components" },
  { id: "pullStickies", label: "Pull stickies" },
  { id: "captureScreenshot", label: "Screenshot" },
];

const AUTOMATION_TEMPLATE_ORDER = [
  "design-system-audit",
  "figma-token-component-pull",
  "codex-app-build-review",
  "research-reference-refresh",
];
export function AttachmentShelf(props: {
  attachments: StudioAttachment[];
  onRemove?: (id: string) => void;
}) {
  if (props.attachments.length === 0) return null;
  return (
    <div className="attachment-shelf" data-attachment-shelf="composer-materials">
      {props.attachments.map((attachment) => (
        <article className="attachment-chip" data-attachment-chip={attachment.kind} key={attachment.id}>
          {attachment.kind === "image" && attachment.previewUrl ? <img alt="" src={attachment.previewUrl} /> : <span>{attachment.kind}</span>}
          <div>
            <strong>{attachment.name}</strong>
            <small>{formatAttachmentSize(attachment.size)} / {attachment.source}</small>
          </div>
          {props.onRemove ? <button type="button" onClick={() => props.onRemove?.(attachment.id)}>Remove</button> : null}
        </article>
      ))}
    </div>
  );
}

function formatAttachmentSize(size: number): string {
  if (size > 1_000_000) return `${(size / 1_000_000).toFixed(1)} MB`;
  if (size > 1_000) return `${Math.ceil(size / 1_000)} KB`;
  return `${size} B`;
}

export function ChatQualityLayer(props: {
  action: StudioAction;
  artifacts: DesignSystemArtifact[];
  designTrace: StudioDesignSystemTrace | null;
  events: StudioEvent[];
  lastFailure: StudioEvent | null;
  memoryPins: string[];
  searchQuery: string;
  session: SessionSummary | null;
  sessionStatus: string;
  terminalBlocks: TerminalBlock[];
  traceModel: StudioTraceModel;
  onBranch: () => void;
  onCopyVerification: () => void;
  onFollowUp: (prompt: string) => void;
  onPinMemory: () => void;
  onSearchChange: (query: string) => void;
  onResolveApproval?: (callId: string, decision: "approve" | "deny") => void;
}) {
  const followUps = deriveChatFollowUps(props);
  const verification = deriveVerificationSignals(props);
  const resolvedApprovalCallIds = new Set<string>(
    props.events
      .filter((event) => event.type === "approval_resolved")
      .map((event) => (event.data && typeof event.data === "object" && "callId" in event.data ? String((event.data as { callId: unknown }).callId) : ""))
      .filter(Boolean),
  );
  const approvalRequests = props.events.filter((event) => {
    if (event.type !== "approval_request") return false;
    const callId = event.data && typeof event.data === "object" && "callId" in event.data ? String((event.data as { callId: unknown }).callId) : "";
    return !resolvedApprovalCallIds.has(callId);
  });
  const activeTasks = props.traceModel.tasks.filter((task) => task.status === "running").slice(0, 4);
  const nextTask = props.traceModel.tasks.find((task) => task.status !== "completed");
  const latestArtifact = props.artifacts[0] ?? null;
  const designFileCount = props.designTrace?.files.length ?? 0;
  const laneTasks = activeTasks.length ? activeTasks : nextTask ? [nextTask] : [];
  return (
    <section className="chat-quality-layer" data-chat-qol="codex-antigravity" data-chat-qol-layout="clean-run-context" aria-label="Chat quality controls">
      <div className="chat-quality-head" data-chat-qol-header="run-context">
        <strong>Context</strong>
        <span>{compactStatusLabel(props.sessionStatus)} / {props.events.length} events / {props.terminalBlocks.length} blocks</span>
      </div>
      <section className="chat-live-plan" data-chat-live-plan="current-run">
        <span className="chat-plan-chip" title={props.session?.prompt ?? "Draft prompt"}>{props.session ? trimText(props.session.prompt, 72) : "Draft"}</span>
        <span className="chat-status-chip" data-session-status={props.sessionStatus}>{compactStatusLabel(props.sessionStatus)}</span>
        <span className="chat-next-chip" title={nextTask?.label ?? eventLabel(props.action)}>{nextTask?.label ?? eventLabel(props.action)}</span>
        <IconButton actionId="chat.branch-current" ariaLabel="Branch conversation" title="Branch" icon="branch" onClick={props.onBranch} />
      </section>
      <div className="chat-qol-grid" data-chat-signal-grid="clean-context">
        <label className="chat-search-row" data-chat-search="conversation">
          <StudioControlIcon name="search" />
          <input aria-label="Find conversation output" value={props.searchQuery} onChange={(event) => props.onSearchChange(event.target.value)} placeholder="Find" />
        </label>
        <div className="chat-qol-footer" data-chat-context-actions="review-and-receipt">
          <section className="chat-follow-up-row" data-follow-up-chips="contextual">
            {followUps.slice(0, 2).map((followUp) => (
              <button data-action-id={`chat.follow-up.${followUp.id}`} key={followUp.id} type="button" onClick={() => props.onFollowUp(followUp.prompt)}>
                {followUp.label}
              </button>
            ))}
          </section>
          <section className="chat-memory-pins" data-memory-pins="session">
            <IconButton actionId="chat.pin-memory" ariaLabel="Pin memory" title="Pin memory" icon="pin" onClick={props.onPinMemory}>
              <strong>{props.memoryPins.length}</strong>
            </IconButton>
          </section>
          <section className="chat-signal-card chat-artifact-shelf" data-artifact-shelf="chat-evidence" data-verification-receipt="run">
            <IconButton actionId="chat.copy-verification" ariaLabel="Copy verification" title={`Copy verification: ${verification.summary}`} icon="copy" onClick={props.onCopyVerification} />
            <strong title={latestArtifact?.title ?? verification.status}>{latestArtifact ? trimText(latestArtifact.title, 24) : verification.status}</strong>
            <small>{latestArtifact ? `${props.artifacts.length} artifacts / ${designFileCount} files` : `Artifact verification · ${props.artifacts.length} / ${designFileCount}`}</small>
          </section>
          {approvalRequests.length ? (
            <section className="chat-approval-queue" data-approval-queue="inline" aria-label="Pending approvals">
              <span className="chat-approval-queue-label">{approvalRequests.length} approval{approvalRequests.length === 1 ? "" : "s"} pending</span>
              {approvalRequests.slice(0, 3).map((event) => {
                const data = (event.data && typeof event.data === "object" ? event.data : {}) as Record<string, unknown>;
                const callId = typeof data.callId === "string" ? data.callId : event.id;
                const toolId = typeof data.toolId === "string" ? data.toolId : null;
                return (
                  <article key={event.id} className="chat-approval-card" data-approval-card={callId}>
                    <div className="chat-approval-card-body">
                      <strong>{toolId ?? "tool"}</strong>
                      <span title={event.message}>{trimText(event.message, 80)}</span>
                    </div>
                    <div className="chat-approval-card-actions">
                      <button
                        type="button"
                        className="primary"
                        data-action-id={`approval.approve.${callId}`}
                        onClick={() => props.onResolveApproval?.(callId, "approve")}
                        disabled={!props.onResolveApproval}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        data-action-id={`approval.deny.${callId}`}
                        onClick={() => props.onResolveApproval?.(callId, "deny")}
                        disabled={!props.onResolveApproval}
                      >
                        Deny
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : null}
        </div>
        {laneTasks.length ? (
          <section className="chat-agent-lanes" data-parallel-agent-lanes="mini">
            {laneTasks.map((task) => <span data-task-status={task.status} key={task.id}>{task.label}</span>)}
          </section>
        ) : null}
      </div>
    </section>
  );
}

export function CreationStrip(props: {
  action: StudioAction;
  artifacts: DesignSystemArtifact[];
  designTrace: StudioDesignSystemTrace | null;
  events: StudioEvent[];
  lastFailure: StudioEvent | null;
  memoryPins: string[];
  packet: StudioReviewPacket | null;
  searchQuery: string;
  session: SessionSummary | null;
  sessionStatus: string;
  terminalBlocks: TerminalBlock[];
  traceModel: StudioTraceModel;
  onBranch: () => void;
  onCopyVerification: () => void;
  onFollowUp: (prompt: string) => void;
  onOpenPacket: () => void;
  onPinMemory: () => void;
  onSearchChange: (query: string) => void;
  onSelectArtifact?: (artifact: DesignSystemArtifact) => void;
}) {
  const followUps = deriveChatFollowUps(props);
  const verification = deriveVerificationSignals(props);
  const cards = artifactCardsFromPacket(props.packet, props.events);
  const sessionObjective = props.session ? projectSessionNavItem(props.session).title : "Draft agent work";
  const objective = props.packet?.objective || sessionObjective;
  const objectiveTitle = props.packet?.objective || props.session?.prompt || "Draft agent work";
  const latestArtifact = cards[0] ?? null;
  const latestDesignArtifact = props.artifacts[0] ?? null;
  const canOpenPacket = Boolean(props.packet || latestArtifact || latestDesignArtifact);
  const evidenceCount = props.packet?.evidence.length ?? props.events.filter((event) => /research|artifact|screenshot|snapshot|result/i.test(event.type)).length;
  const decisionCount = props.packet?.decisions.length ?? props.events.filter((event) => event.type === "design_decision").length;
  const visualCount = cards.filter((card) => card.kind === "visual").length || props.events.filter((event) => event.type === "screenshot" || event.type === "browser_snapshot" || event.type === "design_preview").length;
  return (
    <section className="creation-strip" data-creation-strip="artifact-first" aria-label="Creation strip">
      <div className="creation-strip-head">
        <div>
          <strong>Context</strong>
          <span title={objectiveTitle}>{trimText(objective, 96)}</span>
        </div>
        {canOpenPacket ? (
          <button data-action-id="work-packet.open" data-creation-strip-action="open-packet" type="button" onClick={props.onOpenPacket}>
            Open packet
          </button>
        ) : null}
      </div>
      <div className="creation-strip-metrics">
        {latestDesignArtifact && props.onSelectArtifact ? (
          <button data-action-id={`artifact.inspect.${latestDesignArtifact.id}`} title={latestDesignArtifact.title} type="button" onClick={() => props.onSelectArtifact?.(latestDesignArtifact)}>
            {trimText(latestDesignArtifact.title, 42)}
          </button>
        ) : latestArtifact ? (
          <span title={latestArtifact.title}>{trimText(latestArtifact.title, 42)}</span>
        ) : null}
        <span>{evidenceCount} evidence</span>
        <span>{decisionCount} decisions</span>
        <span>{visualCount} visuals</span>
        <span>{compactStatusLabel(props.sessionStatus)}</span>
      </div>
      <div className="creation-strip-tools" data-chat-context-actions="review-and-receipt">
        <label className="chat-search-row" data-chat-search="conversation">
          <StudioControlIcon name="search" />
          <input aria-label="Find conversation output" value={props.searchQuery} onChange={(event) => props.onSearchChange(event.target.value)} placeholder="Find" />
        </label>
        <section className="chat-follow-up-row" data-follow-up-chips="contextual">
          {followUps.slice(0, 2).map((followUp) => (
            <button data-action-id={`chat.follow-up.${followUp.id}`} key={followUp.id} type="button" onClick={() => props.onFollowUp(followUp.prompt)}>
              {followUp.label}
            </button>
          ))}
        </section>
        <IconButton actionId="chat.pin-memory" ariaLabel="Pin memory" title="Pin memory" icon="pin" onClick={props.onPinMemory}>
          <strong>{props.memoryPins.length}</strong>
        </IconButton>
        <IconButton actionId="chat.copy-verification" ariaLabel="Copy verification" title={`Copy verification: ${verification.summary}`} icon="copy" onClick={props.onCopyVerification}>
          <span>Artifact verification</span>
        </IconButton>
        <IconButton actionId="chat.branch-current" ariaLabel="Branch conversation" title="Branch" icon="branch" onClick={props.onBranch} />
      </div>
    </section>
  );
}

export function WorkArtifactCards(props: {
  events: StudioEvent[];
  packet: StudioReviewPacket | null;
  onAddToChangelog: (artifact: StudioWorkArtifact) => void;
  onCopy: (artifact: StudioWorkArtifact) => void;
  onOpenPacket: () => void;
  onSendToBoard: (artifact: StudioWorkArtifact) => void;
  onSendToFigma: (artifact: StudioWorkArtifact) => void;
  onUseAsContext: (artifact: StudioWorkArtifact) => void;
}) {
  const cards = artifactCardsFromPacket(props.packet, props.events).slice(0, 5);
  if (cards.length === 0) return null;
  return (
    <section className="work-artifact-cards" data-work-artifact-cards="inline" aria-label="Agent-created work artifacts">
      {cards.map((artifact) => (
        <article className="work-artifact-card" data-work-artifact-kind={artifact.kind} key={artifact.id}>
          <header>
            <span>{workArtifactKindLabel(artifact.kind)}</span>
            <strong title={artifact.title}>{trimText(artifact.title, 58)}</strong>
          </header>
          <p>{trimText(artifact.summary || artifact.body, 132)}</p>
          <footer>
            <button data-action-id={`work-artifact.open.${artifact.id}`} type="button" onClick={props.onOpenPacket}>Open</button>
            <button data-action-id={`work-artifact.copy.${artifact.id}`} type="button" onClick={() => props.onCopy(artifact)}>Copy</button>
            <button data-action-id={`work-artifact.context.${artifact.id}`} type="button" onClick={() => props.onUseAsContext(artifact)}>Context</button>
            {artifact.kind === "decision" ? <button data-action-id={`work-artifact.changelog.${artifact.id}`} type="button" onClick={() => props.onAddToChangelog(artifact)}>Changelog</button> : null}
          </footer>
        </article>
      ))}
    </section>
  );
}

export function WorkPacketPane(props: {
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
        <ResearchSourceStrip sources={sources} />
        <section className="work-packet-empty" data-empty-state="work-packet">
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
            </div>
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
        </div>
        <div className="work-packet-actions">
          <button data-action-id="work-packet.refresh" type="button" onClick={props.onRefresh}>Refresh</button>
          <button data-action-id="work-packet.export" type="button" onClick={props.onExport}>Export</button>
        </div>
      </header>
      <ResearchSourceStrip sources={sources} />
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

function ResearchSourceStrip({ sources }: { sources: ResearchSource[] }) {
  return (
    <div className="research-source-strip" data-research-source-strip="work-packet">
      {sources.length ? sources.slice(0, 6).map((source) => (
        <span key={`${source.url}-${source.title}`} title={source.url}>{trimText(source.title || source.url, 36)}</span>
      )) : <span data-smart-empty-state="memory-sync">Sync</span>}
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

function WorkPacketSection({ title, items }: { title: string; items: StudioWorkArtifact[] }) {
  return (
    <section className="work-packet-section" data-work-packet-section={title.toLowerCase().replace(/\s+/g, "-")}>
      <h3>{title}</h3>
      {items.length === 0 ? <p>No items captured.</p> : null}
      {items.slice(0, 8).map((item) => (
        <article key={item.id} data-work-artifact-kind={item.kind}>
          <strong>{item.title}</strong>
          <span>{item.summary || item.body}</span>
          {item.fileRefs.length ? <small>{item.fileRefs.length} file refs</small> : null}
        </article>
      ))}
    </section>
  );
}

function WorkPacketList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="work-packet-section" data-work-packet-section={title.toLowerCase().replace(/\s+/g, "-")}>
      <h3>{title}</h3>
      {items.length === 0 ? <p>No items captured.</p> : null}
      {items.slice(0, 8).map((item) => <article key={item}><span>{item}</span></article>)}
    </section>
  );
}

function deriveChatFollowUps(props: {
  designTrace: StudioDesignSystemTrace | null;
  lastFailure: StudioEvent | null;
  sessionStatus: string;
  terminalBlocks: TerminalBlock[];
}): Array<{ id: string; label: string; prompt: string }> {
  if (props.lastFailure) return [{ id: "fix-failure", label: "Fix failure", prompt: `Fix this failure:\n${props.lastFailure.message}` }];
  if (props.designTrace?.files.length) return [
    { id: "review-diff", label: "Review diff", prompt: "Review the changed files and summarize risk, tests, and cleanup." },
    { id: "changelog", label: "Changelog", prompt: "Capture the design-related changes in the local design changelog." },
  ];
  if (props.sessionStatus === "completed") return [{ id: "next-step", label: "Next step", prompt: "Continue from the verification receipt and handle the next highest-value improvement." }];
  if (props.terminalBlocks.length) return [{ id: "explain", label: "Explain", prompt: "Explain the latest output and identify the next action." }];
  return [{ id: "sharpen", label: "Sharpen", prompt: "Turn this prompt into a precise implementation task with acceptance criteria." }];
}

function compactStatusLabel(status: string): string {
  if (status === "completed") return "Done";
  if (status === "running") return "Run";
  if (status === "cancelled") return "Stop";
  if (status === "failed") return "Failed";
  if (status === "idle" || status === "standby") return "Ready";
  return status;
}

function deriveVerificationSignals(props: {
  artifacts: DesignSystemArtifact[];
  designTrace: StudioDesignSystemTrace | null;
  events: StudioEvent[];
  lastFailure: StudioEvent | null;
  sessionStatus: string;
}): { status: string; summary: string } {
  if (props.lastFailure) return { status: "Needs attention", summary: trimText(props.lastFailure.message, 96) };
  const files = props.designTrace?.files.length ?? 0;
  const evidence = props.artifacts.length + props.events.filter((event) => ["session_done", "artifact", "design_system_artifact", "browser_snapshot", "screenshot"].includes(event.type)).length;
  if (props.sessionStatus === "completed") return { status: "Verified", summary: `${files} files / ${evidence} evidence` };
  if (props.sessionStatus === "running") return { status: "Collecting", summary: `${files} files / ${evidence} evidence` };
  return { status: "Ready", summary: `${files} files / ${evidence} evidence` };
}

export function MemoryTable(props: {
  title: string;
  items: ProjectMemoryItem[];
  empty: string;
  compact?: boolean;
  expandable?: boolean;
  onOpen?: (item: ProjectMemoryItem) => void;
  onSync?: () => void;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const expandable = props.expandable ?? true;

  function toggleRow(id: string) {
    if (!expandable) return;
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (props.compact) {
    return (
      <div className="memory-context-list compact-context" data-compact-memory-list role="list" aria-label={props.title}>
        {props.items.length === 0 ? (
          <button className="smart-empty-action" data-action-id="memory.empty.sync" data-smart-empty-state="memory-sync" type="button" onClick={props.onSync}>
            <StudioControlIcon name="memory" />
            <span>Sync</span>
          </button>
        ) : null}
        {props.items.map((item) => (
          <article
            className="memory-context-item"
            data-action-id={`context.open.${item.id}`}
            key={item.id}
            onClick={() => props.onOpen?.(item)}
            role="listitem"
            title={[item.title, item.status].filter(Boolean).join(" · ")}
          >
            <span className="memory-title">
              <strong>{item.title}</strong>
            </span>
            <span className="memory-status">{item.status}</span>
          </article>
        ))}
      </div>
    );
  }

  return (
    <WorkbenchPanel className="memory-table-panel" eyebrow="Memory" title={props.title} meta={String(props.items.length)}>
      <div className="memory-table" role="table">
        <div className="memory-row head" role="row">
          <span>Title</span>
          <span>Status</span>
          <span>Source</span>
          <span>Tags</span>
        </div>
        {props.items.length === 0 ? (
          <button className="smart-empty-action" data-action-id="memory.empty.sync" data-smart-empty-state="memory-sync" type="button" onClick={props.onSync}>
            <StudioControlIcon name="memory" />
            <span>Sync</span>
          </button>
        ) : null}
        {props.items.map((item) => {
          const expanded = expandedRows.has(item.id);
          return (
            <article
              className={expanded ? "memory-row expanded" : "memory-row"}
              key={item.id}
              onClick={() => toggleRow(item.id)}
              role="row"
              tabIndex={expandable ? 0 : undefined}
            >
              <span className="memory-title">
                <strong>{item.title}</strong>
                <small>{trimText(item.summary, 140)}</small>
              </span>
              <span className="memory-status">{item.status}</span>
              <span className="memory-source" title={item.sourcePath}>{displaySourceLabel(item.sourcePath)}</span>
              <span className="tag-list" title={item.tags.join(", ")}>
                {item.tags.slice(0, 4).map((tag) => <em key={tag}>{tag}</em>)}
                {item.tags.length === 0 ? <em>--</em> : null}
              </span>
              {expanded ? (
                <div className="memory-row-detail">
                  <span>{item.summary || item.title}</span>
                  <small>{item.sourcePath}</small>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </WorkbenchPanel>
  );
}

export function TracePanel({ trace }: { trace: StudioTraceModel }) {
  return (
    <section className="phase-tracker" data-phase-tracker="agent-trace" aria-label="Agent trace">
      {trace.phases.map((phase) => (
        <article className={`phase-card ${phase.status}`} data-source-event-id={phase.evidenceIds.at(-1) ?? ""} key={phase.id}>
          <span className="trace-dot" aria-hidden="true" />
          <strong>{phase.label}</strong>
          <small>{phase.status}</small>
        </article>
      ))}
    </section>
  );
}

export function OutputTabs(props: {
  activeTab: OutputTabId;
  artifactEvents: StudioEvent[];
  items: ProjectMemoryItem[];
  latestResult: StudioEvent | null;
  onChange: (tab: OutputTabId) => void;
}) {
  const outputItems = deriveOutputItems(props.activeTab, props.items, props.artifactEvents, props.latestResult);
  return (
    <section className="artifact-workbench" data-output-tabs="run-artifacts" aria-label="Run outputs">
      <nav className="artifact-tabs" aria-label="Output tabs">
        {OUTPUT_TABS.map((tab) => (
          <button
            aria-pressed={props.activeTab === tab.id}
            className={props.activeTab === tab.id ? "active" : ""}
            data-action-id={`output.tab.${tab.id}`}
            key={tab.id}
            onClick={() => props.onChange(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="artifact-grid">
        {outputItems.length === 0 ? <p className="empty">No {props.activeTab} output yet.</p> : null}
        {outputItems.slice(0, 6).map((item) => (
          <article className="artifact-card" key={item.id}>
            <span>{item.meta}</span>
            <strong>{item.title}</strong>
            <p>{trimText(item.summary, 90)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ContextRail(props: {
  contextItemDetail: ProjectMemoryItem | null;
  contextFilter: string;
  contextItems: ProjectMemoryItem[];
  contextQuery: string;
  events: StudioEvent[];
  knowledgeFilter: string;
  knowledgeItemDetail: StudioKnowledgeItem | null;
  knowledgeItems: StudioKnowledgeItem[];
  knowledgeQuery: string;
  memoryItems: ProjectMemoryItem[];
  selectedContextItem: ProjectMemoryItem | null;
  selectedKnowledgeItem: StudioKnowledgeItem | null;
  session: SessionSummary | null;
  traceModel: StudioTraceModel;
  onFilterChange: (filter: string) => void;
  onKnowledgeFilterChange: (filter: string) => void;
  onKnowledgeQueryChange: (query: string) => void;
  onOpenKnowledgeItem: (item: StudioKnowledgeItem) => void;
  onOpenItem: (item: ProjectMemoryItem) => void;
  onQueryChange: (query: string) => void;
  onRefreshKnowledge: () => void;
  onRefreshMemory: () => void;
}) {
  const filters = memoryFilterCounts(props.memoryItems);
  const detailItem = props.contextItemDetail ?? props.selectedContextItem;
  return (
    <>
      <WorkbenchPanel className="context-search-panel" eyebrow="Memory" title="Memory / Context" meta={String(props.contextItems.length)}>
        <div className="context-search-row">
          <input
            aria-label="Search memory context"
            placeholder="Search memory..."
            value={props.contextQuery}
            onChange={(event) => props.onQueryChange(event.target.value)}
          />
          <button data-action-id="memory.refresh" type="button" onClick={props.onRefreshMemory}>Sync</button>
        </div>
        <div className="context-filter-row">
          {filters.map((filter) => (
            <button
              aria-pressed={props.contextFilter === filter.id}
              className={props.contextFilter === filter.id ? "active" : ""}
              data-action-id={`context.filter.${filter.id}`}
              key={filter.id}
              onClick={() => props.onFilterChange(filter.id)}
              type="button"
            >
              {filter.label} <span>{filter.count}</span>
            </button>
          ))}
        </div>
        <MemoryTable compact title="Memory / Context" items={props.contextItems} empty="No context indexed." onOpen={props.onOpenItem} onSync={props.onRefreshMemory} />
        {detailItem ? (
          <article className="context-detail" data-context-detail>
            <span>{props.contextItemDetail ? "Loaded" : "Opening"}</span>
            <strong>{detailItem.title}</strong>
            <p>{trimText(detailItem.summary || detailItem.sourcePath, 180)}</p>
            <small title={detailItem.sourcePath}>{displaySourceLabel(detailItem.sourcePath)}</small>
          </article>
        ) : null}
      </WorkbenchPanel>
      <KnowledgeReader
        filter={props.knowledgeFilter}
        itemDetail={props.knowledgeItemDetail}
        items={props.knowledgeItems}
        query={props.knowledgeQuery}
        selectedItem={props.selectedKnowledgeItem}
        onFilterChange={props.onKnowledgeFilterChange}
        onOpenItem={props.onOpenKnowledgeItem}
        onQueryChange={props.onKnowledgeQueryChange}
        onRefresh={props.onRefreshKnowledge}
      />
      <ReferenceTracePanel references={props.traceModel.references} />
      <WorkbenchPanel
        className="agent-task-panel"
        eyebrow="Trace"
        title="Agent Tasks"
        meta={props.session ? `${props.session.status} / ${props.events.length}` : String(props.traceModel.tasks.length)}
      >
        <div className="agent-task-list" data-agent-tasks="trace-tasks">
          {props.traceModel.tasks.length === 0 ? <span className="empty smart-empty-label" data-smart-empty-state="trace-start">Start</span> : null}
          {props.traceModel.tasks.map((task) => (
            <TraceTaskRow key={task.id} task={task} />
          ))}
        </div>
      </WorkbenchPanel>
      <AgentLogsPanel events={props.events} session={props.session} />
    </>
  );
}

function LegacyActivityTimeline(props: {
  activities: StudioTraceModel["activities"];
  activeProcesses: StudioTraceModel["activeProcesses"];
  onCopyPath?: (path: string) => void;
}) {
  const activities = props.activities.slice(-8);
  return (
    <WorkbenchPanel className="activity-timeline" eyebrow="Activity" title="Agent Activity" meta={String(activities.length)}>
      <div data-agent-activity="timeline">
        {activities.length === 0 ? <p className="empty">No activity yet.</p> : null}
        {activities.map((activity) => (
          <article className="activity-row" data-activity-kind={activity.kind} key={activity.id}>
            <span>{activityLabel(activity.kind, activity.status)}</span>
            <div>
              <strong>{activity.label}</strong>
              <small>{activity.summary}</small>
            </div>
            {activity.targetPath ? <button type="button" onClick={() => props.onCopyPath?.(activity.targetPath ?? "")}>Copy path</button> : <em>{activity.status}</em>}
          </article>
        ))}
      </div>
      <div className="running-terminals-strip" data-running-terminals="active-processes">
        {props.activeProcesses.map((process) => (
          <article key={process.id}>
            <strong>Running</strong>
            <span>{trimText(process.command, 96)}</span>
            <small>{process.outputPreview || "waiting for output"}</small>
          </article>
        ))}
      </div>
    </WorkbenchPanel>
  );
}

export function ReferenceTracePanel({ references }: { references: StudioReferenceTraceItem[] }) {
  const groups = WORKBENCH_COPY.referenceTraceGroups;

  return (
    <WorkbenchPanel
      className="reference-trace-panel"
      data-reference-trace="package-sources"
      eyebrow="References"
      title="Package Sources"
      meta={String(references.length)}
    >
      {references.length === 0 ? <p className="empty">No reference trace yet.</p> : null}
      {groups.map((group) => {
        const groupItems = references.filter((item) => item.kind === group.id);
        if (groupItems.length === 0) return null;
        return (
          <section className="reference-group" data-reference-kind={group.id} key={group.id}>
            <div className="drawer-section-head">
              <span>{group.label}</span>
              <small>{groupItems.length}</small>
            </div>
            <div className="reference-list">
              {groupItems.map((item) => (
                <article className="reference-row" key={item.id}>
                  <strong>{item.label}</strong>
                  <p>{trimText(item.summary || item.sourcePath || item.url || item.packageName || "", 140)}</p>
                  <small title={item.sourcePath ?? item.url ?? item.packageName ?? ""}>
                    {item.packageName ? `${item.packageName}${item.packageVersion ? `@${item.packageVersion}` : ""}` : item.sourcePath ?? item.url ?? `${item.eventIds.length} events`}
                  </small>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </WorkbenchPanel>
  );
}

function activityLabel(kind: StudioTraceModel["activities"][number]["kind"], status: string): string {
  if (kind === "reading_file") return "Reading";
  if (kind === "searching") return "Searching";
  if (kind === "running_command") return "Running";
  if (kind === "writing_file") return "Writing";
  if (kind === "thinking") return "Thinking";
  return status === "running" ? "Running" : "Activity";
}

export function AgentLogsPanel({ events, session }: { events: StudioEvent[]; session: SessionSummary | null }) {
  const visibleEvents = events.slice(-18);
  return (
    <WorkbenchPanel className="agent-logs-panel" eyebrow="Logs" title="Agent Logs" meta={session?.harness ?? "idle"}>
      <div className="agent-log-list" data-agent-logs="raw-events">
        {visibleEvents.length === 0 ? <span className="empty smart-empty-label" data-smart-empty-state="logs-start">Start</span> : null}
        {visibleEvents.map((event) => (
          <article className="agent-log-row" data-event-id={event.id} key={event.id}>
            <time dateTime={event.timestamp}>{formatTime(event.timestamp)}</time>
            <strong>{event.type}</strong>
            <span>{session?.harness ?? "--"}</span>
            <p>{trimText(formatLogPayload(event), 140)}</p>
          </article>
        ))}
      </div>
    </WorkbenchPanel>
  );
}

export function ProjectSidebar(props: {
  sessions: SessionSummary[];
  currentSessionId: string | null;
  currentWorkspace: string | null;
  recentWorkspaces: StudioRecentWorkspace[];
  collapsed: boolean;
  expandedProjectIds: string[];
  onToggleCollapsed: () => void;
  onToggleProject: (projectId: string) => void;
  onOpenSession: (session: SessionSummary) => void;
  onOpenWorkspace: (path?: string) => void | Promise<void>;
  onCreateWorkspace: () => void | Promise<void>;
  onOpenSettings: () => void;
  onNewChat: () => void;
  onOpenCommand: () => void;
  onOpenPlugins: () => void;
  onOpenChangelog: () => void;
  onOpenAutomations: () => void;
  onOpenFigma: () => void | Promise<void>;
}) {
  const navigationSessions = sidebarNavigationSessions(props.sessions, props.currentSessionId);
  const projects = groupSessionsByProject(navigationSessions);
  const activeWorkspaceProject = currentWorkspaceProject(props.currentWorkspace, navigationSessions);
  const expanded = new Set(props.expandedProjectIds);
  const hasNavigationContext = projects.length > 0 || Boolean(activeWorkspaceProject) || props.recentWorkspaces.length > 0;
  return (
    <aside
      className="project-sidebar"
      data-project-sidebar="codex-style"
      data-sidebar-collapsed={String(props.collapsed)}
      data-sidebar-readable-collapsed={String(props.collapsed)}
      aria-label="Projects"
    >
      <div className="project-sidebar-main">
        <div className="project-sidebar-top">
          <button
            data-action-id="sidebar.collapse"
            data-icon-tooltip={props.collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
            onClick={props.onToggleCollapsed}
            aria-label={props.collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={props.collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <SidebarIcon name={props.collapsed ? "panel-open" : "panel-close"} />
            <span>Collapse</span>
          </button>
        </div>
        {hasNavigationContext ? (
          <div className="project-sidebar-action-group" data-sidebar-section="page-actions">
            <div className="project-sidebar-section-title">
              <span>Actions</span>
            </div>
            <nav className="project-sidebar-actions" aria-label="Studio actions">
              <button data-action-id="workspace.new-folder.sidebar" data-workspace-action="new-folder" type="button" onClick={() => void props.onCreateWorkspace()} title="New folder">
                <SidebarIcon name="new-chat" />
                <span>New folder</span>
              </button>
              <button data-action-id="workspace.open-folder.sidebar" data-workspace-action="open-folder" type="button" onClick={() => void props.onOpenWorkspace()} title="Open folder">
                <SidebarIcon name="folder-open" />
                <span>Open folder</span>
              </button>
              <button data-action-id="sidebar.new-chat" type="button" onClick={props.onNewChat} title="New chat">
                <SidebarIcon name="new-chat" />
                <span>New chat</span>
              </button>
            </nav>
          </div>
        ) : null}
        <div className="project-sidebar-folders" data-sidebar-section="project-navigation" data-project-folder-list="true">
          <div className="project-sidebar-section-label">
            <span>Projects</span>
          </div>
          {activeWorkspaceProject ? (
            <section className="project-folder" data-current-workspace-project="true" data-project-folder={activeWorkspaceProject.id}>
              <button
                className="project-folder-row"
                data-action-id={`workspace.current.${activeWorkspaceProject.id}`}
                data-active="true"
                data-current-workspace-row="true"
                type="button"
                onClick={() => void props.onOpenWorkspace(activeWorkspaceProject.path)}
                title={activeWorkspaceProject.path}
              >
                <SidebarIcon name="folder-open" />
                <span>{activeWorkspaceProject.label}</span>
                <small>Current</small>
              </button>
            </section>
          ) : null}
          {projects.map((project) => {
            const isExpanded = expanded.has(project.id) || project.sessions.some((session) => session.id === props.currentSessionId);
            const navItems = project.sessions.map(projectSessionNavItem);
            const primaryNavItems = navItems.filter((item) => !item.isVerification);
            const verificationNavItems = navItems.filter((item) => item.isVerification);
            const visiblePrimaryItems = primaryNavItems.slice(0, 8);
            const visibleVerificationItems = visibleSessionNavItems(verificationNavItems, props.currentSessionId, 4);
            const currentSessionIsVerification = verificationNavItems.some((item) => item.session.id === props.currentSessionId);
            return (
              <section className="project-folder" key={project.id} data-project-folder={project.id}>
                <button
                  className="project-folder-row"
                  data-action-id={`project.toggle.${project.id}`}
                  data-project-folder-row="true"
                  data-active={String(project.sessions.some((session) => session.id === props.currentSessionId))}
                  type="button"
                  onClick={() => props.onToggleProject(project.id)}
                  title={project.path}
                >
                  <SidebarIcon name={isExpanded ? "folder-open" : "folder"} />
                  <span>{project.label}</span>
                  {primaryNavItems.length ? <small>{primaryNavItems.length}</small> : null}
                  <SidebarIcon name={isExpanded ? "chevron-down" : "chevron-right"} />
                </button>
                {isExpanded ? (
                  <div className="project-session-list">
                    {visiblePrimaryItems.map((item) => (
                      <button
                        className={item.session.id === props.currentSessionId ? "active" : ""}
                        data-action-id={`session.switch.${item.session.id}`}
                        data-project-session-row="true"
                        key={item.session.id}
                        type="button"
                        onClick={() => props.onOpenSession(item.session)}
                        title={item.titleDetail}
                      >
                        <i className="project-session-status" data-status={item.session.status} aria-hidden="true" />
                        <span className="project-session-copy">
                          <span>{item.title}</span>
                          <small>{item.meta}</small>
                        </span>
                      </button>
                    ))}
                    {verificationNavItems.length ? (
                      <details className="project-session-archive" open={currentSessionIsVerification}>
                        <summary title={`${verificationNavItems.length} verification check${verificationNavItems.length === 1 ? "" : "s"}`}>
                          <span>Checks</span>
                        </summary>
                        <div className="project-session-archive-list">
                          {visibleVerificationItems.map((item) => (
                            <button
                              className={item.session.id === props.currentSessionId ? "active" : ""}
                              data-action-id={`session.switch.${item.session.id}`}
                              data-project-session-row="verification"
                              key={item.session.id}
                              type="button"
                              onClick={() => props.onOpenSession(item.session)}
                              title={item.titleDetail}
                            >
                              <i className="project-session-status" data-status={item.session.status} aria-hidden="true" />
                              <span className="project-session-copy">
                                <span>{item.title}</span>
                                <small>{item.meta}</small>
                              </span>
                            </button>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
          {projects.length === 0 && !activeWorkspaceProject ? (
            <div className="project-sidebar-empty" data-project-sessions-empty="quiet">
              <span>No projects yet.</span>
              <small>Open a folder to start.</small>
              <button className="sidebar-empty-primary" data-action-id="workspace.open-folder.empty" type="button" onClick={() => void props.onOpenWorkspace()} title="Open folder">
                <SidebarIcon name="folder-open" />
                <span>Open folder</span>
              </button>
            </div>
          ) : null}
        </div>
        <div className="project-sidebar-folders" data-recent-workspaces="app-level" data-sidebar-section="recent-workspaces">
          <div className="project-sidebar-section-label">
            <span>Recent folders</span>
          </div>
          {props.recentWorkspaces.slice(0, 8).map((workspace) => (
            <button
              className="project-folder-row"
              data-action-id={`workspace.recent.${workspace.path}`}
              data-active={String(workspace.path === props.currentWorkspace)}
              key={workspace.path}
              title={workspace.path}
              type="button"
              onClick={() => void props.onOpenWorkspace(workspace.path)}
            >
              <SidebarIcon name="folder" />
              <span>{workspace.name}</span>
              <small>{workspace.source}</small>
            </button>
          ))}
          {props.recentWorkspaces.length === 0 ? <span className="empty">No recent folders.</span> : null}
        </div>
      </div>
      <div className="project-sidebar-footer" data-sidebar-settings="bottom-pinned">
        <button data-action-id="settings.open.sidebar" type="button" onClick={props.onOpenSettings} title="Settings">
          <SidebarIcon name="settings" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

interface ProjectSessionNavItem {
  session: SessionSummary;
  title: string;
  titleDetail: string;
  meta: string;
  isVerification: boolean;
}

function projectSessionNavItem(session: SessionSummary): ProjectSessionNavItem {
  const action = readableSessionAction(session.action);
  const isVerification = isVerificationRunText(`${session.prompt} ${session.conversationId ?? ""}`);
  const title = isVerification
    ? compactRunLabel(session.prompt.trim() || action, session.harness, 54)
    : trimText(session.prompt.trim() || "Untitled run", 54);
  const titleDetail = isVerification
    ? compactRunSummary(session.prompt, session.harness, 96) ?? title
    : session.prompt;
  return {
    session,
    title,
    titleDetail,
    meta: isVerification ? compactStatusLabel(session.status) : `${action} / ${session.status}`,
    isVerification,
  };
}

function visibleSessionNavItems(items: ProjectSessionNavItem[], currentSessionId: string | null, limit: number): ProjectSessionNavItem[] {
  const visible = items.slice(0, limit);
  if (!currentSessionId || visible.some((item) => item.session.id === currentSessionId)) return visible;
  const current = items.find((item) => item.session.id === currentSessionId);
  if (!current) return visible;
  return [current, ...items.filter((item) => item.session.id !== currentSessionId).slice(0, Math.max(0, limit - 1))];
}

function sessionHarnessLabel(harness: SessionSummary["harness"]): string {
  if (harness === "codex") return "Codex";
  if (harness === "claude-code") return "Claude";
  if (harness === "ollama") return "Ollama";
  if (harness === "opencode") return "OpenCode";
  return String(harness);
}

function readableSessionAction(action: SessionSummary["action"]): string {
  if (!action) return "run";
  return action.replace(/-/g, " ");
}

export function ChangedFilesPanel(props: {
  trace: StudioDesignSystemTrace | null;
  onReview: () => void;
  onSelectFile?: (file: StudioDesignSystemTraceFile) => void;
}) {
  const [showFiles, setShowFiles] = useState(false);
  const files = props.trace?.files ?? [];
  const totalInsertions = props.trace?.insertions ?? 0;
  const totalDeletions = props.trace?.deletions ?? 0;
  const previewFiles = files.slice(0, 6);
  const clean = files.length === 0 && !props.trace?.error;
  return (
    <section className="inline-changed-files" data-changed-files-panel="inline-review" data-smart-empty-state={clean ? "changes-clean" : undefined}>
      <div className="drawer-section-head">
        <span>{clean ? "Clean" : "Changed"}</span>
        <div className="change-metrics">
          <span>{files.length} files</span>
          <span>+{totalInsertions}</span>
          <span>-{totalDeletions}</span>
        </div>
        <button data-action-id="changed-files.review" type="button" onClick={props.onReview}>Review</button>
      </div>
      {files.length > 0 ? (
        <details className="changed-file-disclosure" open={showFiles} onToggle={(event) => setShowFiles(event.currentTarget.open)}>
          <summary aria-label="Show changed files" title="Show changed files">
            <StudioControlIcon name={showFiles ? "collapse" : "expand"} />
            <span>{previewFiles.length}</span>
          </summary>
          {showFiles ? (
            <div className="changed-file-list">
              {previewFiles.map((file) => (
                <details className="changed-file-row" data-file-kind={file.kind} key={file.path}>
                  <summary>
                    <span title={file.path}>{displaySourceLabel(file.path)}</span>
                    <small>+{file.insertions} -{file.deletions}</small>
                  </summary>
                  <p>{file.kind} / {file.status}{file.designSystem ? " / design-system" : ""}</p>
                  <div className="changed-file-actions">
                    {props.onSelectFile ? <button data-action-id={`changed-file.inspect.${file.path}`} type="button" onClick={() => props.onSelectFile?.(file)}>Inspect</button> : null}
                    <button data-action-id={`changed-file.copy.${file.path}`} type="button" onClick={() => void copyText(file.path)}>Copy path</button>
                  </div>
                </details>
              ))}
            </div>
          ) : null}
        </details>
      ) : null}
      {props.trace?.error ? <p className="error">{props.trace.error}</p> : null}
    </section>
  );
}

export function ActivityTimeline(props: {
  activities: StudioActivityItem[];
  activeProcesses: StudioActiveProcess[];
  agentThinkingState?: "thinking" | "running" | "idle" | "failed";
  onCopyPath?: (path: string) => void;
  onStart?: () => void;
}) {
  const recentActivities = props.activities.slice(-16);
  const shouldShowLiveThinking = props.agentThinkingState === "thinking" && props.activeProcesses.length === 0;
  const visibleActivities = shouldShowLiveThinking
    ? withLiveThinkingActivity(recentActivities)
    : recentActivities;
  if (visibleActivities.length === 0 && props.activeProcesses.length === 0) {
    return (
      <section className="activity-timeline" data-agent-activity="timeline" data-thinking-timeline data-smart-empty-state="activity-start" aria-label="Agent activity">
        <button className="smart-empty-action" data-action-id="activity.start" type="button" onClick={props.onStart}>
          <StudioControlIcon name="command" />
          <span>Start</span>
        </button>
      </section>
    );
  }
  const traceGroups = deriveToolTraceGroups(visibleActivities, props.activeProcesses);
  return (
    <section className="activity-timeline" data-agent-activity="timeline" data-thinking-timeline data-agent-thinking-state={props.agentThinkingState ?? "idle"} aria-label="Agent activity">
      <section className="tool-trace-summary" data-tool-trace-summary="intent-groups">
        {traceGroups.map((group) => (
          <span key={group.id}>{group.label} {group.count}</span>
        ))}
      </section>
      {props.activeProcesses.length > 0 ? (
        <details className="running-terminals-strip" data-running-terminals="active-processes" open>
          <summary>
            <span>{`Run ${props.activeProcesses.length}`}</span>
            <small>{trimText(props.activeProcesses[0]?.command ?? "terminal", 52)}</small>
          </summary>
          <div>
            {props.activeProcesses.map((process) => (
              <article className="activity-row running" data-tool-trace-card={process.id} data-activity-kind="terminal_group" key={process.id}>
                <span className="activity-glyph" aria-hidden="true">&gt;</span>
                <div>
                  <strong>Run</strong>
                  <code title={process.command}>{process.command}</code>
                  {process.outputPreview ? <small>{trimText(process.outputPreview, 96)}</small> : null}
                </div>
                <button data-action-id={`activity.copy-command.${process.id}`} type="button" onClick={() => void copyText(process.command)}>
                  Copy
                </button>
              </article>
            ))}
          </div>
        </details>
      ) : null}
      <div className="activity-list">
        {visibleActivities.map((activity) => (
          <article className={`activity-row ${activity.status}`} data-tool-trace-card={activity.id} data-activity-kind={activity.kind} key={activity.id}>
            <span className="activity-glyph" aria-hidden="true">{activityGlyph(activity.kind)}</span>
            <div>
              <strong>{activityTimelineLabel(activity)}</strong>
              <small title={activity.targetPath ?? activity.command ?? activity.summary}>{activityMeta(activity)}</small>
              {activity.outputPreview ? (
                <details className="activity-output">
                  <summary>{trimText(activity.outputPreview, 96)}</summary>
                  <pre>{activity.outputPreview}</pre>
                </details>
              ) : null}
            </div>
            {activity.targetPath ? (
              <button
                data-action-id={`activity.copy-path.${activity.id}`}
                type="button"
                onClick={() => {
                  if (!activity.targetPath) return;
                  if (props.onCopyPath) {
                    props.onCopyPath(activity.targetPath);
                    return;
                  }
                  void copyText(activity.targetPath);
                }}
              >
                Copy
              </button>
            ) : activity.command ? (
              <button data-action-id={`activity.copy-command.${activity.id}`} type="button" onClick={() => void copyText(activity.command ?? "")}>
                Copy
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function deriveToolTraceGroups(activities: StudioActivityItem[], activeProcesses: StudioActiveProcess[]): Array<{ id: string; label: string; count: number }> {
  const groups = new Map<string, { id: string; label: string; count: number }>();
  const add = (id: string, label: string) => {
    const current = groups.get(id) ?? { id, label, count: 0 };
    current.count += 1;
    groups.set(id, current);
  };
  for (const activity of activities) {
    if (activity.kind === "reading_file") add("read", "Read");
    else if (activity.kind === "searching") add("search", "Search");
    else if (activity.kind === "running_command") add("run", "Run");
    else if (activity.kind === "browser_action") add("browser", "Browser");
    else if (activity.kind === "figma_action") add("figma", "Figma");
    else add("other", "Other");
  }
  if (activeProcesses.length > 0) add("active", "Active");
  return Array.from(groups.values()).slice(0, 6);
}

function withLiveThinkingActivity(activities: StudioActivityItem[]): StudioActivityItem[] {
  const last = activities.at(-1);
  if (last?.kind === "thinking") {
    return activities.map((activity, index) =>
      index === activities.length - 1 ? { ...activity, status: "running", label: "Thinking" } : activity,
    );
  }
  return [
    ...activities.slice(-15),
    {
      id: "live-thinking",
      kind: "thinking",
      status: "running",
      label: "Thinking",
      summary: "Awaiting next step",
      sourceEventIds: [],
      startedAt: new Date().toISOString(),
    },
  ];
}

function activityTimelineLabel(activity: StudioActivityItem): string {
  if (activity.kind === "thinking") return "Thinking";
  if (activity.kind === "reading_file") return "Read";
  if (activity.kind === "searching" || activity.kind === "listing") return "Search";
  if (activity.kind === "running_command" || activity.kind === "terminal_group") return "Run";
  if (activity.kind === "writing_file") return "Write";
  if (activity.status === "completed" && activity.outputPreview) return "Result";
  if (activity.kind === "using_tool" || activity.kind === "browser_action" || activity.kind === "figma_action" || activity.kind === "mcp_call" || activity.kind === "computer_action") return "Tool";
  return activity.status === "completed" ? "Result" : "Tool";
}

export function KnowledgeReader(props: {
  filter: string;
  itemDetail: StudioKnowledgeItem | null;
  items: StudioKnowledgeItem[];
  query: string;
  selectedItem: StudioKnowledgeItem | null;
  onFilterChange: (filter: string) => void;
  onOpenItem: (item: StudioKnowledgeItem) => void;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
}) {
  const detail = props.itemDetail ?? props.selectedItem;
  const filters = [
    { id: "all", label: "All" },
    { id: "markdown", label: "Markdown" },
    { id: "yaml", label: "YAML" },
    { id: "spec", label: "Specs" },
    { id: "agent-capture", label: "Captured" },
  ];
  return (
    <WorkbenchPanel
      className="knowledge-reader-panel"
      data-knowledge-reader="design-reference-reader"
      eyebrow="Knowledge"
      title="References"
      meta={String(props.items.length)}
    >
      <div className="context-search-row">
        <input
          aria-label="Search knowledge"
          placeholder="Search"
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
        />
        <button data-action-id="knowledge.refresh" type="button" onClick={props.onRefresh}>Sync</button>
      </div>
      <div className="context-filter-row">
        {filters.map((filter) => (
          <button
            aria-pressed={props.filter === filter.id}
            className={props.filter === filter.id ? "active" : ""}
            data-action-id={`knowledge.filter.${filter.id}`}
            key={filter.id}
            onClick={() => props.onFilterChange(filter.id)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="knowledge-list" role="list">
        {props.items.length === 0 ? <p className="empty">No notes</p> : null}
        {props.items.map((item) => (
          <button
            className={detail?.id === item.id ? "knowledge-row active" : "knowledge-row"}
            data-action-id={`knowledge.open.${item.id}`}
            data-knowledge-item-id={item.id}
            key={item.id}
            title={item.sourcePath}
            type="button"
            onClick={() => props.onOpenItem(item)}
          >
            <span>{item.title}</span>
            <small>{knowledgeKindLabel(item.kind)} / {displaySourceLabel(item.sourcePath)}</small>
          </button>
        ))}
      </div>
      {detail ? (
        <article className="knowledge-detail" data-knowledge-item-id={detail.id}>
          <header>
            <span>{knowledgeKindLabel(detail.kind)}</span>
            <strong>{detail.title}</strong>
          </header>
          <p>{trimText(detail.summary || detail.excerpt, 220)}</p>
          <pre>{trimText(detail.content || detail.excerpt, 1800)}</pre>
        </article>
      ) : null}
    </WorkbenchPanel>
  );
}

export function TraceTaskRow({ task }: { task: StudioTraceTask }) {
  return (
    <article className={`agent-task-row ${task.status}`} data-source-event-id={task.evidenceIds.at(-1) ?? ""}>
      <div>
        <strong>{task.label}</strong>
        <span>{task.status}</span>
      </div>
      <progress value={task.progress} max={100} />
    </article>
  );
}

export function FigmaDriver(props: {
  figmaStatus: FigmaStatus | null;
  figmaActionResult: FigmaActionResult | null;
  figmaConnecting: boolean;
  figmaActionRunning: boolean;
  figmaError: string | null;
  settingsDraft: StudioConfig | null;
  settingsSavedAt: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpen: () => void;
  onAction: (input: FigmaAction | FigmaActionRequest) => void;
  onPatchSettings: (update: (current: StudioConfig) => StudioConfig) => void;
  onSaveSettings: () => void;
}) {
  const figmaActionRunning = props.figmaActionRunning;
  const isBridgeRunning = isFigmaBridgeRunning(props.figmaStatus);
  const isPluginConnected = isFigmaPluginConnected(props.figmaStatus);
  const pluginState = isPluginConnected ? "connected" : "disconnected";
  const bridgeState = props.figmaError
    ? "failed"
    : props.figmaActionRunning
      ? "action running"
      : props.figmaConnecting
        ? "scanning"
        : isBridgeRunning
          ? "running"
          : "stopped";
  const bridgeButtonLabel = props.figmaConnecting
    ? "Scanning"
    : isBridgeRunning
      ? `Running :${props.figmaStatus?.port ?? "--"}`
      : "Start";
  const bridgeButtonDisabled = props.figmaConnecting || props.figmaActionRunning || isBridgeRunning;
  const pluginCopy = props.figmaError ?? (isPluginConnected ? "connected" : isBridgeRunning ? "waiting" : "stopped");
  const lastSync = props.figmaActionResult?.completedAt ? formatTime(props.figmaActionResult.completedAt) : "--";
  return (
    <section
      className="panel figma-driver"
      data-figma-bridge-card="compact"
      data-figma-settings="active-driver"
      data-figma-state={bridgeState}
      data-plugin-state={pluginState}
      data-user-settings="studio-settings"
    >
      <div className="panel-head">
        <div className="figma-heading"><FigmaLogoMark /><div><p className="eyebrow">Figma</p><h2>{pluginCopy}</h2></div></div>
        <span>{props.figmaStatus?.clients.length ?? 0} clients</span>
      </div>
      <div className="driver-grid">
        <label>
          <span>Port</span>
          <input
            inputMode="numeric"
            value={props.settingsDraft?.figma?.preferredPort ?? ""}
            onChange={(event) => props.onPatchSettings((current) => ({
              ...current,
              figma: {
                autoStartBridge: current.figma?.autoStartBridge ?? false,
                preferredPort: event.target.value ? Number(event.target.value) : null,
                portRange: current.figma?.portRange ?? [9223, 9232],
                lastFileKey: current.figma?.lastFileKey ?? null,
                lastConnectedAt: current.figma?.lastConnectedAt ?? null,
              },
            }))}
          />
        </label>
        <div className="bridge-state-copy">
          <span>{props.figmaError ?? `${bridgeState} / ${pluginState}`}</span>
        </div>
      </div>
      <div className="inline-actions">
        <IconButton actionId="figma.connect" ariaLabel={bridgeButtonLabel} title={bridgeButtonLabel} icon="sync" onClick={props.onConnect} disabled={bridgeButtonDisabled} />
        <IconButton {...WORKBENCH_ACTIONS.stop} actionId="figma.disconnect" onClick={props.onDisconnect} disabled={!props.figmaStatus?.running || props.figmaActionRunning} />
        <IconButton {...WORKBENCH_ACTIONS.open} actionId="figma.open" onClick={props.onOpen} disabled={!isBridgeRunning || props.figmaActionRunning} />
        <IconButton {...WORKBENCH_ACTIONS.save} actionId="settings.save" className="primary" onClick={props.onSaveSettings} disabled={!props.settingsDraft} />
      </div>
      <div className="figma-status-grid">
        <span><strong>{props.figmaStatus?.port ?? "--"}</strong> port</span>
        <span><strong>{props.figmaStatus?.clients.length ?? 0}</strong> clients</span>
        <span><strong>{props.figmaStatus?.bridgeStatus ?? "stopped"}</strong> bridge</span>
        <span><strong>{lastSync}</strong> last sync</span>
      </div>
      <div className="figma-clients">
        {(props.figmaStatus?.clients ?? []).map((client) => (
          <article key={client.id}>
            <strong>{client.file || client.id}</strong>
            <span>{client.editor} · {client.lastPing ?? client.connectedAt}</span>
          </article>
        ))}
        {props.figmaStatus?.clients.length === 0 ? <p className="empty">No clients</p> : null}
      </div>
      <div className="figma-actions">
        {FIGMA_ACTIONS.map((action) => (
          <button
            className={action.primary ? "primary" : ""}
            data-action-id={`figma.action.${action.id}`}
            disabled={!isPluginConnected || figmaActionRunning}
            key={action.id}
            type="button"
            onClick={() => props.onAction(action.id)}
          >
            {action.label}
          </button>
        ))}
      </div>
      {props.figmaActionResult ? (
        <pre>{formatDataPreview(props.figmaActionResult).slice(0, 1800)}</pre>
      ) : null}
      <div className="settings-actions">
        <span>{props.settingsSavedAt ? `saved ${props.settingsSavedAt}` : "local settings"}</span>
      </div>
    </section>
  );
}

export function InputModeSwitcher(props: {
  value: StudioInputMode;
  onChange: (mode: StudioInputMode) => void;
}) {
  const modes: Array<{ id: StudioInputMode; label: string }> = [
    { id: "agent", label: "Agent" },
    { id: "terminal", label: "Terminal" },
    { id: "auto", label: "Auto" },
  ];
  return (
    <div className="input-mode-switcher" data-input-mode-switcher="agent-terminal-auto" aria-label="Input mode">
      {modes.map((mode) => (
        <button
          aria-pressed={props.value === mode.id}
          className={props.value === mode.id ? "active" : ""}
          data-action-id={`input-mode.${mode.id}`}
          key={mode.id}
          type="button"
          onClick={() => props.onChange(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

type CommandPaletteRowKind = "navigation" | "harness" | "session" | "knowledge" | "empty";
type CommandPaletteRow = {
  id: string;
  kind: CommandPaletteRowKind;
  icon: CommandPaletteIcon;
  label: string;
  detail: string;
  run: () => void;
  disabled?: boolean;
};

export function CommandPalette(props: {
  open: boolean;
  query: string;
  compatibility: StudioCompatibilitySnapshot | null;
  sessions: SessionSummary[];
  knowledgeItems: StudioKnowledgeItem[];
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenSettingsSection: (section: string) => void;
  onOpenDesignSystem: () => void;
  onOpenBoard: () => void;
  onOpenResearchLab: () => void;
  onOpenFigma: () => void;
  onOpenPlugins: () => void;
  onOpenAutomations: () => void;
  onOpenChangelog: () => void;
  onSelectHarness: (id: Harness["id"]) => void;
  onOpenSession: (session: SessionSummary) => void;
  onOpenKnowledgeItem: (item: StudioKnowledgeItem) => void;
}) {
  if (!props.open) return null;
  const query = props.query.toLowerCase();
  const harnessRows: CommandPaletteRow[] = (props.compatibility?.harnesses ?? [])
    .filter((harness) => isCoreHarness(harness.id))
    .filter((harness) => `${harness.label} ${harness.provider} ${harness.authStatus}`.toLowerCase().includes(query))
    .slice(0, 8)
    .map((harness) => ({
      id: `harness.select.${harness.id}`,
      kind: "harness",
      icon: harnessIcon(harness.id),
      label: harness.label,
      detail: `${harness.authStatus} · ${harness.requiredSetup[0] ?? "ready"}`,
      run: () => props.onSelectHarness(harness.id),
    }));
  const sessionRows: CommandPaletteRow[] = props.sessions
    .filter((session) => `${session.prompt} ${session.harness} ${session.status}`.toLowerCase().includes(query))
    .slice(0, 5)
    .map((session) => ({
      id: `session.open.${session.id}`,
      kind: "session",
      icon: "session",
      label: trimText(session.prompt, 64),
      detail: `${session.harness} · ${session.status}`,
      run: () => props.onOpenSession(session),
    }));
  const knowledgeRows: CommandPaletteRow[] = props.knowledgeItems
    .filter((item) => `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase().includes(query))
    .slice(0, 5)
    .map((item) => ({
      id: `knowledge.open.${item.id}`,
      kind: "knowledge",
      icon: "knowledge",
      label: item.title,
      detail: `${knowledgeKindLabel(item.kind)} · ${displaySourceLabel(item.sourcePath)}`,
      run: () => props.onOpenKnowledgeItem(item),
    }));
  const navigationRows: CommandPaletteRow[] = [
    { id: "settings.open", kind: "navigation" as const, icon: "settings" as const, label: "Settings", detail: "Open Studio settings", run: props.onOpenSettings },
    { id: "command.open.design-system", kind: "navigation" as const, icon: "system" as const, label: "Design System", detail: "Open editable artifact review and design memory", run: props.onOpenDesignSystem },
    { id: "command.open.figjam-board", kind: "navigation" as const, icon: "board" as const, label: "FigJam Board", detail: "Open PM board, source export, and sync status", run: props.onOpenBoard },
    { id: "command.open.research-lab", kind: "navigation" as const, icon: "research" as const, label: "Research Lab", detail: "Open research patterns and scenario simulation", run: props.onOpenResearchLab },
    { id: "command.open.figma", kind: "navigation" as const, icon: "figma" as const, label: "Figma Bridge", detail: "Open bridge status and plugin actions", run: props.onOpenFigma },
    { id: "command.open.plugins", kind: "navigation" as const, icon: "plugins" as const, label: "Plugins", detail: "Open memi Notes marketplace", run: props.onOpenPlugins },
    { id: "command.open.automations", kind: "navigation" as const, icon: "automations" as const, label: "Automations", detail: "Open scheduled Studio work", run: props.onOpenAutomations },
    { id: "command.open.changelog", kind: "navigation" as const, icon: "changelog" as const, label: "Changelog", detail: "Open local design memory entries", run: props.onOpenChangelog },
    { id: "command.open.advanced", kind: "navigation" as const, icon: "advanced" as const, label: "Advanced Tools", detail: "Open tools, browser, and runtime diagnostics", run: () => props.onOpenSettingsSection("Advanced") },
  ].filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query));
  const commandPaletteRows: CommandPaletteRow[] = [...navigationRows, ...harnessRows, ...sessionRows, ...knowledgeRows];
  const rows = commandPaletteRows.length > 0 ? commandPaletteRows : [{
    id: "command-palette.empty",
    kind: "empty" as const,
    icon: "search" as const,
    label: "No matching actions",
    detail: "Try searching settings, harnesses, sessions, notes, or files.",
    run: () => undefined,
    disabled: true,
  }];
  return (
    <div className="modal-backdrop command-palette-backdrop" data-command-palette="warp-style" role="dialog" aria-modal="true" aria-label="Command palette">
      <section className="command-palette-panel">
        <header>
          <label className="command-palette-search" data-command-palette-search="actions">
            <span className="command-palette-icon" data-command-palette-icon="search"><CommandPaletteIconGlyph name="search" /></span>
            <input autoFocus value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder="Search actions, sessions, notes, files..." />
          </label>
          <button className="command-palette-close" data-action-id="command-palette.close" type="button" onClick={props.onClose}>
            <span className="command-palette-icon" data-command-palette-icon="close"><CommandPaletteIconGlyph name="close" /></span>
            <span>Close</span>
          </button>
        </header>
        <div className="command-palette-list" data-command-nav="studio-surfaces">
          {rows.map((row) => (
            <button
              data-action-id={row.id}
              data-command-palette-empty={row.kind === "empty" ? "true" : undefined}
              data-command-palette-row={row.kind}
              disabled={row.disabled}
              key={row.id}
              type="button"
              onClick={row.run}
            >
              <span className="command-palette-icon" data-command-palette-icon={row.icon}><CommandPaletteIconGlyph name={row.icon} /></span>
              <span>
                <strong>{row.label}</strong>
                <small>{row.detail}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AutomationCenter(props: {
  open: boolean;
  automations: StudioAutomationDefinition[];
  templates: StudioAutomationTemplate[];
  runsByAutomation: Record<string, StudioAutomationRun[]>;
  scheduler: StudioAutomationSchedulerStatus | null;
  projectRoot: string;
  busyId: string | null;
  onClose: () => void;
  onRefresh: () => void | Promise<void>;
  onCreate: (input: Partial<StudioAutomationDefinition> & { templateId?: string }) => void | Promise<void>;
  onUpdate: (id: string, patch: Partial<StudioAutomationDefinition>) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onRunNow: (id: string) => void | Promise<void>;
  onLoadRuns: (id: string) => void | Promise<void>;
  onInstallScheduler: () => void | Promise<void>;
  onUninstallScheduler: () => void | Promise<void>;
}) {
  const orderedTemplates = sortAutomationTemplates(props.templates);
  const [selectedId, setSelectedId] = useState(props.automations[0]?.id ?? "");
  const selectedAutomation = props.automations.find((automation) => automation.id === selectedId) ?? props.automations[0] ?? null;
  const selectedRuns = selectedAutomation ? props.runsByAutomation[selectedAutomation.id] ?? [] : [];
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<StudioAutomationDefinition> & { templateId?: string }>(() =>
    automationDraftFromTemplate(orderedTemplates[0], props.projectRoot),
  );

  if (!props.open) return null;

  function openCreate(template?: StudioAutomationTemplate) {
    setDraft(automationDraftFromTemplate(template ?? orderedTemplates[0], props.projectRoot));
    setEditingId(null);
    setModalMode("create");
  }

  function openEdit(automation: StudioAutomationDefinition) {
    setDraft({
      ...automation,
      codex: { ...normalizeCodexUiConfig(automation.codex) },
    });
    setEditingId(automation.id);
    setModalMode("edit");
  }

  function patchDraft(update: Partial<StudioAutomationDefinition> & { templateId?: string }) {
    setDraft((current) => ({ ...current, ...update }));
  }

  function patchDraftCodex(update: Partial<StudioCodexConfig>) {
    setDraft((current) => ({
      ...current,
      codex: {
        ...normalizeCodexUiConfig(current.codex),
        ...update,
      },
    }));
  }

  async function submitAutomation(event: FormEvent) {
    event.preventDefault();
    if (modalMode === "edit" && editingId) {
      await props.onUpdate(editingId, draft);
    } else {
      await props.onCreate(draft);
    }
    setModalMode(null);
    setEditingId(null);
  }

  const schedulerInstalled = Boolean(props.scheduler?.installed);
  const isSchedulerBusy = props.busyId === "scheduler";

  return (
    <div className="modal-backdrop automations-backdrop" data-automations-center="studio" role="dialog" aria-modal="true" aria-label="Studio automations">
      <section className="automations-panel">
        <header className="automations-header">
          <div>
            <span>Studio Automations</span>
            <h2>Codex design harness scheduler</h2>
          </div>
          <div className="inline-actions">
            <button data-action-id="automations.refresh" type="button" onClick={() => void props.onRefresh()}>Refresh</button>
            <button data-action-id="automations.close" type="button" onClick={props.onClose}>Close</button>
          </div>
        </header>

        <section className="automation-scheduler-strip" data-automation-scheduler-status={schedulerInstalled ? "installed" : "missing"}>
          <div>
            <strong>{schedulerInstalled ? "Scheduler installed" : "Scheduler not installed"}</strong>
            <span>{props.scheduler?.message ?? "Runtime scheduler unavailable"}</span>
            <small>{props.scheduler?.plistPath ?? "LaunchAgent status will appear after runtime connects"}</small>
          </div>
          <div className="inline-actions">
            <button data-action-id="automations.scheduler.install" type="button" onClick={() => void props.onInstallScheduler()} disabled={isSchedulerBusy}>
              Install
            </button>
            <button data-action-id="automations.scheduler.uninstall" type="button" onClick={() => void props.onUninstallScheduler()} disabled={isSchedulerBusy || !schedulerInstalled}>
              Uninstall
            </button>
          </div>
        </section>

        <section className="automation-template-row" data-automation-template-picker="design-harness">
          {orderedTemplates.map((template) => (
            <button
              data-action-id={`automations.template.${template.id}`}
              data-template-id={template.id}
              key={template.id}
              type="button"
              onClick={() => openCreate(template)}
            >
              <strong>{template.name}</strong>
              <span>{template.description}</span>
            </button>
          ))}
        </section>

        <div className="automations-grid">
          <aside className="automation-list" data-automation-list="workspace-store">
            <div className="drawer-section-head">
              <span>Automations</span>
              <button data-action-id="automations.create" type="button" onClick={() => openCreate()}>Create</button>
            </div>
            {props.automations.map((automation) => {
              const runs = props.runsByAutomation[automation.id] ?? [];
              const lastRun = runs[0];
              const busy = props.busyId === automation.id;
              return (
                <article className="automation-row" data-automation-status={automation.status.toLowerCase()} key={automation.id}>
                  <button
                    className={automation.id === selectedAutomation?.id ? "active" : ""}
                    data-action-id={`automations.select.${automation.id}`}
                    type="button"
                    onClick={() => setSelectedId(automation.id)}
                  >
                    <strong>{automation.name}</strong>
                    <span>{automation.harness} / {automation.action} / {automation.mutationPolicy}</span>
                    <small>Next {formatAutomationDate(automation.nextRunAt)}</small>
                  </button>
                  <div className="automation-row-actions">
                    <button data-action-id={`automations.pause.${automation.id}`} type="button" onClick={() => void props.onUpdate(automation.id, { status: automation.status === "ACTIVE" ? "PAUSED" : "ACTIVE" })} disabled={busy}>
                      {automation.status === "ACTIVE" ? "Pause" : "Resume"}
                    </button>
                    <button data-action-id={`automations.run.${automation.id}`} type="button" onClick={() => void props.onRunNow(automation.id)} disabled={busy}>
                      Run now
                    </button>
                    <button data-action-id={`automations.edit.${automation.id}`} type="button" onClick={() => openEdit(automation)} disabled={busy}>
                      Edit
                    </button>
                    <button data-action-id={`automations.history.${automation.id}`} type="button" onClick={() => void props.onLoadRuns(automation.id)}>
                      History
                    </button>
                    <button data-action-id={`automations.delete.${automation.id}`} type="button" onClick={() => void props.onDelete(automation.id)} disabled={busy}>
                      Delete
                    </button>
                  </div>
                  <small className="automation-last-status">Last {lastRun?.status ?? formatAutomationDate(automation.lastRunAt)}</small>
                </article>
              );
            })}
            {props.automations.length === 0 ? <p className="empty">No automations yet.</p> : null}
          </aside>

          <section className="automation-detail" data-automation-detail="codex-run-history">
            {selectedAutomation ? (
              <>
                <div className="automation-detail-head">
                  <div>
                    <span>{selectedAutomation.status}</span>
                    <h3>{selectedAutomation.name}</h3>
                  </div>
                  <div className="automation-metrics">
                    <span>{selectedAutomation.harness}</span>
                    <span>{selectedAutomation.codex?.model ?? "gpt-5.5"}</span>
                    <span>{selectedAutomation.codex?.reasoningEffort ?? "xhigh"}</span>
                  </div>
                </div>
                <div className="automation-detail-grid">
                  <article><span>Schedule</span><strong>{rruleSummary(selectedAutomation.rrule)}</strong></article>
                  <article><span>Next run</span><strong>{formatAutomationDate(selectedAutomation.nextRunAt)}</strong></article>
                  <article><span>Permissions</span><strong>{selectedAutomation.permissionMode}</strong></article>
                  <article><span>Writes</span><strong>{selectedAutomation.mutationPolicy}</strong></article>
                </div>
                <pre className="automation-prompt-preview">{selectedAutomation.prompt}</pre>
                <div className="drawer-section-head">
                  <span>Run history</span>
                  <button data-action-id={`automations.detail.history.${selectedAutomation.id}`} type="button" onClick={() => void props.onLoadRuns(selectedAutomation.id)}>
                    Refresh history
                  </button>
                </div>
                <div className="automation-run-list">
                  {selectedRuns.map((run) => (
                    <article className="automation-run-row" data-run-status={run.status} key={run.id}>
                      <strong>{run.status}</strong>
                      <span>{formatAutomationDate(run.startedAt)} to {formatAutomationDate(run.completedAt)}</span>
                      <small>{run.sessionId ?? run.error ?? "No session"}</small>
                    </article>
                  ))}
                  {selectedRuns.length === 0 ? <p className="empty">No run history loaded.</p> : null}
                </div>
              </>
            ) : (
              <div className="automation-empty-state">
                <strong>Codex is ready for scheduled design work.</strong>
                <span>Create a template automation to run audits, Figma pulls, app-build reviews, or research refreshes from the Studio runtime.</span>
              </div>
            )}
          </section>
        </div>
      </section>

      {modalMode ? (
        <section className="automation-modal" data-automation-editor={modalMode}>
          <form onSubmit={(event) => void submitAutomation(event)}>
            <header>
              <strong>{modalMode === "edit" ? "Edit automation" : "Create automation"}</strong>
              <button data-action-id="automations.editor.close" type="button" onClick={() => setModalMode(null)}>Close</button>
            </header>
            <div className="settings-field-grid">
              <label>
                <span>Template</span>
                <select
                  value={draft.templateId ?? orderedTemplates[0]?.id ?? ""}
                  onChange={(event) => {
                    const template = orderedTemplates.find((candidate) => candidate.id === event.target.value);
                    setDraft(automationDraftFromTemplate(template, props.projectRoot));
                  }}
                >
                  {orderedTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </label>
              <label>
                <span>Name</span>
                <input value={draft.name ?? ""} onChange={(event) => patchDraft({ name: event.target.value })} />
              </label>
              <label>
                <span>Schedule</span>
                <input value={draft.rrule ?? ""} onChange={(event) => patchDraft({ rrule: event.target.value })} />
              </label>
              <label>
                <span>Status</span>
                <select value={draft.status ?? "ACTIVE"} onChange={(event) => patchDraft({ status: event.target.value as StudioAutomationDefinition["status"] })}>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                </select>
              </label>
              <label>
                <span>Mutation policy</span>
                <select value={draft.mutationPolicy ?? "review"} onChange={(event) => patchDraft({ mutationPolicy: event.target.value as StudioAutomationMutationPolicy })}>
                  <option value="review">Review only</option>
                  <option value="read_only">Read only</option>
                  <option value="allow_writes">Allow writes</option>
                </select>
              </label>
              <label>
                <span>Permission mode</span>
                <select value={draft.permissionMode ?? "plan"} onChange={(event) => patchDraft({ permissionMode: event.target.value as StudioPermissionMode })}>
                  <option value="plan">Plan</option>
                  <option value="guarded">Guarded</option>
                  <option value="full_access">Full access</option>
                </select>
              </label>
              <label>
                <span>Codex model</span>
                <select value={draft.codex?.model ?? "gpt-5.5"} onChange={(event) => patchDraftCodex({ model: event.target.value })}>
                  {CODEX_MODEL_OPTIONS.map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
              </label>
              <label>
                <span>Reasoning</span>
                <select value={draft.codex?.reasoningEffort ?? "xhigh"} onChange={(event) => patchDraftCodex({ reasoningEffort: event.target.value as StudioCodexReasoningEffort })}>
                  {CODEX_REASONING_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
            </div>
            <label className="automation-prompt-field">
              <span>Prompt</span>
              <textarea value={draft.prompt ?? ""} onChange={(event) => patchDraft({ prompt: event.target.value })} />
            </label>
            <div className="inline-actions">
              <button data-action-id="automations.editor.save" type="submit" disabled={props.busyId === "create" || props.busyId === editingId || !draft.prompt?.trim() || !draft.name?.trim()}>
                Save
              </button>
              <button data-action-id="automations.editor.cancel" type="button" onClick={() => setModalMode(null)}>Cancel</button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function sortAutomationTemplates(templates: StudioAutomationTemplate[]): StudioAutomationTemplate[] {
  return [...templates].sort((left, right) => {
    const leftIndex = AUTOMATION_TEMPLATE_ORDER.indexOf(left.id);
    const rightIndex = AUTOMATION_TEMPLATE_ORDER.indexOf(right.id);
    return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
  });
}

function automationDraftFromTemplate(template: StudioAutomationTemplate | undefined, projectRoot: string): Partial<StudioAutomationDefinition> & { templateId?: string } {
  return {
    templateId: template?.id ?? "design-system-audit",
    kind: template?.kind ?? "cron",
    name: template?.name ?? "Design System Audit",
    prompt: template?.prompt ?? "Run a memi design-system audit for this workspace.",
    status: "ACTIVE",
    rrule: template?.rrule ?? "FREQ=DAILY;BYHOUR=9;BYMINUTE=0;BYSECOND=0",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
    harness: template?.harness ?? "codex",
    action: template?.action ?? "audit",
    chatMode: template?.chatMode ?? "review",
    permissionMode: template?.permissionMode ?? "plan",
    mutationPolicy: template?.mutationPolicy ?? "review",
    codex: normalizeCodexUiConfig(undefined),
    cwd: projectRoot,
  };
}

function rruleSummary(rrule: string): string {
  const parts = Object.fromEntries(rrule.split(";").map((part) => part.split("=")).filter((part) => part.length === 2));
  if (parts.FREQ === "MINUTELY") return `Every ${parts.INTERVAL ?? "1"} minutes`;
  if (parts.FREQ === "WEEKLY") return `Weekly ${parts.BYDAY ?? ""} ${parts.BYHOUR ?? "9"}:${parts.BYMINUTE ?? "00"}`.trim();
  if (parts.FREQ === "DAILY") return `Daily ${parts.BYHOUR ?? "9"}:${String(parts.BYMINUTE ?? "0").padStart(2, "0")}`;
  return rrule;
}

function formatMaybeDate(value: string | null | undefined): string {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Re-export shared utilities/types so the workbench-components public surface is unchanged.
export {
  ARTIFACT_EVENT_TYPES,
  OUTPUT_TABS,
  artifactCardsFromPacket,
  copyText,
  deriveSessionStatus,
  expectedDmgPath,
  figmaStatusLabel,
  filterContextItems,
  filterKnowledgeItems,
  filterTerminalBlocksByQuery,
  formatTime,
  groupSessionsByProject,
  isFigmaBridgeRunning,
  researchSourcesFromEvents,
  trimText,
} from "./workbench/shared";
export type {
  FormattedNode,
  OutputTabId,
  ResearchSource,
  TerminalBlock,
  TerminalBlockKind,
  WorkPacketStarter,
} from "./workbench/shared";

// Re-export icon atoms so the workbench-components public surface is unchanged.
export { ActionChip, FigmaLogoMark, IconButton, MemoireLogoMark, StudioControlIcon } from "./workbench/icons";
export type { StudioControlIconName } from "./workbench/icons";

// Re-export terminal block renderers/builders so the public surface is unchanged.
export {
  BlockBody,
  CommandTraceBlock,
  FileReferenceChip,
  FormattedMessage,
  StructuredResultSections,
  TokenUsageStrip,
  ToolPairBlock,
  TuiInlineBlock,
  buildTerminalBlocks,
  formattedNodes,
} from "./workbench/terminal";

// Re-export the settings panel so the public surface is unchanged.
export { SettingsPanel } from "./workbench/settings";

// Re-export design-system surfaces so the public surface is unchanged.
export { DesignChangelogPage, DesignSystemReviewSurface, SourceReferenceChips } from "./workbench/design-system";
