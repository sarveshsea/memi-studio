// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Command palette: fuzzy action/navigation launcher.

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
import { harnessIcon } from "./icons";
import { isCoreHarness } from "./settings";

import { CommandPaletteIconGlyph } from "./icons";
import { type CommandPaletteIcon } from "./shared";
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
  onOpenDesignAudit: () => void;
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
    { id: "command.open.design-audit", kind: "navigation" as const, icon: "check" as const, label: "Design Health", detail: "Run memi's own design-quality audit on this workspace", run: props.onOpenDesignAudit },
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
