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
import { FileReferenceChip } from "./workbench/terminal";

const FIGMA_ACTIONS: Array<{ id: FigmaAction; label: string; primary?: boolean }> = [
  { id: "fullSync", label: "Full sync", primary: true },
  { id: "inspectSelection", label: "Inspect" },
  { id: "pullTokens", label: "Pull tokens" },
  { id: "pullComponents", label: "Pull components" },
  { id: "pullStickies", label: "Pull stickies" },
  { id: "captureScreenshot", label: "Screenshot" },
];

const DEFAULT_CODEX_UI_CONFIG: StudioCodexConfig = {
  model: "gpt-5.5",
  reasoningEffort: "xhigh",
  approvalPolicy: "never",
  webSearch: true,
  skipGitRepoCheck: true,
  includeMemoireCommands: true,
  includeCodexCommands: true,
  planModeDefault: false,
};
const CODEX_MODEL_OPTIONS = ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.3-codex"] as const;
const CODEX_REASONING_OPTIONS: Array<{ id: StudioCodexReasoningEffort; label: string }> = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "xhigh", label: "Extra High" },
];
const CODEX_APPROVAL_OPTIONS: Array<{ id: StudioCodexApprovalPolicy; label: string }> = [
  { id: "never", label: "Never" },
  { id: "on-request", label: "On request" },
  { id: "untrusted", label: "Untrusted only" },
];
const AUTOMATION_TEMPLATE_ORDER = [
  "design-system-audit",
  "figma-token-component-pull",
  "codex-app-build-review",
  "research-reference-refresh",
];
type AgenticOpenSourceReferences = NonNullable<NonNullable<DesignSystemArtifact["agentic"]>["openSourceReferences"]>;
type AgenticInteractionPatterns = NonNullable<NonNullable<DesignSystemArtifact["agentic"]>["interactionPatterns"]>;

function isCoreHarness(id: Harness["id"]): boolean {
  return isPrimaryHarness(id);
}

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

export function DesignSystemReviewSurface(props: {
  artifact: DesignSystemArtifact | null;
  figmaStatus?: FigmaStatus | null;
  onReviewSection: (
    artifactId: string,
    sectionId: string,
    reviewState: DesignSystemArtifactReviewState,
    comment?: string,
  ) => void | Promise<void>;
  onFixSection: (
    artifactId: string,
    sectionId: string,
    comment?: string,
  ) => void | Promise<void>;
  onSaveArtifact: (artifact: DesignSystemArtifact) => void | Promise<void>;
  onUseSystem: (artifact: DesignSystemArtifact) => void;
}) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [pendingReviewKey, setPendingReviewKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<DesignSystemArtifact | null>(props.artifact);
  const [savingArtifact, setSavingArtifact] = useState(false);
  const artifact = props.artifact;
  const visibleArtifact = draft ?? artifact;
  const draftDirty = Boolean(artifact && draft && JSON.stringify(draft) !== JSON.stringify(artifact));

  useEffect(() => {
    setDraft(artifact);
    if (!artifact) {
      setOpenSections(new Set());
      return;
    }
    const needsWork = artifact.sections.filter((section) => section.reviewState === "needs_work").map((section) => section.id);
    const firstUnreviewed = artifact.sections.find((section) => section.reviewState === "unreviewed")?.id;
    setOpenSections(new Set([...needsWork, ...(firstUnreviewed ? [firstUnreviewed] : [])]));
  }, [artifact?.id, artifact?.updatedAt]);

  function toggle(sectionId: string) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  function patchDraft(update: (current: DesignSystemArtifact) => DesignSystemArtifact) {
    setDraft((current) => current ? update(current) : current);
  }

  function patchDraftSection(sectionId: string, update: (section: DesignSystemArtifactSection) => DesignSystemArtifactSection) {
    patchDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === sectionId ? update(section) : section),
    }));
  }

  async function saveDraft() {
    if (!draft || !draftDirty) return;
    setSavingArtifact(true);
    try {
      await props.onSaveArtifact(draft);
    } finally {
      setSavingArtifact(false);
    }
  }

  async function handleReview(section: DesignSystemArtifactSection, reviewState: DesignSystemArtifactReviewState) {
    if (!visibleArtifact) return;
    const key = `${section.id}:${reviewState}`;
    const comment = reviewState === "needs_work"
      ? `${section.title} needs a scoped agent fix.`
      : `${section.title} verified in Studio.`;
    const nextDraft = {
      ...visibleArtifact,
      sections: visibleArtifact.sections.map((candidate) =>
        candidate.id === section.id ? { ...candidate, reviewState } : candidate,
      ),
    };
    setPendingReviewKey(key);
    setDraft(nextDraft);
    try {
      if (draftDirty) await props.onSaveArtifact(nextDraft);
      if (reviewState === "needs_work") {
        await props.onFixSection(visibleArtifact.id, section.id, comment);
      } else {
        await props.onReviewSection(visibleArtifact.id, section.id, reviewState, comment);
      }
      setOpenSections((current) => new Set([...current, section.id]));
    } finally {
      setPendingReviewKey(null);
    }
  }

  if (!visibleArtifact) {
    return (
      <section className="design-system-review empty-review" data-design-system-artifact="review-surface" aria-label="Design system artifact">
        <header className="artifact-review-head">
          <div>
            <p className="eyebrow">Design system</p>
            <h2>Memory</h2>
          </div>
          <span>idle</span>
        </header>
      </section>
    );
  }

  return (
    <section className="design-system-review" data-design-system-artifact="review-surface" data-artifact-acceptance-state={visibleArtifact.status} data-artifact-dirty={String(draftDirty)} aria-label={visibleArtifact.title}>
      <header className="artifact-review-head">
        <div>
          <p className="eyebrow">Review</p>
          <label className="artifact-title-editor">
            <span>Title</span>
            <input
              value={visibleArtifact.title}
              onChange={(event) => patchDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <p>{visibleArtifact.createdByHarness} / {visibleArtifact.sourceWorkspace ? displaySourceLabel(visibleArtifact.sourceWorkspace) : "local"}</p>
        </div>
        <div className="artifact-review-actions">
          <label>
            <span>Status</span>
            <select
              value={visibleArtifact.status}
              onChange={(event) => patchDraft((current) => ({ ...current, status: event.target.value as DesignSystemArtifact["status"] }))}
            >
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="published">Published</option>
            </select>
          </label>
          <button data-action-id="artifact.save" type="button" onClick={() => void saveDraft()} disabled={!draftDirty || savingArtifact}>
            {savingArtifact ? "Saving" : draftDirty ? "Save" : "Saved"}
          </button>
          <button data-action-id="artifact.use-system" type="button" onClick={() => props.onUseSystem(visibleArtifact)}>Use</button>
        </div>
      </header>

      <DesignSystemSandbox artifact={visibleArtifact} figmaStatus={props.figmaStatus ?? null} />
      <AgenticDesignSystemContract artifact={visibleArtifact} />
      <SourceReferenceChips refs={visibleArtifact.sourceRefs.slice(0, 8)} />
      <ArtifactResolvedEvidence artifact={visibleArtifact} />

      <div className="artifact-review-list">
        {visibleArtifact.sections.map((section) => {
          const open = openSections.has(section.id);
          return (
            <article className="review-section" data-review-section={section.kind} data-review-state={section.reviewState} key={section.id}>
              <button className="review-section-trigger" data-action-id={`artifact.section.${section.kind}`} type="button" onClick={() => toggle(section.id)}>
                <span>{open ? "v" : ">"}</span>
                <strong>{section.title}</strong>
                <small>{section.summary}</small>
                <em>{reviewStateLabel(section.reviewState)}</em>
              </button>
              {open ? (
                <div className="review-section-body">
                  <div className="review-toolbar">
                    <label>
                      <span>State</span>
                      <select
                        value={section.reviewState}
                        onChange={(event) => patchDraftSection(section.id, (current) => ({ ...current, reviewState: event.target.value as DesignSystemArtifactReviewState }))}
                      >
                        <option value="unreviewed">Unreviewed</option>
                        <option value="looks_good">Looks good</option>
                        <option value="needs_work">Needs work</option>
                      </select>
                    </label>
                    <button
                      aria-pressed={section.reviewState === "looks_good"}
                      disabled={pendingReviewKey === `${section.id}:looks_good`}
                      data-action-id={`artifact.review.${section.kind}.looks_good`}
                      data-review-action="looks_good"
                      type="button"
                      onClick={() => void handleReview(section, "looks_good")}
                    >
                      OK
                    </button>
                    <button
                      aria-pressed={section.reviewState === "needs_work"}
                      disabled={pendingReviewKey === `${section.id}:needs_work`}
                      data-action-id={`artifact.review.${section.kind}.needs_work`}
                      data-review-action="needs_work"
                      type="button"
                      onClick={() => void handleReview(section, "needs_work")}
                    >
                      Fix
                    </button>
                  </div>
                  <label className="artifact-section-editor">
                    <span>Summary</span>
                    <input
                      value={section.summary}
                      onChange={(event) => patchDraftSection(section.id, (current) => ({ ...current, summary: event.target.value }))}
                    />
                  </label>
                  <label className="artifact-section-editor">
                    <span>Content</span>
                    <textarea
                      value={section.content}
                      onChange={(event) => patchDraftSection(section.id, (current) => ({ ...current, content: event.target.value }))}
                    />
                  </label>
                  <ArtifactPreview artifact={visibleArtifact} section={section} />
                  <SourceReferenceChips refs={section.sourceRefs} />
                  <label className="artifact-section-editor">
                    <span>Comments</span>
                    <textarea
                      value={section.comments.join("\n")}
                      onChange={(event) => patchDraftSection(section.id, (current) => ({ ...current, comments: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) }))}
                      placeholder="Add review comments..."
                    />
                  </label>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ArtifactResolvedEvidence({ artifact }: { artifact: DesignSystemArtifact }) {
  const assets = artifact.assets ?? [];
  const tokens = displayableDesignTokens(artifact);
  if (assets.length === 0 && tokens.length === 0) return null;
  return (
    <div className="artifact-resolved-evidence" data-artifact-assets="resolved" data-token-evidence="resolved">
      {assets.length ? (
        <section>
          <strong>Resolved assets</strong>
          {assets.slice(0, 6).map((asset) => (
            <span key={asset.id}>{asset.label}</span>
          ))}
        </section>
      ) : null}
      {tokens.length ? (
        <section>
          <strong>Token evidence</strong>
          {tokens.slice(0, 8).map((token) => (
            <span key={token.id}>{token.name}: {token.value}</span>
          ))}
        </section>
      ) : null}
    </div>
  );
}

type DesignSystemResolvedTokenItem = NonNullable<DesignSystemArtifact["tokens"]>[number];
const TYPOGRAPHY_TOKEN_KINDS = new Set<DesignSystemResolvedTokenItem["kind"]>(["typography"]);
const COLOR_TOKEN_KINDS = new Set<DesignSystemResolvedTokenItem["kind"]>(["color"]);
const SPACE_TOKEN_KINDS = new Set<DesignSystemResolvedTokenItem["kind"]>(["spacing", "radius", "shadow"]);

function displayableDesignTokens(
  artifact: DesignSystemArtifact,
  kinds?: ReadonlySet<DesignSystemResolvedTokenItem["kind"]>,
): DesignSystemResolvedTokenItem[] {
  return (artifact.tokens ?? []).filter((token) => {
    if (kinds && !kinds.has(token.kind)) return false;
    return isDisplayableDesignToken(token);
  });
}

function isDisplayableDesignToken(token: DesignSystemResolvedTokenItem): boolean {
  const name = token.name.trim();
  const value = token.value.trim();
  if (!name || !value) return false;
  const raw = `${name} ${value}`;
  if (/[{}]/.test(raw)) return false;
  if (/"[^"]+"\s*:/.test(raw)) return false;
  if (/"(?:id|kind|title|summary|content|label|value|section)"\s*:/i.test(raw)) return false;
  if (/\b(?:sectionId|sourceRefs|preview|state)\b/i.test(raw)) return false;
  if (name.length > 72 || value.length > 96) return false;
  return true;
}

export function SourceReferenceChips({ refs }: { refs: DesignSystemArtifact["sourceRefs"] }) {
  if (refs.length === 0) return null;
  return (
    <div className="source-reference-chips" data-source-reference-chips>
      {refs.map((ref) => (
        <FileReferenceChip
          key={ref.id}
          label={ref.label}
          path={`${ref.sourcePath ?? ref.url ?? ref.label}${ref.line ? `:${ref.line}` : ""}`}
        />
      ))}
    </div>
  );
}

function DesignSystemSandbox({ artifact, figmaStatus }: { artifact: DesignSystemArtifact; figmaStatus: FigmaStatus | null }) {
  const bridge = isFigmaPluginConnected(figmaStatus) ? "plugin connected" : isFigmaBridgeRunning(figmaStatus) ? "bridge running" : "bridge stopped";
  return (
    <section className="design-system-sandbox" data-design-system-sandbox="local-container">
      <article className="metric-chip"><strong>Refs</strong><span>{artifact.sections.length} / {artifact.sourceRefs.length}</span></article>
      <article className="metric-chip"><strong>Agent</strong><span>{artifact.createdByHarness}</span></article>
      <article className="metric-chip"><strong>Figma</strong><span>{bridge}{figmaStatus?.port ? ` / :${figmaStatus.port}` : ""}</span></article>
      <article className="metric-chip"><strong>Handoff</strong><span>tokens / components</span></article>
    </section>
  );
}

function AgenticDesignSystemContract({ artifact }: { artifact: DesignSystemArtifact }) {
  const contract = artifact.agentic;
  if (!contract) return null;
  const roles = contract.roles;
  const references: AgenticOpenSourceReferences = contract.openSourceReferences ?? [];
  const patterns: AgenticInteractionPatterns = contract.interactionPatterns ?? [];
  if (roles.length === 0) return null;
  return (
    <section className="agentic-design-system" data-agentic-design-system="role-contract-collapsed">
      <header className="agentic-contract-summary">
        <strong>Agentic contract</strong>
        <span>{contract.source.name} / {formatAgenticContractAccess(contract.source.access)}</span>
      </header>
      <div className="agentic-role-strip">
        {roles.map((role) => (
          <article className="agentic-role-card" data-agentic-role-card={role.id} key={role.id}>
            <strong>{role.label}</strong>
            <span>{formatAgenticContractTerm(role.atomicLevel)}</span>
            <small>{role.requiredSignals.slice(0, 2).map(formatAgenticContractTerm).join(" / ")}</small>
          </article>
        ))}
      </div>
      {contract.outputSections.length ? (
        <div className="agentic-output-contract">
          <span>{contract.outputSections.map(formatAgenticContractTerm).join(" / ")}</span>
        </div>
      ) : null}
      {references.length || patterns.length ? (
        <details className="agentic-pattern-disclosure">
          <summary>Sources</summary>
          <div className="agentic-pattern-source-list" data-agentic-pattern-source="artifact-contract">
            {references.slice(0, 6).map((reference) => (
              <article className="agentic-pattern-source-card" data-agentic-pattern-source={reference.name} key={reference.name}>
                <strong>{reference.name}</strong>
                <span>{reference.license} / {formatAgenticContractTerm(reference.category)}</span>
                <small>{reference.mappedRoles.map(formatAgenticContractTerm).join(" / ")}</small>
              </article>
            ))}
          </div>
          <div className="agentic-interaction-pattern-list">
            {patterns.slice(0, 5).map((pattern) => (
              <article className="agentic-role-card" data-agentic-pattern={pattern.id} key={pattern.id}>
                <strong>{pattern.label}</strong>
                <span>{pattern.source}</span>
                <small>{pattern.requiredSignals.map(formatAgenticContractTerm).join(" / ")}</small>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function formatAgenticContractAccess(value: string): string {
  if (value === "public-preview") return "Preview reference";
  return formatAgenticContractTerm(value);
}

function formatAgenticContractTerm(value: string): string {
  const normalized = value.trim().replace(/[_/-]+/g, " ").replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function ArtifactPreview({ artifact, section }: { artifact: DesignSystemArtifact; section: DesignSystemArtifactSection }) {
  if (section.preview.kind === "brand") return <BrandPreview artifact={artifact} section={section} />;
  if (section.preview.kind === "typography") return <TypographyPreview artifact={artifact} section={section} />;
  if (section.preview.kind === "tokens") return <TokenPreview artifact={artifact} section={section} />;
  if (section.preview.kind === "spacing") return <SpacingPreview artifact={artifact} section={section} />;
  if (section.preview.kind === "components") return <ComponentPreview artifact={artifact} section={section} />;
  return (
    <div className={`artifact-preview preview-${section.preview.kind}`} data-artifact-preview={section.preview.kind}>
      {section.preview.items.map((item, index) => (
        <article key={`${section.id}-preview-${index}`}>
          <strong>{item.label}</strong>
          <span>{item.value}</span>
          {item.detail ? <small>{item.detail}</small> : null}
        </article>
      ))}
    </div>
  );
}

function BrandPreview({ artifact, section }: { artifact: DesignSystemArtifact; section: DesignSystemArtifactSection }) {
  const assets = (artifact.assets ?? []).filter((asset) => asset.kind === "brand" || asset.kind === "logo").slice(0, 6);
  if (assets.length) {
    return (
      <div className="artifact-preview visual-reference brand-reference" data-artifact-preview="brand-lockups">
        {assets.map((asset) => (
          <article key={asset.id}>
            {asset.previewUrl ? <img className="brand-asset-img" alt={asset.label} src={asset.previewUrl} /> : <span className="brand-mark" aria-hidden="true">{asset.label.slice(0, 1)}</span>}
            <strong>{asset.label}</strong>
            <small>{displaySourceLabel(asset.sourcePath)}</small>
          </article>
        ))}
      </div>
    );
  }
  if (!section.preview.items.length) return null;
  return (
    <div className="artifact-preview visual-reference brand-reference" data-artifact-preview="brand-lockups">
      {section.preview.items.map((item, index) => (
        <article key={`${section.id}-brand-${index}`}>
          <span className="brand-mark" aria-hidden="true">{item.label.slice(0, 1)}</span>
          <strong>{item.label}</strong>
          {item.value ? <small>{item.value}</small> : null}
        </article>
      ))}
    </div>
  );
}

function TypographyPreview({ artifact, section }: { artifact: DesignSystemArtifact; section: DesignSystemArtifactSection }) {
  const typeTokens = displayableDesignTokens(artifact, TYPOGRAPHY_TOKEN_KINDS).slice(0, 4);
  const rows = typeTokens.length
    ? typeTokens.map((token) => ({ label: `${token.name} / ${token.line ?? "src"}`, value: token.value }))
    : section.preview.items.map((item) => ({ label: item.label, value: item.value || item.detail || "" })).filter((item) => item.value.trim().length > 0);
  if (!rows.length) return null;
  return (
    <div className="typography-reference visual-reference" data-artifact-preview="type-ramp">
      {rows.map((row, index) => (
        <p className={`type-sample type-sample-${index}`} key={`${row.label}-${index}`}><span>{row.label}</span>{row.value}</p>
      ))}
    </div>
  );
}

function TokenPreview({ artifact, section }: { artifact: DesignSystemArtifact; section: DesignSystemArtifactSection }) {
  const resolved = displayableDesignTokens(artifact, COLOR_TOKEN_KINDS).slice(0, 12);
  if (resolved.length) {
    return (
      <div className="token-reference visual-reference" data-artifact-preview="token-swatches">
        {resolved.map((token) => <article key={token.id}><span style={{ background: token.value }} /><strong>{token.name}</strong><small>{token.value}</small></article>)}
      </div>
    );
  }
  return <PreviewItemList section={section} />;
}

function SpacingPreview({ artifact, section }: { artifact: DesignSystemArtifact; section: DesignSystemArtifactSection }) {
  const resolved = displayableDesignTokens(artifact, SPACE_TOKEN_KINDS).slice(0, 6);
  if (resolved.length) {
    return (
      <div className="spacing-reference visual-reference" data-artifact-preview="spacing-scale">
        {resolved.map((token) => <article key={token.id}><span /><strong>{token.name}</strong><small>{token.value}</small></article>)}
      </div>
    );
  }
  return <PreviewItemList section={section} />;
}

function ComponentPreview({ artifact, section }: { artifact: DesignSystemArtifact; section: DesignSystemArtifactSection }) {
  const componentTokens = displayableDesignTokens(artifact).filter((token) => token.kind !== "color").slice(0, 6);
  const tokenRefs = componentTokens.map((token) => token.name).join(" / ");
  const sourceRefs = section.sourceRefs.slice(0, 3).map((ref) => ref.label).join(" / ");
  return (
    <div className="component-reference visual-reference" data-artifact-preview="component-playground">
      <div className="component-lab" data-component-lab="playground-sandbox">
        <div className="component-stage">
          {section.preview.items.map((item, index) => (
            <article key={`${section.id}-component-${index}`}>
              <strong>{item.label}</strong>
              {item.value ? <span>{item.value}</span> : null}
              {item.detail ? <small>{item.detail}</small> : null}
            </article>
          ))}
        </div>
        <aside className="component-inspector" data-component-inspector="props-tokens-source">
          {tokenRefs || sourceRefs ? <strong>Evidence</strong> : null}
          {tokenRefs || sourceRefs ? <span>{tokenRefs || sourceRefs}</span> : null}
          <strong>Agent output</strong><span>{section.summary}</span>
        </aside>
      </div>
    </div>
  );
}

function PreviewItemList({ section }: { section: DesignSystemArtifactSection }) {
  if (!section.preview.items.length) return null;
  return (
    <div className={`artifact-preview preview-${section.preview.kind}`} data-artifact-preview={section.preview.kind}>
      {section.preview.items.map((item, index) => (
        <article key={`${section.id}-preview-item-${index}`}>
          <strong>{item.label}</strong>
          {item.value ? <span>{item.value}</span> : null}
          {item.detail ? <small>{item.detail}</small> : null}
        </article>
      ))}
    </div>
  );
}

function reviewStateLabel(state: DesignSystemArtifactReviewState): string {
  if (state === "looks_good") return "looks good";
  if (state === "needs_work") return "needs work";
  return "needs review";
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

type DesignChangelogFilter = "all" | "agent" | "manual" | "needs-evidence" | "archived";

export function DesignChangelogPage(props: {
  entries: DesignChangelogEntry[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
  onCreate: (entry: DesignChangelogCreateInput) => void | Promise<void>;
  onUpdate: (id: string, patch: DesignChangelogPatchInput) => void | Promise<void>;
  onArchive: (id: string) => void | Promise<void>;
  onRestore: (id: string) => void | Promise<void>;
  onExport: () => void | Promise<void>;
}) {
  const [filter, setFilter] = useState<DesignChangelogFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => changelogDraft());
  const filteredEntries = props.entries.filter((entry) => matchesDesignChangelogFilter(entry, filter));
  const selectedEntry = editingId ? props.entries.find((entry) => entry.id === editingId) ?? null : null;

  function openNewEntry() {
    setEditingId(null);
    setDraft(changelogDraft());
  }

  function openEntry(entry: DesignChangelogEntry) {
    setEditingId(entry.id);
    setDraft(changelogDraft(entry));
  }

  function saveEntry() {
    const tags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    const payload = {
      title: draft.title,
      summary: draft.summary,
      bodyMarkdown: draft.bodyMarkdown,
      tags,
      authoredBy: "human" as const,
      sessionId: selectedEntry?.sessionId ?? null,
      harness: selectedEntry?.harness ?? null,
      action: selectedEntry?.action ?? null,
      eventIds: selectedEntry?.eventIds ?? [],
      fileRefs: selectedEntry?.fileRefs ?? [],
      captureWarnings: selectedEntry?.captureWarnings ?? [],
    };
    if (selectedEntry) void props.onUpdate(selectedEntry.id, payload);
    else void props.onCreate(payload);
  }

  return (
    <section className="design-changelog-page" data-design-changelog-page="design-memory" aria-label="Design changelog">
      <header className="design-changelog-header">
        <div>
          <p className="eyebrow">Changelog / Design memory</p>
          <h2>Design decisions and system changes</h2>
          <span>{props.entries.length} local entries in .memoire/project-memory/changelog</span>
        </div>
        <div className="design-changelog-actions">
          <button data-action-id="design-changelog.refresh" type="button" onClick={() => void props.onRefresh()} disabled={props.loading}>
            {props.loading ? "Refreshing" : "Refresh"}
          </button>
          <button data-action-id="design-changelog.new" type="button" onClick={openNewEntry}>New entry</button>
          <button data-action-id="design-changelog.export" type="button" onClick={() => void props.onExport()}>Export</button>
        </div>
      </header>

      <div className="design-changelog-filters" role="tablist" aria-label="Changelog filters">
        <button aria-selected={filter === "all"} className={filter === "all" ? "active" : ""} data-design-changelog-filter="all" data-action-id="design-changelog.filter.all" type="button" onClick={() => setFilter("all")}>All</button>
        <button aria-selected={filter === "agent"} className={filter === "agent" ? "active" : ""} data-design-changelog-filter="agent" data-action-id="design-changelog.filter.agent" type="button" onClick={() => setFilter("agent")}>Agent captured</button>
        <button aria-selected={filter === "manual"} className={filter === "manual" ? "active" : ""} data-design-changelog-filter="manual" data-action-id="design-changelog.filter.manual" type="button" onClick={() => setFilter("manual")}>Manual</button>
        <button aria-selected={filter === "needs-evidence"} className={filter === "needs-evidence" ? "active" : ""} data-design-changelog-filter="needs-evidence" data-action-id="design-changelog.filter.needs-evidence" type="button" onClick={() => setFilter("needs-evidence")}>Needs evidence</button>
        <button aria-selected={filter === "archived"} className={filter === "archived" ? "active" : ""} data-design-changelog-filter="archived" data-action-id="design-changelog.filter.archived" type="button" onClick={() => setFilter("archived")}>Archived</button>
      </div>

      {props.error ? <p className="design-changelog-warning">{props.error}</p> : null}

      <div className="design-changelog-layout">
        <div className="design-changelog-list" data-design-changelog-list="timeline">
          {filteredEntries.map((entry) => (
            <article className="design-changelog-card" data-design-changelog-entry={entry.id} data-status={entry.status} key={entry.id}>
              <button data-action-id={`design-changelog.edit.${entry.id}`} type="button" onClick={() => openEntry(entry)}>
                <span>{entry.authoredBy === "human" ? "Manual" : "Agent captured"}</span>
                <strong>{entry.title}</strong>
                <small>{entry.harness ?? "studio"} / {entry.action ?? "design"} / {formatTime(entry.updatedAt)}</small>
                <p>{entry.summary}</p>
                <span>{entry.tags.slice(0, 4).join(" / ") || "untagged"}</span>
                <span>{entry.fileRefs.length} files / {entry.eventIds.length} events</span>
              </button>
              {entry.captureWarnings.length > 0 ? (
                <p className="design-changelog-warning">{entry.captureWarnings[0]}</p>
              ) : null}
            </article>
          ))}
          {filteredEntries.length === 0 ? <p className="empty">No changelog entries for this filter.</p> : null}
        </div>

        <aside className="design-changelog-editor" data-design-changelog-editor="local-project-memory" aria-label="Changelog editor">
          <div className="drawer-section-head">
            <span>{selectedEntry ? "Edit entry" : "New entry"}</span>
            <small>{selectedEntry?.status ?? "active"}</small>
          </div>
          <label>
            <span>Title</span>
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            <span>Summary</span>
            <input value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
          </label>
          <label>
            <span>Tags</span>
            <input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="tokens, figma, studio" />
          </label>
          <label>
            <span>Markdown body</span>
            <textarea value={draft.bodyMarkdown} onChange={(event) => setDraft((current) => ({ ...current, bodyMarkdown: event.target.value }))} />
          </label>
          {selectedEntry ? (
            <div className="design-changelog-file-refs" data-design-changelog-file-refs="linked-evidence">
              <strong>Evidence</strong>
              <span>{selectedEntry.sessionId ?? "manual entry"}</span>
              {selectedEntry.fileRefs.slice(0, 6).map((file) => (
                <small key={file.path}>{file.path} / {file.kind} / +{file.insertions} -{file.deletions}</small>
              ))}
              {selectedEntry.captureWarnings.map((warning) => (
                <p className="design-changelog-warning" key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
          <div className="design-changelog-editor-actions">
            <button data-action-id="design-changelog.save" type="button" onClick={saveEntry} disabled={!draft.title.trim() || !draft.summary.trim()}>Save</button>
            {selectedEntry?.status === "archived" ? (
              <button data-action-id={`design-changelog.restore.${selectedEntry.id}`} type="button" onClick={() => void props.onRestore(selectedEntry.id)}>Restore</button>
            ) : null}
            {selectedEntry && selectedEntry.status !== "archived" ? (
              <button data-action-id={`design-changelog.archive.${selectedEntry.id}`} type="button" onClick={() => void props.onArchive(selectedEntry.id)}>Archive</button>
            ) : null}
            <button data-action-id="design-changelog.cancel" type="button" onClick={openNewEntry}>Clear</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function changelogDraft(entry?: DesignChangelogEntry) {
  return {
    title: entry?.title ?? "",
    summary: entry?.summary ?? "",
    bodyMarkdown: entry?.bodyMarkdown ?? "## Decision\n\n\n## Evidence\n\n",
    tags: entry?.tags.join(", ") ?? "",
  };
}

function matchesDesignChangelogFilter(entry: DesignChangelogEntry, filter: DesignChangelogFilter): boolean {
  if (filter === "archived") return entry.status === "archived";
  if (entry.status === "archived") return false;
  if (filter === "agent") return entry.authoredBy !== "human";
  if (filter === "manual") return entry.authoredBy === "human";
  if (filter === "needs-evidence") return entry.captureWarnings.length > 0 || entry.fileRefs.length === 0;
  return true;
}

type CommandPaletteRowKind = "navigation" | "harness" | "session" | "knowledge" | "empty";
type CommandPaletteIcon = "settings" | "system" | "board" | "figma" | "research" | "plugins" | "automations" | "changelog" | "advanced" | "claude" | "codex" | "hermes" | "session" | "knowledge" | "search" | "close";
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

function harnessIcon(id: Harness["id"]): CommandPaletteIcon {
  if (id === "claude-code") return "claude";
  if (id === "hermes") return "hermes";
  return "codex";
}

function CommandPaletteIconGlyph({ name }: { name: CommandPaletteIcon }) {
  if (name === "settings") return <StudioLineIcon><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.3 3a8 8 0 0 0-1.7 1L5.1 6l-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .3 0 .7.1 1l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1l.3 3h5l.3-3a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" /></StudioLineIcon>;
  if (name === "system") return <StudioLineIcon><path d="M5 6h14M5 12h14M5 18h14" /><circle cx="8" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="16" cy="18" r="1.5" /></StudioLineIcon>;
  if (name === "board") return <StudioLineIcon><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h3M13 9h3M8 14h8" /></StudioLineIcon>;
  if (name === "research") return <StudioLineIcon><path d="M5 6h14M7 10h10M9 14h6" /><circle cx="8" cy="18" r="2" /><circle cx="16" cy="18" r="2" /><path d="M10 18h4" /></StudioLineIcon>;
  if (name === "figma") return <StudioLineIcon><circle cx="9" cy="6" r="3" /><circle cx="15" cy="6" r="3" /><circle cx="9" cy="12" r="3" /><circle cx="15" cy="12" r="3" /><circle cx="9" cy="18" r="3" /></StudioLineIcon>;
  if (name === "plugins") return <StudioLineIcon><path d="M8 4h8v5h4v8h-5v3H7v-5H4V7h4V4Z" /></StudioLineIcon>;
  if (name === "automations") return <StudioLineIcon><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></StudioLineIcon>;
  if (name === "changelog") return <StudioLineIcon><path d="M7 4h10v16H7V4Z" /><path d="M10 8h4M10 12h4M10 16h3" /></StudioLineIcon>;
  if (name === "advanced") return <StudioLineIcon><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></StudioLineIcon>;
  if (name === "claude") return <StudioLineIcon><path d="M12 4 5 20M12 4l7 16M8 13h8" /></StudioLineIcon>;
  if (name === "codex") return <StudioLineIcon><rect x="5" y="5" width="14" height="14" rx="3" /><path d="M9 9h6v6H9z" /></StudioLineIcon>;
  if (name === "hermes") return <StudioLineIcon><path d="M5 18 12 4l7 14M8 13h8" /><path d="M9 20h6" /></StudioLineIcon>;
  if (name === "session") return <StudioLineIcon><path d="M5 6h14v12H5z" /><path d="M8 10h8M8 14h5" /></StudioLineIcon>;
  if (name === "knowledge") return <StudioLineIcon><path d="M6 5h9l3 3v11H6V5Z" /><path d="M9 12h6M9 16h4" /></StudioLineIcon>;
  if (name === "close") return <StudioLineIcon><path d="m7 7 10 10M17 7 7 17" /></StudioLineIcon>;
  return <StudioLineIcon><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></StudioLineIcon>;
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

function formatAutomationDate(value: string | null | undefined): string {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${formatTime(value)}`;
}

function formatMaybeDate(value: string | null | undefined): string {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function SettingsPanel(props: {
  open: boolean;
  activeSection: string;
  status: StudioStatus | null;
  config: StudioConfig | null;
  compatibility: StudioCompatibilitySnapshot | null;
  computerStatus: StudioComputerStatus | null;
  figmaStatus: FigmaStatus | null;
  figmaConnecting: boolean;
  harnesses: Harness[];
  marketplaceNotes: MarketplaceNotesPayload | null;
  marketplaceBusyId: string | null;
  marketplaceError: string | null;
  marketplaceDownloadJobs: Record<string, StudioDownloadJob>;
  selectedMarketplaceNoteId: string | null;
  noteForks: NoteForkSummary[];
  selectedNoteForkId: string | null;
  noteForkFiles: NoteForkFile[];
  selectedNoteForkFile: string | null;
  noteForkValidation: NoteForkValidation | null;
  noteForkDiff: NoteForkDiff | null;
  noteForkPrHandoff: NoteForkPrHandoff | null;
  studioTools: StudioToolDefinition[];
  browserStatus: StudioBrowserStatus | null;
  onClose: () => void;
  onSectionChange: (section: string) => void;
  onRefresh: () => void | Promise<void>;
  onRefreshMarketplace: () => void | Promise<void>;
  onInstallMarketplaceNote: (noteId: string) => void | Promise<void>;
  onRemoveMarketplaceNote: (name: string) => void | Promise<void>;
  onForkMarketplaceNote: (noteId: string) => void | Promise<void>;
  onMarketplaceSelectionChange: (noteId: string) => void;
  onSelectNoteFork: (name: string) => void | Promise<void>;
  onSelectNoteForkFile: (path: string) => void;
  onUpdateNoteForkFile: (path: string, content: string) => void | Promise<void>;
  onValidateNoteFork: () => void | Promise<void>;
  onExportNoteForkPr: () => void | Promise<void>;
  onOpenAutomationsCenter: () => void;
  onPatchConfig: (update: (current: StudioConfig) => StudioConfig) => void;
  onSave: () => void;
  onInstallAgentKit: (target: AgentInstallTargetInput) => void | Promise<void>;
  onComputerCapture: () => void;
  onConnectFigma: () => void | Promise<void>;
  onOpenFigma: () => void | Promise<void>;
  onOpenMacOSPermission: (permission: string) => void | Promise<void>;
  onSelectHarness: (id: Harness["id"]) => void;
  onDiagnoseHarness: (id: Harness["id"]) => void | Promise<void>;
  onSelectWorkspace: () => void | Promise<void>;
  onCompleteSetup: () => void | Promise<void>;
}) {
  const sections: Array<{ id: string; label: string; icon: StudioControlIconName; tag: string }> = [
    { id: "Setup", label: "Setup", icon: "check", tag: "Start" },
    { id: "General", label: "General", icon: "settings", tag: "App" },
    { id: "Codex", label: "Codex", icon: "command", tag: "AI" },
    { id: "Agents", label: "Agents", icon: "harness", tag: "Run" },
    { id: "Providers", label: "Providers", icon: "receipt", tag: "API" },
    { id: "Permissions", label: "Permissions", icon: "access", tag: "Risk" },
    { id: "Figma", label: "Figma", icon: "figma", tag: "Bridge" },
    { id: "Plugins", label: "Plugins", icon: "system", tag: "Notes" },
    { id: "Automations", label: "Automations", icon: "automation", tag: "Cron" },
    { id: "Download", label: "Download", icon: "download", tag: "DMG" },
    { id: "Advanced", label: "Advanced", icon: "filter", tag: "Tools" },
  ];
  const downloadItems = buildDownloadReadyItems({ status: props.status, config: props.config });
  const rawHarnessRows = props.compatibility?.harnesses ?? props.harnesses.map((harness) => ({
    id: harness.id,
    label: harness.label,
    setupStatus: harness.installed ? "ready" : "needs_action",
    setupAction: harness.installed ? "Ready" : `Install ${harness.command}`,
    setupCommand: harness.installed ? null : `Install ${harness.command}`,
    authStatus: harness.authStatus ?? (harness.installed ? "ready" : "missing"),
    authMessage: harness.authMessage ?? (harness.installed ? "Ready" : `Run ${harness.command} login`),
    installed: harness.installed,
    enabled: harness.enabled,
    setupPlan: {
      harnessId: harness.id,
      label: harness.label,
      status: harness.installed ? "ready" as const : "needs_action" as const,
      summary: harness.installed ? "Ready" : `Install ${harness.command}`,
      generatedAt: new Date(0).toISOString(),
      installed: harness.installed,
      enabled: harness.enabled,
      authStatus: harness.authStatus ?? (harness.installed ? "ready" as const : "missing" as const),
      authMessage: harness.authMessage ?? (harness.installed ? "Ready" : "Command not found"),
      resolvedPath: harness.resolvedPath ?? null,
      docsUrl: null,
      actions: harness.installed ? [] : [{
        id: `${harness.id}-install`,
        label: `Install ${harness.command}`,
        kind: "copy_command" as const,
        required: true,
        description: `Install ${harness.command}`,
        command: `Install ${harness.command}`,
      }],
      requiredActionIds: harness.installed ? [] : [`${harness.id}-install`],
    },
  }));
  const harnessRows = rawHarnessRows.map((harness) => ({
    ...harness,
    setupPlan: harness.setupPlan ?? fallbackHarnessSetupPlan(harness),
  }));
  const coreHarnessRows = harnessRows.filter((harness) => harnessVisibility(harness) === "primary");
  const advancedHarnessRows = harnessRows.filter((harness) => harnessVisibility(harness) === "advanced");
  const codexHarness = coreHarnessRows.find((harness) => harness.id === "codex");
  const codexConfig = normalizeCodexUiConfig(props.config?.codex);
  const providers = props.config?.providers ?? {};
  const permissions = props.computerStatus?.permissions ?? props.config?.computer?.permissions ?? {
    accessibility: "unknown",
    screenRecording: "unknown",
    automation: "unknown",
    fileAccess: "unknown",
  };
  const macOSPermissionActions = normalizeMacOSPermissionActions(props.compatibility?.tools.computer.actions, permissions);
  const requiredMacOSPermissionCount = macOSPermissionActions.filter((action) => action.required).length;
  const [marketplaceQuery, setMarketplaceQuery] = useState("");
  const [marketplaceCategoryFilter, setMarketplaceCategoryFilter] = useState("all");
  const [marketplaceSourceFilter, setMarketplaceSourceFilter] = useState("all");

  if (!props.open) return null;

  function patchCodexConfig(update: Partial<StudioCodexConfig>) {
    props.onPatchConfig((current) => ({
      ...current,
      codex: {
        ...normalizeCodexUiConfig(current.codex),
        ...update,
      },
    }));
  }

  function patchUsageBudget(
    scope: "providers" | "harnesses",
    id: string,
    update: { dailyTokenLimit?: number | null; dailyCostLimitUsd?: number | null; warningThreshold?: number | null },
  ) {
    props.onPatchConfig((current) => {
      const usageBudgets = normalizeUsageBudgetConfig(current.usageBudgets);
      const currentBudget = (usageBudgets[scope] as Record<string, unknown>)[id] as Record<string, unknown> | undefined;
      return {
        ...current,
        usageBudgets: {
          ...usageBudgets,
          [scope]: {
            ...usageBudgets[scope],
            [id]: {
              ...(currentBudget ?? {}),
              ...update,
            },
          },
        },
      };
    });
  }

  function patchUsageWarningThreshold(value: number | null) {
    props.onPatchConfig((current) => ({
      ...current,
      usageBudgets: {
        ...normalizeUsageBudgetConfig(current.usageBudgets),
        warningThreshold: value ?? 0.8,
      },
    }));
  }

  function runMacOSPermissionAction(action: StudioCompatibilityToolAction) {
    if (action.kind === "refresh") {
      void props.onRefresh();
      return;
    }
    if (action.permission) {
      void props.onOpenMacOSPermission(action.permission);
      return;
    }
    if (action.url) {
      window.open(action.url, "_blank", "noopener,noreferrer");
    }
  }

  function renderGeneral() {
    return (
      <div className="settings-general-surface" data-settings-section-content="general">
        <div className="settings-section-grid">
          <SettingsMetricCard icon="check" label="Setup" value={props.config?.setup?.completedAt ? "Complete" : "Pending"} tone={props.config?.setup?.completedAt ? "ok" : "warn"} />
          <SettingsMetricCard icon="mode" label="Input" value={props.config?.ui?.inputMode ?? "agent"} />
          <SettingsMetricCard icon="harness" label="Agents" value={`${coreHarnessRows.filter((harness) => harness.enabled).length}/${coreHarnessRows.length}`} />
          <SettingsMetricCard icon="access" label="Computer" value={props.computerStatus?.available ? "Ready" : "Limited"} tone={props.computerStatus?.available ? "ok" : "warn"} />
        </div>
        <div className="settings-field-grid">
          <label>
            <span>Default harness</span>
            <select value={isCoreHarness(props.config?.defaultHarness ?? "codex") ? props.config?.defaultHarness ?? "codex" : "codex"} onChange={(event) => props.onPatchConfig((current) => ({ ...current, defaultHarness: event.target.value as Harness["id"] }))}>
              {props.harnesses.filter((harness) => harnessVisibility(harness) === "primary").map((harness) => <option key={harness.id} value={harness.id}>{harness.label}</option>)}
            </select>
          </label>
          <label>
            <span>Theme</span>
            <select value={props.config?.ui?.theme ?? "dark"} onChange={(event) => props.onPatchConfig((current) => ({
              ...current,
              ui: {
                theme: event.target.value as "light" | "dark" | "system",
                inputMode: current.ui?.inputMode ?? "agent",
                commandPaletteEnabled: current.ui?.commandPaletteEnabled ?? true,
                toolbeltLayout: current.ui?.toolbeltLayout ?? "compact",
              },
            }))}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </label>
          <label>
            <span>Input mode</span>
            <select value={props.config?.ui?.inputMode ?? "agent"} onChange={(event) => props.onPatchConfig((current) => ({
              ...current,
              ui: {
                theme: current.ui?.theme ?? "dark",
                inputMode: event.target.value as StudioInputMode,
                commandPaletteEnabled: current.ui?.commandPaletteEnabled ?? true,
                toolbeltLayout: current.ui?.toolbeltLayout ?? "compact",
              },
            }))}>
              <option value="agent">Agent</option>
              <option value="terminal">Terminal</option>
              <option value="auto">Auto</option>
            </select>
          </label>
          <label>
            <span>Toolbelt</span>
            <select value={props.config?.ui?.toolbeltLayout ?? "compact"} onChange={(event) => props.onPatchConfig((current) => ({
              ...current,
              ui: {
                theme: current.ui?.theme ?? "dark",
                inputMode: current.ui?.inputMode ?? "agent",
                commandPaletteEnabled: current.ui?.commandPaletteEnabled ?? true,
                toolbeltLayout: event.target.value as "compact" | "expanded",
              },
            }))}>
              <option value="compact">Compact</option>
              <option value="expanded">Expanded</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={props.config?.ui?.commandPaletteEnabled ?? true} onChange={(event) => props.onPatchConfig((current) => ({
              ...current,
              ui: {
                theme: current.ui?.theme ?? "dark",
                inputMode: current.ui?.inputMode ?? "agent",
                commandPaletteEnabled: event.target.checked,
                toolbeltLayout: current.ui?.toolbeltLayout ?? "compact",
              },
            }))} />
            <span>Command palette</span>
          </label>
        </div>
      </div>
    );
  }

  function renderCodex() {
    const workspaceRoots = props.config?.workspaceRoots ?? [];
    const codexAuthMessage = codexHarness && "authMessage" in codexHarness && typeof codexHarness.authMessage === "string"
      ? codexHarness.authMessage
      : "Run codex login --device-auth";
    return (
      <div className="codex-settings-surface" data-settings-section-content="codex">
        <div className="settings-section-grid">
          <SettingsMetricCard icon="command" label="Auth" value={codexHarness?.authStatus ?? "checking"} detail={codexAuthMessage} tone={codexHarness?.authStatus === "ready" || codexHarness?.authStatus === "signed_in" ? "ok" : "warn"} />
          <SettingsMetricCard icon="harness" label="Model" value={codexConfig.model} detail={codexConfig.reasoningEffort} />
          <SettingsMetricCard icon="workspace" label="Repos" value={String(workspaceRoots.length)} detail={props.status?.projectRoot ?? workspaceRoots[0] ?? "No workspace"} />
          <SettingsMetricCard icon="plan" label="Plan" value={codexConfig.planModeDefault ? "On" : "Off"} detail="default mode" />
        </div>
        <div className="settings-field-grid">
          <label>
            <span>Codex model</span>
            <select value={codexConfig.model} onChange={(event) => patchCodexConfig({ model: event.target.value })}>
              {CODEX_MODEL_OPTIONS.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </label>
          <label>
            <span>Thinking</span>
            <select value={codexConfig.reasoningEffort} onChange={(event) => patchCodexConfig({ reasoningEffort: event.target.value as StudioCodexReasoningEffort })}>
              {CODEX_REASONING_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Approval</span>
            <select value={codexConfig.approvalPolicy} onChange={(event) => patchCodexConfig({ approvalPolicy: event.target.value as StudioCodexApprovalPolicy })}>
              {CODEX_APPROVAL_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="settings-toggle-list">
          <label className="checkbox-row">
            <input type="checkbox" checked={codexConfig.planModeDefault} onChange={(event) => patchCodexConfig({ planModeDefault: event.target.checked })} />
            <span>Plan first</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={codexConfig.webSearch} onChange={(event) => patchCodexConfig({ webSearch: event.target.checked })} />
            <span>Web search</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={codexConfig.skipGitRepoCheck} onChange={(event) => patchCodexConfig({ skipGitRepoCheck: event.target.checked })} />
            <span>Skip git check</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={codexConfig.includeMemoireCommands} onChange={(event) => patchCodexConfig({ includeMemoireCommands: event.target.checked })} />
            <span>memi hints</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={codexConfig.includeCodexCommands} onChange={(event) => patchCodexConfig({ includeCodexCommands: event.target.checked })} />
            <span>Codex hints</span>
          </label>
        </div>
        <div className="setup-list" data-codex-repositories="workspaceRoots">
          {workspaceRoots.map((root) => (
            <article className="setup-action-row" key={root}>
              <strong>{compactName(root)}</strong>
              <span>{root}</span>
              <div className="inline-actions">
                <button data-action-id={`settings.codex.copy-repository.${root}`} type="button" onClick={() => void copyText(root)}>Copy path</button>
              </div>
            </article>
          ))}
          {workspaceRoots.length === 0 ? <span className="empty">No repositories configured.</span> : null}
        </div>
        <div className="inline-actions">
          <button data-action-id="settings.codex.login" type="button" onClick={() => void copyText("codex login --device-auth")}>Copy login command</button>
          <button data-action-id="settings.codex.add-repository" type="button" onClick={props.onSelectWorkspace}>Add repository</button>
        </div>
      </div>
    );
  }

  function renderAgents() {
    function setupActionLabel(action: StudioHarnessSetupAction) {
      if (action.kind === "agent_kit") return "Install kit";
      if (action.kind === "open_url") return "Open docs";
      if (action.kind === "refresh") return "Diagnose";
      if (action.kind === "enable_harness") return "Enable";
      return "Copy command";
    }

    function enableHarness(harnessId: Harness["id"]) {
      props.onPatchConfig((current) => {
        const configured = current.harnesses ?? [];
        const existing = configured.find((harness) => harness.id === harnessId);
        const fallback = props.harnesses.find((harness) => harness.id === harnessId);
        const nextHarness = {
          ...(fallback ?? existing),
          ...(existing ?? {}),
          id: harnessId,
          enabled: true,
          enabledByDefault: true,
        } as NonNullable<StudioConfig["harnesses"]>[number];
        return {
          ...current,
          harnesses: [
            nextHarness,
            ...configured.filter((harness) => harness.id !== harnessId),
          ],
        };
      });
    }

    function runSetupAction(harnessId: Harness["id"], action: StudioHarnessSetupAction) {
      if (action.kind === "refresh") {
        void props.onDiagnoseHarness(harnessId);
        return;
      }
      if (action.kind === "enable_harness") {
        enableHarness(harnessId);
        return;
      }
      if (action.kind === "agent_kit") {
        void props.onInstallAgentKit(action.agentKitTarget ?? agentKitTargetForHarness(harnessId));
        return;
      }
      if (action.command) {
        void copyText(action.command);
        return;
      }
      if (action.url) {
        window.open(action.url, "_blank", "noopener,noreferrer");
      }
    }

    return (
      <div className="setup-list" data-settings-section-content="agents">
        {coreHarnessRows.map((harness) => (
          <article className="setup-action-row" key={harness.id}>
            <span className="settings-row-icon"><CommandPaletteIconGlyph name={harnessIcon(harness.id)} /></span>
            <div className="settings-row-copy">
              <strong>{harness.label}</strong>
              <span>{harness.setupPlan.summary}</span>
              <div className="settings-tag-row">
                <SettingsTag tone={harness.installed ? "ok" : "warn"}>{harness.installed ? "installed" : "missing"}</SettingsTag>
                <SettingsTag tone={harness.enabled ? "ok" : "neutral"}>{harness.enabled ? "enabled" : "off"}</SettingsTag>
                <SettingsTag tone={harness.authStatus === "ready" || harness.authStatus === "signed_in" ? "ok" : "neutral"}>{harness.authStatus ?? "checking"}</SettingsTag>
              </div>
            </div>
            <div className="inline-actions">
              <button data-action-id={`settings.harness.select.${harness.id}`} type="button" onClick={() => props.onSelectHarness(harness.id)}>Use</button>
              {harness.setupCommand ? <button data-action-id={`settings.harness.copy.${harness.id}`} type="button" onClick={() => void copyText(harness.setupCommand ?? "")}>Copy command</button> : null}
              {harness.setupPlan.actions.slice(0, 3).map((action) => (
                <button
                  data-action-id={`settings.harness.setup.${harness.id}.${action.id}`}
                  data-harness-setup-action={action.kind}
                  key={action.id}
                  type="button"
                  onClick={() => runSetupAction(harness.id, action)}
                >
                  {setupActionLabel(action)}
                </button>
              ))}
            </div>
          </article>
        ))}
        {advancedHarnessRows.length ? (
          <details className="advanced-harness-list" data-advanced-harnesses="settings">
            <summary>Advanced integrations</summary>
            {advancedHarnessRows.map((harness) => (
              <article className="setup-action-row" key={harness.id}>
                <span className="settings-row-icon"><CommandPaletteIconGlyph name={harnessIcon(harness.id)} /></span>
                <div className="settings-row-copy">
                  <strong>{harness.label}</strong>
                  <span>{harness.setupPlan.summary}</span>
                  <div className="settings-tag-row">
                    <SettingsTag tone={harness.installed ? "ok" : "warn"}>{harness.installed ? "installed" : "missing"}</SettingsTag>
                    <SettingsTag tone={harness.enabled ? "ok" : "neutral"}>{harness.enabled ? "enabled" : "off"}</SettingsTag>
                  </div>
                </div>
                <div className="inline-actions">
                  <button data-action-id={`settings.harness.select.${harness.id}`} type="button" onClick={() => props.onSelectHarness(harness.id)}>Use</button>
                  {harness.setupCommand ? <button data-action-id={`settings.harness.copy.${harness.id}`} type="button" onClick={() => void copyText(harness.setupCommand ?? "")}>Copy command</button> : null}
                  {harness.setupPlan.actions.slice(0, 2).map((action) => (
                    <button
                      data-action-id={`settings.harness.setup.${harness.id}.${action.id}`}
                      data-harness-setup-action={action.kind}
                      key={action.id}
                      type="button"
                      onClick={() => runSetupAction(harness.id, action)}
                    >
                      {setupActionLabel(action)}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </details>
        ) : null}
      </div>
    );
  }

  function renderProviders() {
    const usageBudgets = normalizeUsageBudgetConfig(props.config?.usageBudgets);
    const providerConfig = {
      anthropic: providers.anthropic ?? { enabled: true, envKey: "ANTHROPIC_API_KEY" as const },
      openai: providers.openai ?? { enabled: true, envKey: "OPENAI_API_KEY" as const },
      openaiCompatible: providers.openaiCompatible ?? { enabled: false, baseUrl: null, envKey: null },
      ollama: providers.ollama ?? { enabled: true, baseUrl: "http://127.0.0.1:11434", defaultModel: "llama3.1:8b" },
    };

    function patchProviders(update: NonNullable<StudioConfig["providers"]>) {
      props.onPatchConfig((current) => ({
        ...current,
        providers: {
          ...providerConfig,
          ...(current.providers ?? {}),
          ...update,
        },
      }));
    }

    function providerCard(input: {
      id: string;
      icon: StudioControlIconName;
      label: string;
      enabled: boolean;
      detail: string;
      onChange: (enabled: boolean) => void;
    }) {
      return (
        <label className="provider-card" data-provider-state={input.enabled ? "on" : "off"} data-provider-id={input.id}>
          <span className="settings-row-icon"><StudioControlIcon name={input.icon} /></span>
          <span className="provider-card-copy">
            <strong>{input.label}</strong>
            <small title={input.detail}>{input.detail}</small>
          </span>
          <input
            aria-label={`${input.label} provider`}
            checked={input.enabled}
            className="settings-switch-input"
            type="checkbox"
            onChange={(event) => input.onChange(event.target.checked)}
          />
          <span className="settings-switch-track" aria-hidden="true" />
        </label>
      );
    }

    return (
      <div className="providers-settings-surface" data-settings-section-content="providers">
        <div className="provider-card-grid" aria-label="Model providers">
          {providerCard({
            id: "anthropic",
            icon: "receipt",
            label: "Anthropic",
            enabled: providerConfig.anthropic.enabled,
            detail: providerConfig.anthropic.envKey,
            onChange: (enabled) => patchProviders({ anthropic: { enabled, envKey: "ANTHROPIC_API_KEY" } }),
          })}
          {providerCard({
            id: "openai",
            icon: "command",
            label: "OpenAI",
            enabled: providerConfig.openai.enabled,
            detail: providerConfig.openai.envKey,
            onChange: (enabled) => patchProviders({ openai: { enabled, envKey: "OPENAI_API_KEY" } }),
          })}
          {providerCard({
            id: "ollama",
            icon: "harness",
            label: "Ollama",
            enabled: providerConfig.ollama.enabled,
            detail: providerConfig.ollama.defaultModel,
            onChange: (enabled) => patchProviders({ ollama: { ...providerConfig.ollama, enabled } }),
          })}
          {providerCard({
            id: "compatible",
            icon: "open",
            label: "Compatible",
            enabled: providerConfig.openaiCompatible.enabled,
            detail: providerConfig.openaiCompatible.baseUrl ?? "No endpoint",
            onChange: (enabled) => patchProviders({ openaiCompatible: { ...providerConfig.openaiCompatible, enabled } }),
          })}
        </div>
        <div className="settings-field-grid settings-secondary-fields">
          {providerConfig.ollama.enabled ? (
            <>
              <label>
                <span>Ollama URL</span>
                <input value={providerConfig.ollama.baseUrl} onChange={(event) => patchProviders({ ollama: { ...providerConfig.ollama, baseUrl: event.target.value } })} />
              </label>
              <label>
                <span>Ollama model</span>
                <input value={providerConfig.ollama.defaultModel} onChange={(event) => patchProviders({ ollama: { ...providerConfig.ollama, defaultModel: event.target.value } })} />
              </label>
            </>
          ) : null}
          {providerConfig.openaiCompatible.enabled ? (
            <>
              <label>
                <span>Compatible URL</span>
                <input value={providerConfig.openaiCompatible.baseUrl ?? ""} onChange={(event) => patchProviders({ openaiCompatible: { ...providerConfig.openaiCompatible, baseUrl: event.target.value || null } })} />
              </label>
              <label>
                <span>Compatible key env</span>
                <input value={providerConfig.openaiCompatible.envKey ?? ""} onChange={(event) => patchProviders({ openaiCompatible: { ...providerConfig.openaiCompatible, envKey: event.target.value || null } })} placeholder="OPENAI_API_KEY" />
              </label>
            </>
          ) : null}
        </div>
        <details className="settings-budget-panel">
          <summary>Usage warnings</summary>
          <div className="settings-field-grid">
            <label data-usage-budget-field="global-threshold">
              <span>Warning threshold</span>
              <input
                min="0"
                max="1"
                step="0.05"
                type="number"
                value={numberInputValue(usageBudgets.warningThreshold)}
                onChange={(event) => patchUsageWarningThreshold(parseNullableNumber(event.target.value))}
              />
            </label>
            <label data-usage-budget-field="openai">
              <span>OpenAI tokens</span>
              <input
                min="0"
                step="1000"
                type="number"
                value={numberInputValue(usageBudgets.providers.openai?.dailyTokenLimit)}
                onChange={(event) => patchUsageBudget("providers", "openai", { dailyTokenLimit: parseNullableNumber(event.target.value) })}
              />
            </label>
            <label data-usage-budget-field="anthropic">
              <span>Anthropic tokens</span>
              <input
                min="0"
                step="1000"
                type="number"
                value={numberInputValue(usageBudgets.providers.anthropic?.dailyTokenLimit)}
                onChange={(event) => patchUsageBudget("providers", "anthropic", { dailyTokenLimit: parseNullableNumber(event.target.value) })}
              />
            </label>
            <label data-usage-budget-field="codex">
              <span>Codex tokens</span>
              <input
                min="0"
                step="1000"
                type="number"
                value={numberInputValue(usageBudgets.harnesses.codex?.dailyTokenLimit)}
                onChange={(event) => patchUsageBudget("harnesses", "codex", { dailyTokenLimit: parseNullableNumber(event.target.value) })}
              />
            </label>
            <label data-usage-budget-field="claude-code">
              <span>Claude tokens</span>
              <input
                min="0"
                step="1000"
                type="number"
                value={numberInputValue(usageBudgets.harnesses["claude-code"]?.dailyTokenLimit)}
                onChange={(event) => patchUsageBudget("harnesses", "claude-code", { dailyTokenLimit: parseNullableNumber(event.target.value) })}
              />
            </label>
            <label data-usage-budget-field="hermes">
              <span>Advanced tokens</span>
              <input
                min="0"
                step="1000"
                type="number"
                value={numberInputValue(usageBudgets.harnesses.hermes?.dailyTokenLimit)}
                onChange={(event) => patchUsageBudget("harnesses", "hermes", { dailyTokenLimit: parseNullableNumber(event.target.value) })}
              />
            </label>
          </div>
        </details>
      </div>
    );
  }

  function renderPermissions() {
    type PolicyValue = "allow" | "approval" | "block";
    const permissionConfig = props.config?.permissions ?? {
      workspaceWrite: "approval" as PolicyValue,
      shell: "approval" as PolicyValue,
      computer: "approval" as PolicyValue,
      figma: "allow" as PolicyValue,
      allowlist: [],
      denylist: [],
    };
    const computerConfig = props.config?.computer ?? {
      enabled: false,
      allowedApps: ["Figma"],
      requireApproval: true,
      permissions,
    };

    function patchPolicy(key: "workspaceWrite" | "shell" | "computer" | "figma", value: PolicyValue) {
      props.onPatchConfig((current) => ({
        ...current,
        permissions: {
          workspaceWrite: current.permissions?.workspaceWrite ?? "approval",
          shell: current.permissions?.shell ?? "approval",
          computer: current.permissions?.computer ?? "approval",
          figma: current.permissions?.figma ?? "allow",
          allowlist: current.permissions?.allowlist ?? [],
          denylist: current.permissions?.denylist ?? [],
          [key]: value,
        },
      }));
    }

    function patchComputer(update: Partial<NonNullable<StudioConfig["computer"]>>) {
      props.onPatchConfig((current) => ({
        ...current,
        computer: {
          enabled: current.computer?.enabled ?? false,
          allowedApps: current.computer?.allowedApps ?? ["Figma"],
          requireApproval: current.computer?.requireApproval ?? true,
          permissions: current.computer?.permissions ?? permissions,
          ...update,
        },
      }));
    }

    return (
      <>
        <div className="settings-section-grid" data-settings-permission-summary="policies">
          <SettingsMetricCard icon="workspace" label="Workspace" value={permissionConfig.workspaceWrite} />
          <SettingsMetricCard icon="command" label="Shell" value={permissionConfig.shell} tone={permissionConfig.shell === "allow" ? "warn" : "neutral"} />
          <SettingsMetricCard icon="access" label="Computer" value={computerConfig.enabled ? "On" : "Off"} tone={computerConfig.enabled ? "ok" : "neutral"} />
          <SettingsMetricCard icon="figma" label="Figma" value={permissionConfig.figma} />
        </div>
        <div className="settings-field-grid" data-settings-section-content="permissions">
          <label>
            <span>Workspace writes</span>
            <select value={permissionConfig.workspaceWrite} onChange={(event) => patchPolicy("workspaceWrite", event.target.value as PolicyValue)}>
              <option value="approval">Approval</option>
              <option value="allow">Allow</option>
              <option value="block">Block</option>
            </select>
          </label>
          <label>
            <span>Shell policy</span>
            <select value={permissionConfig.shell} onChange={(event) => patchPolicy("shell", event.target.value as PolicyValue)}>
              <option value="approval">Approval</option>
              <option value="allow">Allow</option>
              <option value="block">Block</option>
            </select>
          </label>
          <label>
            <span>Computer policy</span>
            <select value={permissionConfig.computer} onChange={(event) => patchPolicy("computer", event.target.value as PolicyValue)}>
              <option value="approval">Approval</option>
              <option value="allow">Allow</option>
              <option value="block">Block</option>
            </select>
          </label>
          <label>
            <span>Figma policy</span>
            <select value={permissionConfig.figma} onChange={(event) => patchPolicy("figma", event.target.value as PolicyValue)}>
              <option value="approval">Approval</option>
              <option value="allow">Allow</option>
              <option value="block">Block</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={computerConfig.enabled} onChange={(event) => patchComputer({ enabled: event.target.checked })} />
            <span>Enable Computer</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={computerConfig.requireApproval} onChange={(event) => patchComputer({ requireApproval: event.target.checked })} />
            <span>Computer approval</span>
          </label>
        </div>
        <div className="permission-grid" data-macos-permission-actions="settings">
          {macOSPermissionActions.map((action) => (
            <button data-action-id={`settings.permission.${action.permission ?? action.id}`} key={action.id} type="button" onClick={() => runMacOSPermissionAction(action)}>
              <span className="settings-row-icon"><StudioControlIcon name={permissionIcon(action.permission)} /></span>
              <strong>{action.label}</strong>
              <SettingsTag tone={permissionTone(action.status, action.required)}>{permissionStatusLabel(action.status, action.required)}</SettingsTag>
            </button>
          ))}
        </div>
      </>
    );
  }

  function renderFigma() {
    return (
      <div className="setup-card settings-feature-card" data-settings-section-content="figma">
        <span className="settings-row-icon"><StudioControlIcon name="figma" /></span>
        <div className="settings-row-copy">
          <span>Figma</span>
          <strong>{figmaStatusLabel(props.figmaStatus)}</strong>
          <div className="settings-tag-row">
            <SettingsTag tone={isFigmaBridgeRunning(props.figmaStatus) ? "ok" : "neutral"}>{props.figmaStatus?.port ? `:${props.figmaStatus.port}` : "bridge"}</SettingsTag>
            <SettingsTag tone={isFigmaPluginConnected(props.figmaStatus) ? "ok" : "warn"}>{isFigmaPluginConnected(props.figmaStatus) ? "plugin" : "plugin off"}</SettingsTag>
          </div>
        </div>
        <div className="inline-actions">
          <button data-action-id="figma.connect" type="button" onClick={props.onConnectFigma} disabled={props.figmaConnecting}>{props.figmaConnecting ? "Starting" : "Start bridge"}</button>
          <button data-action-id="figma.open" type="button" onClick={props.onOpenFigma}>Open Figma</button>
        </div>
      </div>
    );
  }

  function renderPlugins() {
    const notes = props.marketplaceNotes?.notes ?? [];
    const summary = props.marketplaceNotes?.summary;
    const categories = Object.keys(summary?.categories ?? {}).sort();
    const filteredNotes = notes.filter((note) => {
      const categoryMatch = marketplaceCategoryFilter === "all" || note.category === marketplaceCategoryFilter;
      const sourceMatch = marketplaceSourceFilter === "all" || marketplaceSourceBucket(note) === marketplaceSourceFilter;
      const query = marketplaceQuery.trim().toLowerCase();
      if (!query) return categoryMatch && sourceMatch;
      const haystack = `${note.title} ${note.name} ${note.description} ${note.tags.join(" ")} ${note.category}`.toLowerCase();
      return categoryMatch && sourceMatch && haystack.includes(query);
    });
    const selectedMarketplaceNote = notes.find((note) => note.id === props.selectedMarketplaceNoteId)
      ?? filteredNotes[0]
      ?? notes[0]
      ?? null;
    const note = selectedMarketplaceNote;
    const selectedDownloadJob = note ? props.marketplaceDownloadJobs[note.id] : null;
    const selectedFork = props.noteForks.find((fork) => fork.name === props.selectedNoteForkId) ?? props.noteForks[0] ?? null;
    const selectedForkFile = props.noteForkFiles.find((file) => file.path === props.selectedNoteForkFile) ?? props.noteForkFiles[0] ?? null;
    const sourceFilters = [
      { id: "all", label: "All" },
      { id: "official", label: "Official" },
      { id: "community", label: "Community" },
      { id: "installed", label: "Installed" },
      { id: "forks", label: "Forks" },
      { id: "updates", label: "Updates" },
    ];
    return (
      <div className="plugins-settings-surface" data-settings-section-content="plugins" data-marketplace-notes="memoire-notes" data-plugin-marketplace-layout="vscode-split">
        <div className="drawer-section-head">
          <span>Marketplace</span>
          <button data-action-id="settings.plugins.refresh" type="button" onClick={() => void props.onRefreshMarketplace()}>Refresh</button>
        </div>
        {props.marketplaceError ? <p className="error">{props.marketplaceError}</p> : null}
        <div className="marketplace-layout">
          <aside className="marketplace-filter-rail" data-marketplace-filter-rail="notes">
            <label>
              <span>Search</span>
              <input value={marketplaceQuery} onChange={(event) => setMarketplaceQuery(event.target.value)} placeholder="Search Marketplace" />
            </label>
            <div className="marketplace-stats">
              <article><span>Total</span><strong>{summary?.total ?? notes.length}</strong></article>
              <article><span>Installed</span><strong>{summary?.installed ?? notes.filter((note) => note.installed).length}</strong></article>
              <article><span>Installable</span><strong>{summary?.installable ?? notes.filter((note) => note.installable).length}</strong></article>
            </div>
            <nav aria-label="Marketplace categories">
              <button className={marketplaceCategoryFilter === "all" ? "active" : ""} type="button" onClick={() => setMarketplaceCategoryFilter("all")}>All</button>
              {categories.map((category) => (
                <button className={marketplaceCategoryFilter === category ? "active" : ""} key={category} type="button" onClick={() => setMarketplaceCategoryFilter(category)}>
                  {category}
                </button>
              ))}
            </nav>
            <nav aria-label="Marketplace sources" data-marketplace-source-filter="official-community-forks">
              {sourceFilters.map((filter) => (
                <button className={marketplaceSourceFilter === filter.id ? "active" : ""} key={filter.id} type="button" onClick={() => setMarketplaceSourceFilter(filter.id)}>
                  {filter.label}
                </button>
              ))}
            </nav>
            <small>{props.marketplaceNotes?.remote?.status ?? "offline"} remote / {props.marketplaceNotes?.community?.status ?? "offline"} community</small>
          </aside>
          <div className="marketplace-note-results" data-marketplace-note-results="dense-list">
            {filteredNotes.map((note) => {
              const job = props.marketplaceDownloadJobs[note.id];
              return (
                <button
                  className={selectedMarketplaceNote?.id === note.id ? "marketplace-result-row active" : "marketplace-result-row"}
                  data-note-source={note.source}
                  key={note.id}
                  type="button"
                  onClick={() => props.onMarketplaceSelectionChange(note.id)}
                >
                  <span>
                    <strong>{note.title}</strong>
                    <small>{note.name} / {note.version} / {marketplaceSourceLabel(note.source)}</small>
                  </span>
                  <p>{note.description}</p>
                  <span className="marketplace-result-meta">
                    <small>{note.category}</small>
                    <small>{marketplaceSourceBucket(note)}</small>
                    <small>{marketplaceNoteFreshness(note)}</small>
                    {job ? <small>{job.status} {job.progress}%</small> : null}
                  </span>
                </button>
              );
            })}
            {!props.marketplaceNotes ? <p className="empty">Plugin catalog not loaded.</p> : null}
            {props.marketplaceNotes && filteredNotes.length === 0 ? <p className="empty">No memi Notes found.</p> : null}
          </div>
          <section className="marketplace-note-detail" data-marketplace-note-detail="quick-install">
            {note ? (
              <>
                <div>
                  <span>{note.category} / {note.version}</span>
                  <h3>{note.title}</h3>
                  <p>{note.description}</p>
                  <small title={note.sourcePath}>{displaySourceLabel(note.sourcePath)}</small>
                </div>
                <div className="marketplace-note-actions">
                  {note.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <div className="marketplace-detail-grid">
                  <article><span>Source</span><strong>{marketplaceSourceLabel(note.source)}</strong></article>
                  <article><span>Freshness</span><strong>{marketplaceNoteFreshness(note)}</strong></article>
                  <article><span>Install</span><strong>{note.installed ? "installed" : note.installable ? "available" : "locked"}</strong></article>
                </div>
                {note.sourceRepo || note.contributionUrl ? (
                  <div className="marketplace-detail-grid">
                    <article><span>Review</span><strong>{note.reviewStatus ?? "official"}</strong></article>
                    <article><span>Repo</span><strong>{note.sourceRepo ? displaySourceLabel(note.sourceRepo) : "community"}</strong></article>
                    <article><span>Forkable</span><strong>{note.isForkable ? "yes" : "install first"}</strong></article>
                  </div>
                ) : null}
                {selectedDownloadJob ? (
                  <div className="marketplace-progress">
                    <span>{selectedDownloadJob.message}</span>
                    <progress value={selectedDownloadJob.progress} max={100} />
                  </div>
                ) : null}
                <div className="inline-actions">
                  {note.installable && !note.installed ? (
                    <button data-action-id={`settings.plugins.install.${note.id}`} type="button" onClick={() => void props.onInstallMarketplaceNote(note.id)} disabled={props.marketplaceBusyId === note.id}>
                      {props.marketplaceBusyId === note.id ? "Installing" : "Install"}
                    </button>
                  ) : null}
                  {note.installed && !note.builtIn ? (
                    <button data-action-id={`settings.plugins.remove.${note.name}`} type="button" onClick={() => void props.onRemoveMarketplaceNote(note.name)} disabled={props.marketplaceBusyId === note.name}>
                      Remove
                    </button>
                  ) : null}
                  {note.isForkable ? (
                    <button data-action-id={`settings.plugins.fork.${note.id}`} type="button" onClick={() => void props.onForkMarketplaceNote(note.id)} disabled={props.marketplaceBusyId === note.id}>
                      Fork
                    </button>
                  ) : null}
                  <button data-action-id={`settings.plugins.copy-install.${note.name}`} type="button" onClick={() => void copyText(`memi notes install ${note.name}`)}>Copy command</button>
                  {note.contributionUrl ? <button data-action-id={`settings.plugins.improve.${note.name}`} type="button" onClick={() => void copyText(note.contributionUrl ?? "")}>Improve this Note</button> : null}
                </div>
              </>
            ) : (
              <p className="empty">Select a Note to view details.</p>
            )}
          </section>
        </div>
        <section className="note-fork-editor" data-note-fork-editor="markdown-review">
          <div className="drawer-section-head">
            <span>Fork Review</span>
            <div className="inline-actions">
              <button type="button" onClick={() => void props.onValidateNoteFork()} disabled={!selectedFork}>Validate</button>
              <button type="button" onClick={() => void props.onExportNoteForkPr()} disabled={!selectedFork}>Submit for Review</button>
            </div>
          </div>
          {selectedFork ? (
            <div className="note-fork-layout">
              <aside>
                {props.noteForks.map((fork) => (
                  <button className={selectedFork.name === fork.name ? "active" : ""} key={fork.name} type="button" onClick={() => void props.onSelectNoteFork(fork.name)}>
                    <strong>{fork.name}</strong>
                    <small>{fork.reviewStatus} / forked from {fork.forkOf.name}</small>
                  </button>
                ))}
                {props.noteForkFiles.map((file) => (
                  <button className={selectedForkFile?.path === file.path ? "active" : ""} key={file.path} type="button" onClick={() => props.onSelectNoteForkFile(file.path)}>
                    {file.path}
                  </button>
                ))}
              </aside>
              <div>
                {selectedForkFile ? (
                  <textarea
                    aria-label="Note fork markdown editor"
                    defaultValue={selectedForkFile.content}
                    key={`${selectedFork?.name ?? "fork"}:${selectedForkFile.path}`}
                    onBlur={(event) => void props.onUpdateNoteForkFile(selectedForkFile.path, event.target.value)}
                  />
                ) : <p className="empty">Select a fork file.</p>}
              </div>
              <aside>
                <strong>Validation</strong>
                {props.noteForkValidation ? (
                  <p>{props.noteForkValidation.ok ? "Ready for review" : `${props.noteForkValidation.issues.length} issue(s)`}</p>
                ) : <p>No validation run.</p>}
                <strong>Diff</strong>
                <p>{props.noteForkDiff ? `${props.noteForkDiff.files.length} changed file(s)` : "No diff loaded."}</p>
                <strong>PR handoff</strong>
                {props.noteForkPrHandoff ? <pre>{props.noteForkPrHandoff.commands.join("\n")}</pre> : <p>Validate and submit to generate commands.</p>}
              </aside>
            </div>
          ) : (
            <p className="empty">Fork a Note to edit and submit community improvements.</p>
          )}
        </section>
      </div>
    );
  }

  function renderAutomationsSettings() {
    return (
      <div className="automations-settings-surface" data-settings-section-content="automations" data-settings-automations="launcher">
        <div className="settings-section-grid">
          <article><span>Scheduler</span><strong>Studio runtime</strong><small>LaunchAgent managed by Automations Center.</small></article>
          <article><span>Templates</span><strong>4</strong><small>Audit, Figma pull, build review, research refresh.</small></article>
          <article><span>Runs</span><strong>Local</strong><small>Sessions stay in this workspace history.</small></article>
          <article><span>Writes</span><strong>Policy bound</strong><small>Each automation carries a mutation policy.</small></article>
        </div>
        <div className="setup-card">
          <span>Automations</span>
          <strong>Scheduled design harness work</strong>
          <p>Create, pause, run, inspect history, and manage the local scheduler.</p>
          <div className="inline-actions">
            <button data-action-id="settings.automations.open" type="button" onClick={props.onOpenAutomationsCenter}>Open Automations Center</button>
          </div>
        </div>
      </div>
    );
  }

  function renderAdvanced() {
    const enabledTools = props.studioTools.filter((tool) => tool.enabled);
    return (
      <div className="advanced-settings-surface" data-settings-section-content="advanced" data-settings-advanced="tools-browser">
        <div className="settings-section-grid">
          <article><span>Tools</span><strong>{enabledTools.length}/{props.studioTools.length}</strong><small>Runtime tool broker</small></article>
          <article><span>Browser</span><strong>{props.browserStatus?.enabled ? "enabled" : "disabled"}</strong><small>{props.browserStatus?.message ?? "Browser status unavailable"}</small></article>
          <article><span>Sessions</span><strong>{props.browserStatus?.activeSessions ?? 0}</strong><small>Browser automation sessions</small></article>
          <article><span>MCP</span><strong>{props.config?.enabledTools?.mcp ? "enabled" : "disabled"}</strong><small>External agent bridge tools</small></article>
        </div>
        <div className="setup-list compact" data-advanced-tool-list="studio-tools">
          {props.studioTools.map((tool) => (
            <article className="setup-action-row" key={tool.id}>
              <strong>{tool.label}</strong>
              <span>{tool.category} / {tool.enabled ? "enabled" : "disabled"} / {tool.requiresApproval ? "approval" : "direct"}</span>
              <div className="inline-actions">
                <button data-action-id={`settings.advanced.copy-tool.${tool.id}`} type="button" onClick={() => void copyText(tool.id)}>Copy id</button>
              </div>
            </article>
          ))}
          {props.studioTools.length === 0 ? <span className="empty">No Studio tools reported by the runtime.</span> : null}
        </div>
      </div>
    );
  }

  function renderDownload() {
    return (
      <div className="download-ready-panel" data-download-ready="settings-about" data-settings-section-content="download">
        <div className="drawer-section-head">
          <span>Download Ready</span>
          <button data-action-id="download.copy-dmg-path" type="button" onClick={() => void copyText(expectedDmgPath(props.status))}>Copy DMG path</button>
        </div>
        <div className="download-ready-list" data-download-ready="macos-dmg">
          {downloadItems.map((item) => <article key={item.id}><strong>{item.label}</strong><span>{item.detail}</span></article>)}
        </div>
      </div>
    );
  }

  function renderSetup() {
    const workspaceRoot = props.config?.workspaceRoots?.[0] ?? props.status?.projectRoot ?? "No workspace";
    const providerCount = [
      providers.anthropic?.enabled ?? true,
      providers.openai?.enabled ?? true,
      providers.ollama?.enabled ?? true,
      providers.openaiCompatible?.enabled ?? false,
    ].filter(Boolean).length;

    return (
      <section className="settings-setup-surface" data-settings-setup="macos-download-readiness">
        <div className="settings-hero-card" data-setup-step="install-source" data-atomic-level="organism">
          <span className="settings-row-icon"><StudioControlIcon name="settings" /></span>
          <div className="settings-row-copy">
            <span>Studio</span>
            <strong>{MEMOIRE_PACKAGE_NAME}@{MEMOIRE_PACKAGE_VERSION}</strong>
            <div className="settings-tag-row">
              <SettingsTag tone={props.status ? "ok" : "warn"}>{props.status?.status ?? "loading"}</SettingsTag>
              <SettingsTag>{compactName(workspaceRoot)}</SettingsTag>
              <SettingsTag tone={props.config?.setup?.completedAt ? "ok" : "neutral"}>{props.config?.setup?.completedAt ? "complete" : "setup"}</SettingsTag>
            </div>
          </div>
          <div className="inline-actions">
            <button data-action-id="runtime.refresh" type="button" onClick={props.onRefresh}><StudioControlIcon name="refresh" />Refresh</button>
            <button className="primary" data-action-id="settings.save" type="button" onClick={props.onSave} disabled={!props.config}><StudioControlIcon name="save" />Save</button>
          </div>
        </div>

        <div className="settings-setup-grid" data-atomic-level="template">
          <article className="setup-card settings-feature-card" data-setup-step="workspace">
            <span className="settings-row-icon"><StudioControlIcon name="workspace" /></span>
            <div className="settings-row-copy">
              <span>Workspace</span>
              <strong title={workspaceRoot}>{compactName(workspaceRoot)}</strong>
              <small title={workspaceRoot}>{workspaceRoot}</small>
            </div>
            <button data-action-id="workspace.change" type="button" onClick={props.onSelectWorkspace}>Change</button>
          </article>

          <article className="setup-card settings-feature-card" data-setup-step="agents">
            <span className="settings-row-icon"><StudioControlIcon name="harness" /></span>
            <div className="settings-row-copy">
              <span>Agents</span>
              <strong>{coreHarnessRows.filter((harness) => harness.installed).length}/{coreHarnessRows.length} installed</strong>
              <div className="settings-tag-row">
                {coreHarnessRows.slice(0, 2).map((harness) => (
                  <SettingsTag key={harness.id} tone={harness.installed ? "ok" : "warn"}>{harness.label}</SettingsTag>
                ))}
              </div>
            </div>
            <button data-action-id="settings.section.agents.from-setup" type="button" onClick={() => props.onSectionChange("Agents")}>Open</button>
          </article>

          <article className="setup-card settings-feature-card" data-setup-step="providers">
            <span className="settings-row-icon"><StudioControlIcon name="receipt" /></span>
            <div className="settings-row-copy">
              <span>Providers</span>
              <strong>{providerCount} active</strong>
              <div className="settings-tag-row">
                <SettingsTag tone={providers.anthropic?.enabled === false ? "neutral" : "ok"}>Anthropic</SettingsTag>
                <SettingsTag tone={providers.openai?.enabled === false ? "neutral" : "ok"}>OpenAI</SettingsTag>
                <SettingsTag tone={providers.ollama?.enabled === false ? "neutral" : "ok"}>Ollama</SettingsTag>
              </div>
            </div>
            <button data-action-id="settings.section.providers.from-setup" type="button" onClick={() => props.onSectionChange("Providers")}>Edit</button>
          </article>

          <article className="setup-card settings-feature-card" data-setup-step="figma">
            <span className="settings-row-icon"><StudioControlIcon name="figma" /></span>
            <div className="settings-row-copy">
              <span>Figma</span>
              <strong>{figmaStatusLabel(props.figmaStatus)}</strong>
              <div className="settings-tag-row">
                <SettingsTag tone={isFigmaBridgeRunning(props.figmaStatus) ? "ok" : "neutral"}>bridge</SettingsTag>
                <SettingsTag tone={isFigmaPluginConnected(props.figmaStatus) ? "ok" : "warn"}>plugin</SettingsTag>
              </div>
            </div>
            <button data-action-id="figma.connect.setup" type="button" onClick={props.onConnectFigma} disabled={props.figmaConnecting}>{props.figmaConnecting ? "Starting" : "Start"}</button>
          </article>

          <article className="setup-card settings-feature-card" data-setup-step="download">
            <span className="settings-row-icon"><StudioControlIcon name="download" /></span>
            <div className="settings-row-copy">
              <span>Download</span>
              <strong>DMG ready path</strong>
              <small title={expectedDmgPath(props.status)}>{compactName(expectedDmgPath(props.status))}</small>
            </div>
            <button data-action-id="download.copy-dmg-path.setup" type="button" onClick={() => void copyText(expectedDmgPath(props.status))}>Copy</button>
          </article>
        </div>

        <div className="setup-card" data-setup-step="macos-permissions">
          <div className="settings-card-head">
            <span className="settings-row-icon"><StudioControlIcon name="access" /></span>
            <div>
              <span>macOS</span>
              <strong>{requiredMacOSPermissionCount === 0 ? "Ready" : `${requiredMacOSPermissionCount} left`}</strong>
            </div>
          </div>
          <div className="permission-grid" data-macos-permission-actions="setup">
            {macOSPermissionActions.map((action) => (
              <button data-action-id={`setup.permission.${action.permission ?? action.id}`} key={action.id} type="button" onClick={() => runMacOSPermissionAction(action)}>
                <span className="settings-row-icon"><StudioControlIcon name={permissionIcon(action.permission)} /></span>
                <strong>{action.label}</strong>
                <SettingsTag tone={permissionTone(action.status, action.required)}>{permissionStatusLabel(action.status, action.required)}</SettingsTag>
              </button>
            ))}
          </div>
        </div>
        <div className="settings-actions">
          <span>{props.config?.setup?.completedAt ? `Completed ${formatAutomationDate(props.config.setup.completedAt)}` : "First-run setup pending"}</span>
          <button className="primary" data-action-id="setup.finish" type="button" onClick={props.onCompleteSetup}>Mark setup complete</button>
        </div>
      </section>
    );
  }

  function renderSection() {
    if (props.activeSection === "Setup") return renderSetup();
    if (props.activeSection === "Codex") return renderCodex();
    if (props.activeSection === "Agents") return renderAgents();
    if (props.activeSection === "Providers") return renderProviders();
    if (props.activeSection === "Permissions") return renderPermissions();
    if (props.activeSection === "Figma") return renderFigma();
    if (props.activeSection === "Plugins") return renderPlugins();
    if (props.activeSection === "Automations") return renderAutomationsSettings();
    if (props.activeSection === "Download") return renderDownload();
    if (props.activeSection === "Advanced") return renderAdvanced();
    return renderGeneral();
  }

  return (
    <div className="modal-backdrop settings-backdrop" data-settings-panel="warp-style" data-user-settings="studio-settings" role="dialog" aria-modal="true" aria-label="Studio settings">
      <section className="settings-panel" data-atomic-level="template">
        <aside>
          <strong>Settings</strong>
          {sections.map((section) => (
            <button
              className={props.activeSection === section.id ? "active" : ""}
              data-action-id={`settings.section.${section.id.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              key={section.id}
              type="button"
              onClick={() => props.onSectionChange(section.id)}
            >
              <StudioControlIcon name={section.icon} />
              <span>{section.label}</span>
              <small>{section.tag}</small>
            </button>
          ))}
        </aside>
        <main>
          <header>
            <div>
              <p className="eyebrow">{props.activeSection}</p>
              <h2>Studio Settings</h2>
            </div>
            <div className="inline-actions">
              <IconButton actionId="runtime.refresh" ariaLabel="Refresh settings" title="Refresh" icon="refresh" onClick={() => void props.onRefresh()} />
              <IconButton actionId="settings.close" ariaLabel="Close settings" title="Close" icon="close" onClick={props.onClose} />
              <IconButton className="primary" actionId="settings.save" ariaLabel="Save settings" title="Save" icon="save" onClick={props.onSave} disabled={!props.config} />
            </div>
          </header>
          <div className="settings-body">
            {renderSection()}
          </div>
          <div className="settings-actions">
            <span>{props.computerStatus?.message ?? "Computer state unavailable"}</span>
            <button data-action-id="computer.action" type="button" onClick={props.onComputerCapture}>
              <StudioControlIcon name="details" />Check screen
            </button>
          </div>
        </main>
      </section>
    </div>
  );
}

function buildDownloadReadyItems(input: { status: StudioStatus | null; config: StudioConfig | null }): Array<{ id: string; label: string; detail: string }> {
  return [
    { id: "version", label: "Engine package", detail: `${MEMOIRE_PACKAGE_NAME}@${MEMOIRE_PACKAGE_VERSION}` },
    { id: "dmg", label: "DMG", detail: expectedDmgPath(input.status) },
    { id: "icon", label: "Bundle icon", detail: "Mémoire flower assets in Tauri bundle metadata" },
    { id: "pack", label: "Package dry run", detail: "npm run pack:dry-run size gate" },
    { id: "build", label: "Release gates", detail: "Studio build, Tauri build, and check:release" },
    {
      id: "setup",
      label: "Setup saved",
      detail: input.config?.setup?.completedAt ? `completed ${input.config.setup.completedAt}` : "pending first-run wizard completion",
    },
  ];
}

type SettingsTone = "ok" | "warn" | "danger" | "neutral";

function SettingsTag({ children, tone = "neutral" }: { children: ReactNode; tone?: SettingsTone }) {
  return <span className="settings-tag" data-tone={tone}>{children}</span>;
}

function SettingsMetricCard(props: { icon: StudioControlIconName; label: string; value: string; detail?: string | null; tone?: SettingsTone }) {
  return (
    <article className="settings-metric-card" data-tone={props.tone ?? "neutral"} data-atomic-level="molecule">
      <span className="settings-row-icon"><StudioControlIcon name={props.icon} /></span>
      <span>{props.label}</span>
      <strong title={props.value}>{props.value}</strong>
      {props.detail ? <small title={props.detail}>{props.detail}</small> : null}
    </article>
  );
}

function fallbackHarnessSetupPlan(harness: {
  id: Harness["id"];
  label: string;
  installed: boolean;
  enabled: boolean;
  authStatus?: Harness["authStatus"];
  authMessage?: string | null;
  resolvedPath?: string | null;
  command?: string | null;
}): StudioHarnessSetupPlan {
  const command = harness.command ?? harness.id;
  const installed = Boolean(harness.installed);
  return {
    harnessId: harness.id,
    label: harness.label,
    status: installed ? "ready" : "needs_action",
    summary: installed ? "Ready" : `Install ${command}`,
    generatedAt: new Date(0).toISOString(),
    installed,
    enabled: harness.enabled,
    authStatus: harness.authStatus ?? (installed ? "ready" : "missing"),
    authMessage: harness.authMessage ?? (installed ? "Ready" : "Command not found"),
    resolvedPath: harness.resolvedPath ?? null,
    docsUrl: null,
    actions: installed ? [] : [{
      id: `${harness.id}-install`,
      label: `Install ${command}`,
      kind: "copy_command",
      required: true,
      description: `Install ${command}`,
      command: `Install ${command}`,
    }],
    requiredActionIds: installed ? [] : [`${harness.id}-install`],
  };
}

function normalizeCodexUiConfig(config: Partial<StudioCodexConfig> | null | undefined): StudioCodexConfig {
  return { ...DEFAULT_CODEX_UI_CONFIG, ...(config ?? {}) };
}

function normalizeUsageBudgetConfig(config: StudioConfig["usageBudgets"] | null | undefined): NonNullable<StudioConfig["usageBudgets"]> {
  return {
    warningThreshold: typeof config?.warningThreshold === "number" ? config.warningThreshold : 0.8,
    providers: config?.providers ?? {},
    harnesses: config?.harnesses ?? {},
  };
}

function numberInputValue(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function parseNullableNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMacOSPermissionActions(
  actions: StudioCompatibilityToolAction[] | undefined,
  permissions: StudioComputerStatus["permissions"],
): StudioCompatibilityToolAction[] {
  if (actions?.length) return actions;
  return [
    fallbackMacOSPermissionAction("accessibility", "Accessibility", "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility", permissions.accessibility),
    fallbackMacOSPermissionAction("screenRecording", "Screen Recording", "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture", permissions.screenRecording),
    fallbackMacOSPermissionAction("automation", "Automation", "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation", permissions.automation),
    fallbackMacOSPermissionAction("fileAccess", "Files and Folders", "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles", permissions.fileAccess),
    {
      id: "computer-refresh",
      label: "Refresh",
      kind: "refresh",
      required: false,
      description: "Refresh computer permission status.",
      permissionKind: "macos",
      permission: null,
      url: null,
      status: null,
    },
  ];
}

function fallbackMacOSPermissionAction(
  permission: NonNullable<StudioCompatibilityToolAction["permission"]>,
  label: string,
  url: string,
  status: NonNullable<StudioCompatibilityToolAction["status"]>,
): StudioCompatibilityToolAction {
  return {
    id: `computer-${permission.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
    label,
    kind: "open_url",
    required: status !== "granted" && status !== "not_applicable",
    description: `Open ${label} in macOS Privacy & Security settings.`,
    permissionKind: "macos",
    permission,
    url,
    status,
  };
}

function permissionIcon(permission: StudioCompatibilityToolAction["permission"] | null | undefined): StudioControlIconName {
  if (permission === "screenRecording") return "details";
  if (permission === "automation") return "automation";
  if (permission === "fileAccess") return "workspace";
  if (permission === "accessibility") return "access";
  return "refresh";
}

function permissionStatusLabel(status: StudioCompatibilityToolAction["status"] | null | undefined, required: boolean): string {
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  if (status === "not_applicable") return "skip";
  return required ? "needed" : "ready";
}

function permissionTone(status: StudioCompatibilityToolAction["status"] | null | undefined, required: boolean): SettingsTone {
  if (status === "granted" || status === "not_applicable") return "ok";
  if (status === "denied") return "danger";
  return required ? "warn" : "neutral";
}

function agentKitTargetForHarness(harnessId: Harness["id"]): AgentInstallTargetInput {
  if (harnessId === "claude-code") return "claude-code";
  if (harnessId === "codex") return "codex";
  if (harnessId === "opencode") return "opencode";
  if (harnessId === "hermes") return "hermes";
  return "all";
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
