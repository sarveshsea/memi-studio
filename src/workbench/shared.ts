// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Pure utilities, shared types, and constants for the Studio workbench.
// Leaf module: no JSX and no imports from other workbench-* component
// modules, so every component module can import from here without cycles.

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

import { WORKBENCH_COPY } from "../workbench-copy";
import { MEMOIRE_PACKAGE_NAME, MEMOIRE_PACKAGE_VERSION, MEMOIRE_STUDIO_VERSION } from "../runtime/package-info";

export const OUTPUT_TABS = WORKBENCH_COPY.outputTabs;

export type OutputTabId = (typeof OUTPUT_TABS)[number]["id"];
export type TerminalBlockKind =
  | "run_context"
  | "command_trace"
  | "stdout_group"
  | "stderr_group"
  | "session_result"
  | "artifact_group"
  | "agentic_group"
  | "tool_pair"
  | "lifecycle";

export interface TerminalBlock {
  id: string;
  kind: TerminalBlockKind;
  title: string;
  meta: string;
  timestamp: string | null;
  messages: string[];
  data?: unknown;
  events: StudioEvent[];
}

export const ARTIFACT_EVENT_TYPES = new Set([
  "artifact",
  "design_system_artifact",
  "file_change",
  "screenshot",
  "design_artifact",
  "design_preview",
  "preview_ready",
  "figma_candidate",
  "spec_reference",
  "handoff_bundle",
  "marketplace_download",
  "token_usage",
  "video_project_created",
  "video_render_started",
  "video_render_completed",
  "video_render_failed",
]);

export const AGENTIC_EVENT_TYPES = new Set([
  "reasoning",
  "tool_call",
  "approval_request",
  "auth_state",
  "auth_status",
  "harness_log",
  "package_log",
  "terminal_command",
  "terminal_output",
  "research_capture",
  "research_code",
  "research_theme",
  "research_metric",
  "research_note",
  "design_decision",
]);

export interface WorkPacketStarter {
  label: string;
  description?: string;
  onSelect: () => void;
}

export function artifactCardsFromPacket(packet: StudioReviewPacket | null, events: StudioEvent[]): StudioWorkArtifact[] {
  if (packet?.artifacts.length) return packet.artifacts;
  return events
    .filter((event) => ["research_note", "design_decision", "artifact", "design_system_artifact", "file_change", "browser_snapshot", "screenshot", "session_result"].includes(event.type))
    .slice(-5)
    .reverse()
    .map((event) => ({
      id: `event-${event.id}`,
      kind: workArtifactKindFromEvent(event),
      title: trimText(event.message, 72),
      summary: event.message,
      body: event.message,
      status: "ready",
      confidence: null,
      eventIds: [event.id],
      fileRefs: [],
      artifactPath: null,
      visualPath: null,
      createdAt: event.timestamp,
      updatedAt: event.timestamp,
    }));
}

export interface ResearchSource {
  url: string;
  title: string;
  screenshotPath?: string | null;
}

export function researchSourcesFromEvents(events: StudioEvent[]): ResearchSource[] {
  const sources = new Map<string, ResearchSource>();
  for (const event of events) {
    const data = asEventRecord(event.data);
    const audit = asEventRecord(data.audit ?? data.evidence ?? data.result);
    const url = pickEventString(audit, "url") ?? pickEventString(data, "source") ?? pickEventString(data, "url");
    if (!url) continue;
    const title = pickEventString(audit, "title") ?? pickEventString(data, "title") ?? url;
    sources.set(url, {
      url,
      title,
      screenshotPath: pickEventString(audit, "screenshotPath") ?? pickEventString(data, "screenshotPath"),
    });
  }
  return Array.from(sources.values());
}

export function workArtifactKindFromEvent(event: StudioEvent): StudioWorkArtifactKind {
  const haystack = `${event.type} ${event.message}`.toLowerCase();
  if (/risk|blocked|unknown|mitigation/.test(haystack)) return "risk";
  if (event.type === "design_decision") return "decision";
  if (event.type === "screenshot" || event.type === "browser_snapshot") return "visual";
  if (event.type === "research_note") return "evidence";
  if (event.type === "artifact" || event.type === "design_system_artifact" || event.type === "file_change") return "spec";
  return "evidence";
}

export function workArtifactKindLabel(kind: StudioWorkArtifactKind): string {
  if (kind === "decision") return "Decision";
  if (kind === "visual") return "Visual";
  if (kind === "spec") return "Spec";
  if (kind === "risk") return "Risk";
  return "Evidence";
}

export function filterTerminalBlocksByQuery(blocks: TerminalBlock[], query: string): TerminalBlock[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return blocks;
  return blocks.filter((block) => `${block.title} ${block.meta} ${block.messages.join(" ")}`.toLowerCase().includes(normalized));
}

export function groupSessionsByProject(sessions: SessionSummary[]): Array<{ id: string; label: string; path: string; sessions: SessionSummary[] }> {
  const groups = new Map<string, { id: string; label: string; path: string; sessions: SessionSummary[] }>();
  for (const session of sessions) {
    const id = session.cwd || "workspace";
    const existing = groups.get(id);
    if (existing) {
      existing.sessions.push(session);
      continue;
    }
    groups.set(id, {
      id,
      label: displaySourceLabel(id).split("/").filter(Boolean).at(-1) ?? "workspace",
      path: id,
      sessions: [session],
    });
  }
  return Array.from(groups.values());
}

export type FormattedNode =
  | { kind: "p" | "li" | "heading"; text: string }
  | { kind: "ol"; text: string; order: number }
  | { kind: "task"; text: string; checked: boolean }
  | { kind: "quote"; text: string }
  | { kind: "codeblock"; text: string; language: string | null }
  | { kind: "table"; rows: string[][] };

export function isFigmaBridgeRunning(status: FigmaStatus | null): boolean {
  return status?.bridgeStatus === "running" || status?.running === true;
}

export function figmaStatusLabel(status: FigmaStatus | null): string {
  if (isFigmaPluginConnected(status)) return "Figma connected";
  if (isFigmaBridgeRunning(status)) return `Figma :${status?.port ?? "--"}`;
  return "Figma stopped";
}

export function expectedDmgPath(status: StudioStatus | null): string {
  const root = status?.projectRoot ?? "$PROJECT_ROOT";
  return `${root}/src-tauri/target/release/bundle/dmg/Mémoire Studio_${MEMOIRE_STUDIO_VERSION}_aarch64.dmg`;
}

export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function trimText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

export function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

export function firstMeaningfulLine(value: string): string {
  return value.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "Output";
}

export function filterContextItems(items: ProjectMemoryItem[], query: string, filter: string): ProjectMemoryItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  return items.filter((item) => {
    const haystack = `${item.title} ${item.summary} ${item.kind} ${item.status} ${item.tags.join(" ")} ${item.sourcePath}`.toLowerCase();
    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
    const matchesFilter = filter === "all" || outputItemMatches(filter, item, null);
    return matchesQuery && matchesFilter;
  });
}

export function filterKnowledgeItems(items: StudioKnowledgeItem[], query: string, filter: string): StudioKnowledgeItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  return items.filter((item) => {
    const haystack = `${item.title} ${item.summary} ${item.kind} ${item.status} ${item.tags.join(" ")} ${item.sourcePath}`.toLowerCase();
    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
    const matchesFilter = filter === "all" || item.kind === filter || item.tags.includes(filter);
    return matchesQuery && matchesFilter;
  });
}

export function deriveSessionStatus(session: SessionSummary | null, events: StudioEvent[]): SessionSummary["status"] | "standby" {
  if (!session) return "standby";
  let latestTerminal: StudioEvent | null = null;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type === "session_done" || event.type === "session_error") {
      latestTerminal = event;
      break;
    }
  }
  if (!latestTerminal) return session.status;
  if (latestTerminal.type === "session_error") return "failed";
  if (latestTerminal.message.toLowerCase().includes("cancel")) return "cancelled";
  return "completed";
}

export function isFigmaPluginConnected(status: FigmaStatus | null): boolean {
  return status?.pluginStatus === "connected" || status?.connectionState === "connected";
}

export function asEventRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function pickEventString(value: Record<string, unknown>, key: string): string | null {
  const candidate = value[key];
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

export function deriveOutputItems(
  tab: OutputTabId,
  memoryItems: ProjectMemoryItem[],
  artifactEvents: StudioEvent[],
  latestResult: StudioEvent | null,
): Array<{ id: string; title: string; meta: string; summary: string }> {
  const eventItems = artifactEvents
    .filter((event) => outputEventMatches(tab, event))
    .map((event) => ({
      id: event.id,
      title: eventLabel(event.type),
      meta: formatTime(event.timestamp),
      summary: event.message,
    }));
  const memoryOutputItems = memoryItems
    .filter((item) => outputItemMatches(tab, item, null))
    .map((item) => ({
      id: item.id,
      title: item.title,
      meta: item.kind,
      summary: item.summary || item.sourcePath,
    }));
  const resultItems = latestResult && tab === "handoff"
    ? [{ id: latestResult.id, title: "Session result", meta: "handoff", summary: latestResult.message }]
    : [];
  return [...eventItems, ...resultItems, ...memoryOutputItems];
}

export function outputEventMatches(tab: string, event: StudioEvent): boolean {
  const haystack = `${event.type} ${event.message}`.toLowerCase();
  if (tab === "screens") return /screenshot|design_preview|video/.test(haystack);
  if (tab === "components") return /component|file_change|artifact/.test(haystack);
  if (tab === "tokens") return /token/.test(haystack);
  if (tab === "specs") return /spec|artifact|file_change/.test(haystack);
  if (tab === "audit") return /audit|accessibility|wcag/.test(haystack);
  if (tab === "references") return /reference|refs|source/.test(haystack);
  if (tab === "handoff") return /handoff|result|export|patch/.test(haystack);
  return false;
}

export function outputItemMatches(tab: string, item: ProjectMemoryItem, _event: StudioEvent | null): boolean {
  const haystack = `${item.kind} ${item.title} ${item.summary} ${item.tags.join(" ")} ${item.sourcePath}`.toLowerCase();
  if (tab === "page" || tab === "screens") return /page|screen|preview|home|changelog/.test(haystack);
  if (tab === "component" || tab === "components") return /component|atom|molecule|organism|button|card/.test(haystack);
  if (tab === "token" || tab === "tokens") return /token|color|typography|spacing|radius/.test(haystack);
  if (tab === "specs") return item.kind === "spec" || /spec/.test(haystack);
  if (tab === "audit") return /audit|wcag|accessibility/.test(haystack);
  if (tab === "reference" || tab === "references") return /reference|source|refer/.test(haystack);
  if (tab === "markdown") return /\.mdx?$/i.test(item.sourcePath);
  if (tab === "yaml") return /\.ya?ml$/i.test(item.sourcePath);
  if (tab === "handoff") return /handoff|export|patch|result/.test(haystack);
  return false;
}

export function memoryFilterCounts(items: ProjectMemoryItem[]) {
  const labels = WORKBENCH_COPY.memoryFilters;
  return [
    { id: "all", label: labels.all, count: items.length },
    { id: "page", label: labels.page, count: items.filter((item) => /page|home|changelog/i.test(`${item.kind} ${item.tags.join(" ")}`)).length },
    { id: "component", label: labels.component, count: items.filter((item) => /component|atom|molecule|organism/i.test(`${item.title} ${item.tags.join(" ")}`)).length },
    { id: "token", label: labels.token, count: items.filter((item) => /token|color|type|spacing/i.test(`${item.title} ${item.tags.join(" ")}`)).length },
    { id: "reference", label: labels.reference, count: items.filter((item) => /reference|source|refer/i.test(`${item.title} ${item.tags.join(" ")} ${item.sourcePath}`)).length },
    { id: "markdown", label: labels.markdown, count: items.filter((item) => /\.mdx?$/i.test(item.sourcePath)).length },
    { id: "yaml", label: labels.yaml, count: items.filter((item) => /\.ya?ml$/i.test(item.sourcePath)).length },
  ];
}

export function knowledgeKindLabel(kind: StudioKnowledgeItem["kind"]): string {
  if (kind === "agent-capture") return "Captured";
  if (kind === "design-reference") return "Reference";
  return kind.replace(/^\w/, (char) => char.toUpperCase());
}

export function compactName(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? pathname;
}

export function activityGlyph(kind: StudioActivityItem["kind"]): string {
  if (kind === "thinking") return ".";
  if (kind === "reading_file") return "[]";
  if (kind === "searching") return "?";
  if (kind === "listing") return "=";
  if (kind === "writing_file") return "W";
  if (kind === "browser_action") return "B";
  if (kind === "figma_action") return "F";
  if (kind === "mcp_call") return "M";
  if (kind === "computer_action") return "C";
  if (kind === "using_tool") return "*";
  return ">";
}

export function activityMeta(activity: StudioActivityItem): string {
  const target = activity.targetPath ? displaySourceLabel(activity.targetPath) : null;
  const prefix = activity.kind === "reading_file"
    ? "read"
    : activity.kind === "searching"
      ? "search"
      : activity.kind === "listing"
        ? "list"
        : activity.kind === "writing_file"
          ? "write"
          : activity.kind === "running_command"
            ? "run"
            : activity.kind === "thinking"
              ? "think"
              : activity.kind === "browser_action"
                ? "browser"
                : activity.kind === "figma_action"
                  ? "figma"
                  : activity.kind === "mcp_call"
                    ? "mcp"
                    : activity.kind === "computer_action"
                      ? "computer"
                      : "tool";
  return [prefix, activity.status, target ?? trimText(activity.summary, 72)].filter(Boolean).join(" / ");
}

export function displaySourceLabel(sourcePath: string | null | undefined): string {
  if (!sourcePath) return "--";
  const normalized = sourcePath.replaceAll("\\", "/");
  const noteIndex = normalized.lastIndexOf("/notes/");
  if (noteIndex >= 0) return `notes/${compactName(normalized)}`;
  if (normalized.startsWith("notes/")) return `notes/${compactName(normalized)}`;
  const skillIndex = normalized.lastIndexOf("/skills/");
  if (skillIndex >= 0) return `skills/${compactName(normalized)}`;
  if (normalized.startsWith("skills/")) return `skills/${compactName(normalized)}`;
  if (normalized.startsWith(".memoire/")) return normalized.split("/").slice(-2).join("/");
  if (normalized.startsWith("preview/")) return normalized;
  if (normalized.startsWith("specs/")) return normalized.split("/").slice(-2).join("/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 2 ? parts.slice(-2).join("/") : normalized;
}

export function marketplaceSourceLabel(source: MarketplaceNotesPayload["notes"][number]["source"]): string {
  if (source === "community-catalog") return "Community";
  if (source === "local-fork") return "Fork";
  if (source === "remote-catalog") return "Remote";
  if (source === "installed-note") return "Installed";
  if (source === "built-in-note") return "Built in";
  if (source === "workspace-skill") return "Workspace";
  return "Skill";
}

export function marketplaceSourceBucket(note: MarketplaceNotesPayload["notes"][number]): string {
  if (note.source === "local-fork") return "forks";
  if (note.source === "community-catalog" || note.reviewStatus === "approved") return "community";
  if (note.installed) return "installed";
  if (note.builtIn) return "official";
  return "updates";
}

export function marketplaceNoteFreshness(note: MarketplaceNotesPayload["notes"][number]): string {
  if (note.freshnessStatus === "stale") return "Stale";
  if (note.freshnessStatus === "unverified") return "Unverified";
  if (!note.lastResearchedAt) return "Unverified";
  const researched = Date.parse(note.lastResearchedAt);
  if (!Number.isFinite(researched)) return "Unverified";
  const ageDays = Math.max(0, Math.floor((Date.now() - researched) / 86400000));
  const budget = note.freshnessDays ?? 90;
  return ageDays > budget ? "Stale" : `${ageDays}d fresh`;
}

export function eventLabel(type: string): string {
  return type.replace(/_/g, " ");
}

export function formatDataPreview(data: unknown): string {
  if (data === undefined || data === null) return "No data.";
  return JSON.stringify(data, null, 2);
}

export function formatLogPayload(event: StudioEvent): string {
  const preview = event.data === undefined ? "" : ` ${formatDataPreview(event.data)}`;
  return `${event.message}${preview}`.trim();
}

export async function copyText(value: string) {
  if (!value.trim()) return;
  await navigator.clipboard?.writeText(value).catch(() => undefined);
}
