// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Studio settings panel: harness setup, codex configuration, usage budgets,
// macOS permissions, and release/download readiness. Codex constants and a few
// pure helpers are shared with other panels and re-exported via the barrel.

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
import { CommandPaletteIconGlyph, harnessIcon } from "./icons";
import { formatAutomationDate } from "./shared";

export const DEFAULT_CODEX_UI_CONFIG: StudioCodexConfig = {
  model: "gpt-5.5",
  reasoningEffort: "xhigh",
  approvalPolicy: "never",
  webSearch: true,
  skipGitRepoCheck: true,
  includeMemoireCommands: true,
  includeCodexCommands: true,
  planModeDefault: false,
};
export const CODEX_MODEL_OPTIONS = ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.3-codex"] as const;
export const CODEX_REASONING_OPTIONS: Array<{ id: StudioCodexReasoningEffort; label: string }> = [
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
export function isCoreHarness(id: Harness["id"]): boolean {
  return isPrimaryHarness(id);
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

export type SettingsTone = "ok" | "warn" | "danger" | "neutral";

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

export function normalizeCodexUiConfig(config: Partial<StudioCodexConfig> | null | undefined): StudioCodexConfig {
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

export function fallbackMacOSPermissionAction(
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
