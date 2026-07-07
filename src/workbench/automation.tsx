// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Automation center: scheduled automations list, template picker, run history.
// Imports only from leaf modules (shared, icons) and studio-api types.

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
import { CODEX_MODEL_OPTIONS, CODEX_REASONING_OPTIONS, normalizeCodexUiConfig } from "./settings";

import { formatAutomationDate } from "./shared";
const AUTOMATION_TEMPLATE_ORDER = [
  "design-system-audit",
  "figma-token-component-pull",
  "codex-app-build-review",
  "research-reference-refresh",
];
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
