// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Figma bridge driver panel and the figma action catalog.

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
const FIGMA_ACTIONS: Array<{ id: FigmaAction; label: string; primary?: boolean }> = [
  { id: "fullSync", label: "Full sync", primary: true },
  { id: "inspectSelection", label: "Inspect" },
  { id: "pullTokens", label: "Pull tokens" },
  { id: "pullComponents", label: "Pull components" },
  { id: "pullStickies", label: "Pull stickies" },
  { id: "captureScreenshot", label: "Screenshot" },
];

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
      {props.figmaError ? (
        <div className="figma-error" role="alert" data-status-accent="danger">
          <span>{props.figmaError}</span>
        </div>
      ) : null}
      <div className="driver-grid">
        <label htmlFor="figma-driver-port">
          <span>Port</span>
          <input
            id="figma-driver-port"
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
        <div className="figma-stat"><span className="figma-stat-value">{props.figmaStatus?.port ?? "--"}</span><span className="figma-stat-label">port</span></div>
        <div className="figma-stat"><span className="figma-stat-value">{props.figmaStatus?.clients.length ?? 0}</span><span className="figma-stat-label">clients</span></div>
        <div
          className="figma-stat"
          data-status-accent={bridgeState === "running" ? "ok" : bridgeState === "failed" ? "danger" : "warn"}
        >
          <span className="figma-stat-value">{props.figmaStatus?.bridgeStatus ?? "stopped"}</span>
          <span className="figma-stat-label">bridge</span>
        </div>
        <div className="figma-stat"><span className="figma-stat-value">{lastSync}</span><span className="figma-stat-label">last sync</span></div>
      </div>
      <div className="figma-clients">
        {(props.figmaStatus?.clients ?? []).map((client) => (
          <article key={client.id}>
            <strong>{client.file || client.id}</strong>
            <span>{client.editor} · {client.lastPing ?? client.connectedAt}</span>
          </article>
        ))}
        {props.figmaStatus?.clients.length === 0 ? (
          <div className="pane-empty-state" data-empty-variant="compact">
            <h3>No clients connected</h3>
            <p>Start the bridge and open your Figma file to connect.</p>
            <div className="pane-empty-state-actions">
              <button className="primary" data-action-id="figma.connect.empty-state" type="button" onClick={props.onConnect} disabled={bridgeButtonDisabled}>
                {bridgeButtonLabel}
              </button>
            </div>
          </div>
        ) : null}
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
        <div className="figma-action-result">
          <p className="figma-action-result-label">Last action result</p>
          <pre>{formatDataPreview(props.figmaActionResult).slice(0, 1800)}</pre>
        </div>
      ) : null}
      <div className="settings-actions">
        <span>{props.settingsSavedAt ? `saved ${props.settingsSavedAt}` : "local settings"}</span>
      </div>
    </section>
  );
}
