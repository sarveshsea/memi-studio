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
import { projectSessionNavItem } from "./workbench/sidebar";
import { compactStatusLabel, deriveChatFollowUps, deriveVerificationSignals } from "./workbench/shared";
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

// Re-export the automation center so the public surface is unchanged.
export { AutomationCenter } from "./workbench/automation";

// Re-export the command palette so the public surface is unchanged.
export { CommandPalette } from "./workbench/command-palette";

// Re-export the figma driver so the public surface is unchanged.
export { FigmaDriver } from "./workbench/figma";

// Re-export the work packet pane so the public surface is unchanged.
export { WorkPacketPane } from "./workbench/work-packet";


// Re-export the project sidebar so the public surface is unchanged.
export { ProjectSidebar } from "./workbench/sidebar";
