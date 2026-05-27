// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type ClipboardEvent, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import {
  cancelSession,
  resolveApproval,
  callStudioTool,
  callComputerAction,
  canRestartStudioRuntime,
  captureAttachment,
  captureDesignSystemArtifact,
  captureReviewPacket,
  archiveDesignChangelogEntry,
  connectFigma,
  createAutomation,
  createDesignChangelogEntry,
  deleteAutomation,
  diagnoseHarness,
  disconnectFigma,
  exportDesignChangelogMarkdown,
  exportNoteForkPr,
  forkMarketplaceNote,
  getAutomationSchedulerStatus,
  getAutomationTemplates,
  getBrowserStatus,
  getCompatibility,
  getComputerStatus,
  getDesignSystemTrace,
  getFigmaStatus,
  getKnowledgeIndex,
  getMarketplaceNotes,
  getNoteForkDiff,
  getNoteForkFiles,
  getKnowledgeItem,
  getProjectMemory,
  getProjectMemoryItem,
  getRuntimeMetrics,
  getSessionEvents,
  getSessionTrace,
  getStatus,
  getUsageSnapshot,
  installAutomationScheduler,
  installAgentKit,
  installMarketplaceNote,
  listAutomationRuns,
  listAutomations,
  listDesignChangelogEntries,
  listDesignSystemArtifacts,
  listNoteForks,
  listReviewPackets,
  listSessions,
  effortOptionsForRegistry,
  listHarnessModels,
  listHarnesses,
  listStudioTools,
  openComputerTarget,
  openFigma,
  openMermaidJamIntegration,
  refreshKnowledgeIndex,
  refreshProjectMemory,
  removeMarketplaceNote,
  restoreDesignChangelogEntry,
  runFigmaAction,
  restartStudioRuntime,
  saveConfig,
  createWorkspace,
  getWorkspacePermissions,
  listRecentWorkspaces,
  openWorkspace,
  startSession,
  subscribeDownloadEvents,
  subscribeSession,
  updateNoteForkFile,
  validateNoteFork,
  reviewDesignSystemArtifactSection,
  runAutomationNow,
  uninstallAutomationScheduler,
  updateAutomation,
  updateDesignChangelogEntry,
  exportReviewPacketMarkdown,
  type DesignChangelogCreateInput,
  type DesignChangelogEntry,
  type DesignChangelogPatchInput,
  type DesignSystemArtifact,
  type FigmaAction,
  type FigmaActionRequest,
  type FigmaActionResult,
  type FigmaStatus,
  type Harness,
  type HarnessId,
  type HarnessModelRegistry,
  type StudioEffort,
  type MermaidBoard,
  type MermaidBoardExport,
  type MermaidBoardNodeKind,
  type MarketplaceNotesPayload,
  type NoteForkDiff,
  type NoteForkFile,
  type NoteForkPrHandoff,
  type NoteForkSummary,
  type NoteForkValidation,
  type ProjectMemoryIndex,
  type ProjectMemoryItem,
  type SessionSummary,
  type StudioAction,
  type StudioAutomationDefinition,
  type StudioAutomationRun,
  type StudioAutomationSchedulerStatus,
  type StudioAutomationTemplate,
  type StudioChatMode,
  type StudioCompatibilitySnapshot,
  type StudioConfig,
  type StudioCodexReasoningEffort,
  type StudioBrowserStatus,
  type StudioComputerStatus,
  type StudioDesignSystemTrace,
  type StudioDesignSystemTraceFile,
  type StudioEvent,
  type StudioInputMode,
  type StudioKnowledgeIndex,
  type StudioKnowledgeItem,
  type StudioPermissionMode,
  type StudioReviewPacket,
  type StudioRuntimeMetrics,
  type StudioStatus,
  type StudioToolDefinition,
  type StudioToolCallResult,
  type StudioTraceSnapshot,
  type StudioUsageSnapshot,
  type StudioRecentWorkspace,
  type StudioWorkspacePermissions,
  type StudioAttachment,
  type StudioAttachmentSource,
  type StudioActiveProcess,
  type StudioActivityItem,
  type StudioDownloadJob,
  type AgentInstallTargetInput,
} from "./studio-api";
import { deriveStudioTrace, type StudioTraceModel } from "./runtime/index.js";
import {
  CommandBar,
  TerminalBlock as TerminalBlockSurface,
} from "./studio-primitives";
import {
  mergeDesignArtifacts,
  selectDesignArtifactsForSession,
  selectReviewPacketForSession,
} from "./workbench-context";
import {
  BlockBody,
  AttachmentShelf,
  AutomationCenter,
  ChangedFilesPanel,
  CommandPalette,
  ContextRail,
  CreationStrip,
  DesignChangelogPage,
  DesignSystemReviewSurface,
  FigmaDriver,
  MemoireLogoMark,
  ProjectSidebar,
  SettingsPanel,
  StudioControlIcon,
  WorkPacketPane,
  ActionChip,
  IconButton,
  buildTerminalBlocks,
  copyText,
  deriveSessionStatus,
  filterTerminalBlocksByQuery,
  filterContextItems,
  filterKnowledgeItems,
  formatTime,
  isFigmaBridgeRunning,
  researchSourcesFromEvents,
  trimText,
  type TerminalBlock,
} from "./workbench-components";
import { hydrateMermaidBoardAgentSurface } from "./mermaid-board-contract";
import type { IASurfaceProps } from "./ia-surface";
import type { MermaidBoardSurfaceProps } from "./mermaid-board-surface";
import { SLASH_COMMANDS, applySlashCommand, filterSlashCommands, slashCommandPreview, type SlashCommand } from "./slash-commands";
import {
  CRITIQUE_SCREEN_STARTER_LABEL,
  WORKBENCH_COPY,
  buildCritiqueScreenPrompt,
  buildCritiqueScreenUnavailablePrompt,
  workbenchAction,
  type WorkbenchIconName,
} from "./workbench-copy";
import {
  DEFAULT_COMPOSER_STATE,
  DEFAULT_PRIMARY_HARNESS_ID,
  DEFAULT_RIGHT_PANE_TAB_IDS,
  composerStateForSession,
  composerHarnessShortLabel,
  composerSwitcherHarnesses,
  composerHarnessTier,
  composerStarterAction,
  compactRunLabel,
  compactRunSpineRows,
  compactRunSummary,
  defaultWorkbenchSession,
  isQueueDockSession,
  modePresetIdForComposerState,
  normalizeComposerHarness,
  normalizePrimaryHarness,
  normalizeRightPaneTab,
  researchLabHarness,
  type WorkbenchRightPaneTab,
} from "./studio-workbench";

const MermaidBoardSurface = lazy(() => import("./mermaid-board-surface"));
const IASurface = lazy(() => import("./ia-surface"));

const STARTER_PROMPTS = WORKBENCH_COPY.starterPrompts;
const DEFAULT_COMPOSER_STARTERS = STARTER_PROMPTS.slice(0, 3);
const MODE_PRESETS = WORKBENCH_COPY.modePresets;
const ACTIONS: Array<{ id: StudioAction; label: string }> = WORKBENCH_COPY.actions.map((action) => ({ ...action }));
const CHAT_MODES: Array<{ id: StudioChatMode; label: string }> = WORKBENCH_COPY.chatModes.map((mode) => ({ ...mode }));
const PERMISSION_MODES: Array<{ id: StudioPermissionMode; label: string }> = WORKBENCH_COPY.permissionModes.map((mode) => ({ ...mode }));
const DESIGN_LANE_ACTIONS = new Set<StudioAction>([
  "audit",
  "browser-audit",
  "design-doc",
  "handoff",
  "self-design",
]);

type RightPaneTab = WorkbenchRightPaneTab;
type RuntimeHealth = "offline" | "starting" | "ready" | "degraded";
type TruthStripStatus = "ready" | "warn" | "missing" | "unknown";
type DesignerReadinessStatus = "ready" | "warn" | "missing";
type ScenarioLabNodeKind = "agent" | "finding" | "variable" | "outcome";

interface TruthStripItemModel {
  id: string;
  label: string;
  detail: string;
  status: TruthStripStatus;
  title?: string;
}

interface DesignerReadinessItem {
  id: string;
  label: string;
  detail: string;
  status: DesignerReadinessStatus;
}

interface PaneIntent {
  tab: RightPaneTab;
  reason: string;
  confidence: number;
  sourceEventId?: string;
  highlightIds?: string[];
}

interface ScenarioModelProfile {
  id: string;
  label: string;
  provider: string;
  model: string;
  available: boolean;
  notes?: string[];
}

interface ScenarioTranscriptItem {
  id: string;
  agentId?: string | null;
  modelProfileId: string;
  response: string;
}

interface ScenarioMatrixRunItem {
  hypothesis?: string;
  run?: {
    id: string;
    status: string;
    eventCount: number;
    rounds?: unknown[];
    transcripts?: ScenarioTranscriptItem[];
    costs?: { inputTokens?: number; outputTokens?: number; estimatedCostUsd?: number };
    scorecard?: { adoption?: number; resistance?: number; confidence?: number; risk?: number };
  };
}

interface ScenarioMatrixState {
  runs: ScenarioMatrixRunItem[];
  comparison?: { winnerRunId?: string | null; summary?: string };
}

interface ScenarioDesignPackage {
  id: string;
  brief?: {
    audience?: string[];
    vibePrinciples?: string[];
    visualDirection?: string[];
    openQuestions?: string[];
  };
  specs?: {
    design?: unknown[];
    ia?: unknown[];
    pages?: unknown[];
    components?: unknown[];
    dataviz?: unknown[];
  };
  mermaidArtifacts?: Array<{ id: string; title: string; kind: string; format: string }>;
  warnings?: string[];
}

interface ScenarioFigJamExport {
  id: string;
  title: string;
  kind: string;
  format: string;
  outputPath: string;
  nextSteps?: string[];
}

interface HarnessStudySummary {
  harnessId: string;
  label: string;
  available: boolean;
  model?: string | null;
  provider?: string | null;
  memoireSkillInstalled?: boolean;
  toolsets?: { enabled?: string[]; disabled?: string[] };
  sessions?: { total?: number | null; messages?: number | null; recentPreviews?: string[] };
  recommendations?: string[];
}

interface ResearchPatternSummary {
  id: string;
  title: string;
  category: string;
  sourceHarness: string;
  summary: string;
  confidence: string;
  prompts?: string[];
}

interface ScenarioLabNode extends SimulationNodeDatum {
  id: string;
  label: string;
  kind: ScenarioLabNodeKind;
}

interface PositionedScenarioLabNode extends ScenarioLabNode {
  x: number;
  y: number;
}

type InspectorSelection =
  | { kind: "activity"; id: string }
  | { kind: "process"; id: string }
  | { kind: "file"; path: string }
  | { kind: "artifact"; id: string }
  | { kind: "approval"; eventId: string }
  | { kind: "event"; id: string };

type DesignLaneState = {
  active: boolean;
  hasDesignSystem: boolean;
  hasFigma: boolean;
  hasFigJam: boolean;
  needsFigmaSetup: boolean;
  reason: string;
};

type RunSpineReceiptModel = {
  id: string;
  label: string;
  status: "done" | "idle" | "running" | "warn";
  title?: string;
  fields: Array<{ label: string; value: string }>;
  onSelect?: () => void;
};

const RIGHT_PANE_TAB_GROUPS = ["primary", "utility"] as const;
type RightPaneTabDefinition = { id: RightPaneTab; label: string; shortLabel?: string; group: typeof RIGHT_PANE_TAB_GROUPS[number]; icon?: WorkbenchIconName; iconOnly?: boolean };
const ALL_RIGHT_PANE_TABS: RightPaneTabDefinition[] = WORKBENCH_COPY.rightPaneTabs.map((tab) => ({ ...tab }));
const DEFAULT_RIGHT_PANE_TABS = ALL_RIGHT_PANE_TABS
  .filter((tab) => DEFAULT_RIGHT_PANE_TAB_IDS.includes(normalizeRightPaneTab(tab.id) as typeof DEFAULT_RIGHT_PANE_TAB_IDS[number]));

const SCENARIO_TOOL_IDS = ["harness.study", "research.patterns.extract", "research.patterns.list", "simulation.models", "simulation.run_matrix", "simulation.transcript", "research.design_package", "mermaid_jam.export"] as const;
const CORE_MERMAID_BOARD_TOOL_IDS = ["board.create", "board.add_node", "board.update_node", "board.connect", "board.layout", "board.capture_ia", "board.export_mermaid_jam"] as const;
const PM_MERMAID_BOARD_TOOL_IDS = ["board.apply_template", "board.sync_figjam"] as const;
const MERMAID_SOURCE_TOOL_IDS = ["research.design_package", "mermaid_jam.export"] as const;
const MERMAID_BOARD_RUNTIME_UNAVAILABLE = WORKBENCH_COPY.mermaidRuntime.unavailable;
const MERMAID_BOARD_PM_RUNTIME_STALE = WORKBENCH_COPY.mermaidRuntime.pmRuntimeStale;
const LIVE_EVENT_LIMIT = 220;
const SESSION_EVENT_LIMIT = 120;
const TRACE_REFRESH_DELAY_MS = 350;
const WORKTREE_TRACE_REFRESH_MS = 12_000;
const PROJECT_SIDEBAR_COLLAPSED_KEY = "memoire.studio.projectSidebarCollapsed";
const PROJECT_SIDEBAR_EXPANDED_KEY = "memoire.studio.expandedProjectIds";
const CHAT_RAIL_WIDTH_KEY = "memoire.studio.chatRailWidthPercent";
const CHAT_MEMORY_PINS_KEY = "memoire.studio.chatMemoryPins";
const DEFAULT_CHAT_RAIL_WIDTH_PERCENT = 48;
const MIN_CHAT_RAIL_WIDTH_PERCENT = 36;
const MAX_CHAT_RAIL_WIDTH_PERCENT = 68;

interface StudioActionRegistryItem {
  id: string;
  label: string;
  kind: "local" | "runtime";
  surface: "topbar" | "command" | "cockpit" | "context" | "figma" | "settings" | "computer" | "changelog" | "board";
}

const STUDIO_ACTION_REGISTRY: StudioActionRegistryItem[] = [
  ...WORKBENCH_COPY.actionRegistry.map((item) => ({ ...item } as StudioActionRegistryItem)),
];

function isDesignLaneAction(action: StudioAction): boolean {
  return DESIGN_LANE_ACTIONS.has(action);
}

function isDesignLanePrompt(value: string): boolean {
  return /\b(design system|design-system|figma|figjam|tokens?|components?|style guide|brand|typography|spacing|accessibility|handoff|screen|mockup|wireframe|prototype|shadcn|tailwind|visual|motion)\b/i.test(value);
}

export function App() {
  const scrollRegionRef = useRef<HTMLElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const latestScrollRestoringRef = useRef(false);
  const scrollRetryTimeoutsRef = useRef<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const traceRefreshTimerRef = useRef<number | null>(null);
  const pendingTraceSessionIdRef = useRef<string | null>(null);
  const harnessReadinessRefreshAttemptsRef = useRef(0);
  const runtimeStartupRefreshInFlightRef = useRef(false);
  const runtimeReadyHydrationRef = useRef<string | null>(null);
  const worktreeTraceRefreshInFlightRef = useRef(false);
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [harnesses, setHarnesses] = useState<Harness[]>([]);
  const [selectedHarness, setSelectedHarness] = useState<HarnessId>(DEFAULT_PRIMARY_HARNESS_ID);
  const [selectedAction, setSelectedAction] = useState<StudioAction>(DEFAULT_COMPOSER_STATE.action);
  const [chatMode, setChatMode] = useState<StudioChatMode>(DEFAULT_COMPOSER_STATE.chatMode);
  const [permissionMode, setPermissionMode] = useState<StudioPermissionMode>(DEFAULT_COMPOSER_STATE.permissionMode);
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");
  const [inputMode, setInputMode] = useState<StudioInputMode>("agent");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState("Setup");
  const [automationsOpen, setAutomationsOpen] = useState(false);
  const [automations, setAutomations] = useState<StudioAutomationDefinition[]>([]);
  const [automationTemplates, setAutomationTemplates] = useState<StudioAutomationTemplate[]>([]);
  const [automationRuns, setAutomationRuns] = useState<Record<string, StudioAutomationRun[]>>({});
  const [automationScheduler, setAutomationScheduler] = useState<StudioAutomationSchedulerStatus | null>(null);
  const [automationBusyId, setAutomationBusyId] = useState<string | null>(null);
  const [marketplaceNotes, setMarketplaceNotes] = useState<MarketplaceNotesPayload | null>(null);
  const [marketplaceBusyId, setMarketplaceBusyId] = useState<string | null>(null);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [marketplaceDownloadJobs, setMarketplaceDownloadJobs] = useState<Record<string, StudioDownloadJob>>({});
  const [selectedMarketplaceNoteId, setSelectedMarketplaceNoteId] = useState<string | null>(null);
  const [noteForks, setNoteForks] = useState<NoteForkSummary[]>([]);
  const [selectedNoteForkId, setSelectedNoteForkId] = useState<string | null>(null);
  const [noteForkFiles, setNoteForkFiles] = useState<NoteForkFile[]>([]);
  const [selectedNoteForkFile, setSelectedNoteForkFile] = useState<string | null>(null);
  const [noteForkValidation, setNoteForkValidation] = useState<NoteForkValidation | null>(null);
  const [noteForkDiff, setNoteForkDiff] = useState<NoteForkDiff | null>(null);
  const [noteForkPrHandoff, setNoteForkPrHandoff] = useState<NoteForkPrHandoff | null>(null);
  const [designChangelogEntries, setDesignChangelogEntries] = useState<DesignChangelogEntry[]>([]);
  const [designChangelogLoading, setDesignChangelogLoading] = useState(false);
  const [designChangelogError, setDesignChangelogError] = useState<string | null>(null);
  const [reviewPackets, setReviewPackets] = useState<StudioReviewPacket[]>([]);
  const [reviewPacketError, setReviewPacketError] = useState<string | null>(null);
  const [studioTools, setStudioTools] = useState<StudioToolDefinition[]>([]);
  const [browserStatus, setBrowserStatus] = useState<StudioBrowserStatus | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatMemoryPins, setChatMemoryPins] = useState<string[]>(() => readStringArrayPreference(CHAT_MEMORY_PINS_KEY).slice(0, 6));
  const [contextQuery, setContextQuery] = useState("");
  const [contextFilter, setContextFilter] = useState("all");
  const [prompt, setPrompt] = useState("");
  const [slashCommandIndex, setSlashCommandIndex] = useState(0);
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversationGoal, setConversationGoal] = useState<string>("");
  const [goalEditorOpen, setGoalEditorOpen] = useState(false);
  const [queuedPrompt, setQueuedPrompt] = useState<string>("");
  const [startingPrompt, setStartingPrompt] = useState<string>("");
  const [runBlockedMessage, setRunBlockedMessage] = useState<string | null>(null);
  const [harnessModelRegistries, setHarnessModelRegistries] = useState<Record<string, HarnessModelRegistry>>({});
  const [selectedModelByHarness, setSelectedModelByHarness] = useState<Record<string, string>>({});
  const [selectedEffort, setSelectedEffort] = useState<StudioEffort | null>(null);
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [serverTrace, setServerTrace] = useState<StudioTraceSnapshot | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runtimeHealth, setRuntimeHealth] = useState<RuntimeHealth>("starting");
  const [runtimeRecoveryMessage, setRuntimeRecoveryMessage] = useState<string | null>(null);
  const [runtimeMetrics, setRuntimeMetrics] = useState<StudioRuntimeMetrics | null>(null);
  const [usageSnapshot, setUsageSnapshot] = useState<StudioUsageSnapshot | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [projectMemory, setProjectMemory] = useState<ProjectMemoryIndex | null>(null);
  const [knowledgeIndex, setKnowledgeIndex] = useState<StudioKnowledgeIndex | null>(null);
  const [compatibility, setCompatibility] = useState<StudioCompatibilitySnapshot | null>(null);
  const [computerStatus, setComputerStatus] = useState<StudioComputerStatus | null>(null);
  const [designTrace, setDesignTrace] = useState<StudioDesignSystemTrace | null>(null);
  const [designArtifacts, setDesignArtifacts] = useState<DesignSystemArtifact[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [researchSource, setResearchSource] = useState("research-store");
  const [scenarioHypothesis, setScenarioHypothesis] = useState("Research-backed spec changes reduce product risk.");
  const [scenarioVariable, setScenarioVariable] = useState("Evidence strength");
  const [selectedScenarioNode, setSelectedScenarioNode] = useState("agent-pm");
  const [scenarioModels, setScenarioModels] = useState<ScenarioModelProfile[]>([]);
  const [harnessStudy, setHarnessStudy] = useState<HarnessStudySummary | null>(null);
  const [researchPatterns, setResearchPatterns] = useState<ResearchPatternSummary[]>([]);
  const [scenarioMatrix, setScenarioMatrix] = useState<ScenarioMatrixState | null>(null);
  const [scenarioTranscripts, setScenarioTranscripts] = useState<ScenarioTranscriptItem[]>([]);
  const [scenarioDesignPackage, setScenarioDesignPackage] = useState<ScenarioDesignPackage | null>(null);
  const [scenarioFigJamExports, setScenarioFigJamExports] = useState<ScenarioFigJamExport[]>([]);
  const [scenarioRunning, setScenarioRunning] = useState(false);
  const [rightPaneTab, setRightPaneTab] = useState<RightPaneTab>("run");
  const [rightPaneUserLocked, setRightPaneUserLocked] = useState(false);
  const [paneIntent, setPaneIntent] = useState<PaneIntent | null>(null);
  const [inspectorSelection, setInspectorSelection] = useState<InspectorSelection | null>(null);
  const [mermaidBoard, setMermaidBoard] = useState<MermaidBoard | null>(null);
  const [mermaidBoardExports, setMermaidBoardExports] = useState<MermaidBoardExport[]>([]);
  const [mermaidBoardLoading, setMermaidBoardLoading] = useState(false);
  const [mermaidBoardError, setMermaidBoardError] = useState<string | null>(null);
  const [iaBoard, setIaBoard] = useState<MermaidBoard | null>(null);
  const [iaBoardExports, setIaBoardExports] = useState<MermaidBoardExport[]>([]);
  const [iaBoardLoading, setIaBoardLoading] = useState(false);
  const [iaBoardError, setIaBoardError] = useState<string | null>(null);
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [knowledgeFilter, setKnowledgeFilter] = useState("all");
  const [figmaStatus, setFigmaStatus] = useState<FigmaStatus | null>(null);
  const [figmaActionResult, setFigmaActionResult] = useState<FigmaActionResult | null>(null);
  const [figmaConnecting, setFigmaConnecting] = useState(false);
  const [figmaActionRunning, setFigmaActionRunning] = useState(false);
  const [figmaError, setFigmaError] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<StudioConfig | null>(null);
  const [settingsSavedAt, setSettingsSavedAt] = useState<string | null>(null);
  const [recentWorkspaces, setRecentWorkspaces] = useState<StudioRecentWorkspace[]>([]);
  const [workspacePermissions, setWorkspacePermissions] = useState<StudioWorkspacePermissions | null>(null);
  const [selectedContextItem, setSelectedContextItem] = useState<ProjectMemoryItem | null>(null);
  const [contextItemDetail, setContextItemDetail] = useState<ProjectMemoryItem | null>(null);
  const [selectedKnowledgeItem, setSelectedKnowledgeItem] = useState<StudioKnowledgeItem | null>(null);
  const [knowledgeItemDetail, setKnowledgeItemDetail] = useState<StudioKnowledgeItem | null>(null);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(new Set());
  const [userPinnedToBottom, setUserPinnedToBottom] = useState(true);
  const [attachments, setAttachments] = useState<StudioAttachment[]>([]);
  const [projectSidebarCollapsed, setProjectSidebarCollapsed] = useState(() =>
    readBooleanPreference(PROJECT_SIDEBAR_COLLAPSED_KEY, typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches),
  );
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>(() => readStringArrayPreference(PROJECT_SIDEBAR_EXPANDED_KEY));
  const [chatRailWidthPercent, setChatRailWidthPercent] = useState(() =>
    readNumberPreference(CHAT_RAIL_WIDTH_KEY, DEFAULT_CHAT_RAIL_WIDTH_PERCENT, MIN_CHAT_RAIL_WIDTH_PERCENT, MAX_CHAT_RAIL_WIDTH_PERCENT),
  );

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => {
      if (event.key === "," && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSettingsOpen(true);
      }
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        openCommandPalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (traceRefreshTimerRef.current !== null) window.clearTimeout(traceRefreshTimerRef.current);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PROJECT_SIDEBAR_COLLAPSED_KEY, JSON.stringify(projectSidebarCollapsed));
  }, [projectSidebarCollapsed]);

  useEffect(() => {
    window.localStorage.setItem(PROJECT_SIDEBAR_EXPANDED_KEY, JSON.stringify(expandedProjectIds));
  }, [expandedProjectIds]);

  useEffect(() => {
    window.localStorage.setItem(CHAT_RAIL_WIDTH_KEY, JSON.stringify(chatRailWidthPercent));
  }, [chatRailWidthPercent]);

  useEffect(() => {
    window.localStorage.setItem(CHAT_MEMORY_PINS_KEY, JSON.stringify(chatMemoryPins.slice(0, 6)));
  }, [chatMemoryPins]);

  useEffect(() => {
    if (!isFigmaBridgeRunning(figmaStatus)) return;
    const timer = window.setInterval(() => {
      void getFigmaStatus()
        .then(setFigmaStatus)
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [figmaStatus?.bridgeStatus, figmaStatus?.running]);

  useEffect(() => {
    const notes = marketplaceNotes?.notes ?? [];
    if (notes.length === 0) {
      if (selectedMarketplaceNoteId) setSelectedMarketplaceNoteId(null);
      return;
    }
    if (!selectedMarketplaceNoteId || !notes.some((note) => note.id === selectedMarketplaceNoteId)) {
      setSelectedMarketplaceNoteId(notes[0].id);
    }
  }, [marketplaceNotes, selectedMarketplaceNoteId]);

  useEffect(() => {
    if (noteForkFiles.length === 0) {
      if (selectedNoteForkFile) setSelectedNoteForkFile(null);
      return;
    }
    if (!selectedNoteForkFile || !noteForkFiles.some((file) => file.path === selectedNoteForkFile)) {
      setSelectedNoteForkFile(noteForkFiles[0].path);
    }
  }, [noteForkFiles, selectedNoteForkFile]);

  useEffect(() => {
    if (!queuedPrompt.trim()) return;
    if (!session || session.status !== "completed") return;
    if (isStartingSession) return;
    const text = queuedPrompt.trim();
    setQueuedPrompt("");
    void runWithPrompt(text, { conversationIdOverride: session.conversationId ?? session.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedPrompt, isStartingSession, session?.status]);

  useEffect(() => {
    if (harnessModelRegistries[selectedHarness]) return;
    let cancelled = false;
    void listHarnessModels(selectedHarness)
      .then((registry) => {
        if (cancelled) return;
        setHarnessModelRegistries((current) => ({ ...current, [selectedHarness]: registry }));
        setSelectedModelByHarness((current) => {
          if (current[selectedHarness] || !registry.defaultModelId) return current;
          return { ...current, [selectedHarness]: registry.defaultModelId };
        });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [selectedHarness, harnessModelRegistries]);

  const liveSessionSubscriptionKey = useMemo(() => {
    return uniqueSessions([session, ...recentSessions])
      .filter(isLiveRuntimeSession)
      .map((candidate) => candidate.id)
      .sort()
      .join("|");
  }, [recentSessions, session]);

  useEffect(() => {
    const liveSessions = uniqueSessions([session, ...recentSessions]).filter(isLiveRuntimeSession);
    if (liveSessions.length === 0) return;
    const unsubscribers = liveSessions.map((liveSession) =>
      subscribeSession(liveSession.id, (event) => {
        const nextStatus = statusFromSessionEvent(event);
        setRecentSessions((current) => updateSessionSummaryCollection(current, event, nextStatus));
        setSession((current) => current && current.id === event.sessionId ? updateSessionSummary(current, event, nextStatus) : current);
        if (event.sessionId === session?.id) {
          setEvents((current) => [...current, event].slice(-LIVE_EVENT_LIMIT));
          scheduleSessionTraceRefresh(event.sessionId);
          if (["token_usage", "session_error", "stderr", "session_done"].includes(event.type)) {
            void refreshUsageSnapshot();
          }
          if (["artifact", "design_system_artifact", "design_decision", "session_done"].includes(event.type)) {
            window.setTimeout(() => {
              void listDesignSystemArtifacts().then(updateDesignArtifacts).catch(() => undefined);
              void listReviewPackets().then(setReviewPackets).catch(() => undefined);
            }, TRACE_REFRESH_DELAY_MS);
          }
        }
      }),
    );
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [liveSessionSubscriptionKey, session?.id]);

  const currentHarness = useMemo(
    () => harnesses.find((harness) => harness.id === selectedHarness),
    [harnesses, selectedHarness],
  );
  const codexHarness = useMemo(() => harnesses.find((harness) => harness.id === "codex"), [harnesses]);
  const claudeHarness = useMemo(() => harnesses.find((harness) => harness.id === "claude-code"), [harnesses]);
  const visibleHarnesses = useMemo(() => composerSwitcherHarnesses(harnesses), [harnesses]);
  const researchStudyHarness = useMemo(() => researchLabHarness(harnesses, selectedHarness), [harnesses, selectedHarness]);

  const harnessActions = useMemo(() => actionsForHarness(currentHarness), [currentHarness]);
  const effectiveAction: StudioAction = resolveHarnessAction(selectedAction, currentHarness);
  const effectiveActionLabel = harnessActions.find((action) => action.id === effectiveAction)?.label ?? effectiveAction;
  const activeChatModeLabel = CHAT_MODES.find((mode) => mode.id === chatMode)?.label ?? chatMode;
  const activePermissionModeLabel = PERMISSION_MODES.find((mode) => mode.id === permissionMode)?.label ?? permissionMode;
  const activeModePreset = modePresetIdForComposerState(MODE_PRESETS, {
    action: selectedAction,
    chatMode,
    permissionMode,
  });
  const sessionStatus = deriveSessionStatus(session, events);
  const visibleSessionStatus = isStartingSession ? "starting" : sessionStatus;
  const isSessionActive = isStartingSession || sessionStatus === "running" || sessionStatus === "queued";
  const harnessStatusCopy = harnessReadinessLabel(currentHarness);
  const effectiveRuntimeMetrics = status?.metrics ?? runtimeMetrics;
  const hasWorkspace = Boolean((status?.projectRoot ?? workspacePermissions?.currentWorkspace ?? "").trim());
  const canRunSession = Boolean(hasWorkspace && runtimeHealth === "ready" && status && prompt.trim() && !isStartingSession && harnessCanRun(currentHarness, effectiveAction));
  const runDisabledMessage = runDisabledReason(currentHarness, harnessStatusCopy, prompt, runtimeHealth, hasWorkspace, effectiveAction);
  const canContinueConversation = Boolean(activeConversationId && session && (session.status === "completed" || session.status === "interrupted") && (session.conversationId ?? session.id) === activeConversationId);
  const isResumingInterrupted = Boolean(session?.status === "interrupted");
  const activeModelRegistry = harnessModelRegistries[selectedHarness] ?? null;
  const activeModelId = selectedModelByHarness[selectedHarness] ?? activeModelRegistry?.defaultModelId ?? null;
  const activeModelLabel = activeModelRegistry?.models.find((model) => model.id === activeModelId)?.label ?? activeModelId ?? "Default";
  const effortOptions = effortOptionsForRegistry(activeModelRegistry, activeModelId);
  const activeEffortLabel = selectedEffort ? selectedEffort[0].toUpperCase() + selectedEffort.slice(1) : "Default";
  const showModelPicker = Boolean(activeModelRegistry && activeModelRegistry.supportsModelPicker && activeModelRegistry.models.length > 0);
  const showEffortPicker = effortOptions.length > 0;
  const conversationTurnCount = activeConversationId
    ? recentSessions.filter((entry) => (entry.conversationId ?? entry.id) === activeConversationId && entry.status === "completed").length
    : 0;
  const slashCommandMatches = useMemo(() => filterSlashCommands(prompt), [prompt]);
  const selectedSlashCommand = slashCommandMatches[slashCommandIndex] ?? slashCommandMatches[0] ?? null;
  const slashCommandPreviewText = selectedSlashCommand ? slashCommandPreview(selectedSlashCommand) : null;
  const usageWarning = useMemo(() => visibleUsageLimitState(usageSnapshot), [usageSnapshot]);
  const memoryItems = projectMemory?.items ?? [];
  const knowledgeItems = knowledgeIndex?.items ?? [];
  const localTraceModel = useMemo(
    () => deriveStudioTrace({
      session: session ? { id: session.id, action: effectiveAction, status: sessionStatus } : null,
      events,
    }),
    [effectiveAction, events, session, sessionStatus],
  );
  const traceModel: StudioTraceModel = serverTrace && serverTrace.sessionId === session?.id
    ? {
        ...localTraceModel,
        ...serverTrace,
        activities: (serverTrace as Partial<StudioTraceModel>).activities ?? localTraceModel.activities,
        activeProcesses: (serverTrace as Partial<StudioTraceModel>).activeProcesses ?? localTraceModel.activeProcesses,
      }
    : localTraceModel;
  const traceDesignArtifacts = useMemo(
    () => (traceModel.artifacts ?? []) as DesignSystemArtifact[],
    [traceModel.artifacts],
  );
  const allDesignArtifacts = useMemo(() => {
    return mergeDesignArtifacts(designArtifacts, traceDesignArtifacts);
  }, [designArtifacts, traceDesignArtifacts]);
  const sessionDesignArtifacts = useMemo(() => {
    return selectDesignArtifactsForSession({
      storedArtifacts: designArtifacts,
      traceArtifacts: traceDesignArtifacts,
      sessionId: session?.id,
      events,
    });
  }, [designArtifacts, events, session?.id, traceDesignArtifacts]);
  const contextualDesignArtifact = sessionDesignArtifacts[0] ?? null;
  const activeDesignArtifact = useMemo(() => {
    return allDesignArtifacts.find((artifact) => artifact.id === selectedArtifactId)
      ?? contextualDesignArtifact
      ?? designArtifacts[0]
      ?? null;
  }, [allDesignArtifacts, contextualDesignArtifact, designArtifacts, selectedArtifactId]);
  const activeReviewPacket = useMemo(() => {
    return selectReviewPacketForSession(reviewPackets, session?.id);
  }, [reviewPackets, session?.id]);
  const lastFailure = useMemo(() => findLatestFailureEvent(events), [events]);
  const hasChangedFileContext = (designTrace?.files.length ?? 0) > 0 || Boolean(designTrace?.error);
  const hasDesignSystemTraceContext = (designTrace?.designSystemFiles.length ?? 0) > 0;
  const hasDesignArtifactContext = sessionDesignArtifacts.length > 0;
  const hasPacketContext = Boolean(activeReviewPacket || sessionDesignArtifacts.length);
  const hasCreationEventContext = events.some((event) =>
    /artifact|design|decision|acceptance|screenshot|snapshot|figma|research/i.test(event.type),
  );
  const hasFigmaConnection = Boolean(
    isFigmaBridgeRunning(figmaStatus)
    || figmaStatus?.pluginStatus === "connected"
    || figmaStatus?.connectionState === "connected"
    || (figmaStatus?.clients.length ?? 0) > 0,
  );
  const mermaidBoardSync = mermaidBoard?.lastFigJamSync ?? null;
  const iaBoardSync = iaBoard?.lastFigJamSync ?? null;
  const hasFigJamContext = Boolean(
    mermaidBoard
    || mermaidBoardExports.length
    || mermaidBoardSync
    || iaBoard
    || iaBoardExports.length
    || iaBoardSync
    || scenarioDesignPackage
    || scenarioFigJamExports.length,
  );
  const hasDesignPromptContext = isDesignLanePrompt(prompt)
    || isDesignLanePrompt(session?.prompt ?? "")
    || isDesignLaneAction(effectiveAction);
  const designLaneState: DesignLaneState = useMemo(() => {
    const hasDesignSystem = hasDesignArtifactContext || hasDesignSystemTraceContext;
    const active = hasDesignSystem || hasFigmaConnection || hasFigJamContext || hasDesignPromptContext;
    const needsFigmaSetup = active && !hasFigmaConnection;
    const reason = hasDesignArtifactContext
      ? "Design-system artifact ready"
      : hasDesignSystemTraceContext
        ? "Design-system files changed"
        : hasFigJamContext
          ? "FigJam source or board ready"
          : hasFigmaConnection
            ? "Figma bridge connected"
            : hasDesignPromptContext
              ? "Design-oriented prompt"
              : "No design lane context";
    return {
      active,
      hasDesignSystem,
      hasFigma: hasFigmaConnection,
      hasFigJam: hasFigJamContext,
      needsFigmaSetup,
      reason,
    };
  }, [hasDesignArtifactContext, hasDesignPromptContext, hasDesignSystemTraceContext, hasFigJamContext, hasFigmaConnection]);
  const showConversationGoalRow = Boolean(goalEditorOpen || conversationGoal.trim());
  const showCreationStrip = Boolean(
    hasPacketContext
    || hasCreationEventContext
    || chatSearchQuery.trim()
    || chatMemoryPins.length
    || lastFailure,
  );
  const shouldShowPacketTab = rightPaneTab === "work-packet" || hasPacketContext;
  const shouldShowDesignSystemTab = rightPaneTab === "design-system" || designLaneState.hasDesignSystem;
  const shouldShowBoardTab = rightPaneTab === "mermaid-board" || designLaneState.hasFigJam;
  const shouldShowFigmaTab = rightPaneTab === "figma" || designLaneState.hasFigma || designLaneState.needsFigmaSetup;
  const visibleRightPaneTabs = useMemo(() => {
    const visibleIds = new Set<RightPaneTab>(DEFAULT_RIGHT_PANE_TABS.map((tab) => tab.id));
    visibleIds.add(rightPaneTab);
    if (shouldShowPacketTab) visibleIds.add("work-packet");
    if (shouldShowDesignSystemTab) visibleIds.add("design-system");
    if (shouldShowBoardTab) visibleIds.add("mermaid-board");
    if (shouldShowFigmaTab) visibleIds.add("figma");
    return ALL_RIGHT_PANE_TABS.filter((tab) => visibleIds.has(tab.id));
  }, [rightPaneTab, shouldShowBoardTab, shouldShowDesignSystemTab, shouldShowFigmaTab, shouldShowPacketTab]);
  const designLaneReceipt = useMemo<RunSpineReceiptModel | null>(() => {
    if (contextualDesignArtifact) {
      return {
        id: `design-system-${contextualDesignArtifact.id}`,
        label: "Design lane",
        status: contextualDesignArtifact.status === "draft" ? "warn" : "done",
        title: contextualDesignArtifact.title,
        fields: [
          { label: "system", value: trimText(contextualDesignArtifact.title, 28) },
          { label: "sections", value: String(contextualDesignArtifact.sections.length) },
          { label: "review", value: contextualDesignArtifact.status },
        ],
        onSelect: () => chooseRightPane("design-system", "Design-system artifact opened from run spine"),
      };
    }
    const figJamExportCount = mermaidBoardExports.length + iaBoardExports.length + scenarioFigJamExports.length;
    const figJamSourceCount = figJamExportCount || scenarioDesignPackage?.mermaidArtifacts?.length || 0;
    const sync = mermaidBoardSync ?? iaBoardSync;
    if (figJamSourceCount > 0 || sync) {
      const synced = sync?.status === "synced";
      return {
        id: `figjam-${sync?.syncedAt ?? figJamSourceCount}`,
        label: synced ? "FigJam synced" : "FigJam source",
        status: synced ? "done" : sync?.status === "failed" ? "warn" : "done",
        title: sync?.fallbackReason ?? "Open FigJam, inspect source, and verify sync status.",
        fields: [
          { label: "open", value: "FigJam" },
          { label: "source", value: `${figJamSourceCount} file${figJamSourceCount === 1 ? "" : "s"}` },
          { label: "sync", value: sync?.status ?? "source" },
        ],
        onSelect: () => chooseRightPane(mermaidBoard || mermaidBoardExports.length ? "mermaid-board" : "research-lab", "FigJam receipt opened from run spine"),
      };
    }
    return null;
  }, [contextualDesignArtifact, iaBoardSync, iaBoardExports.length, mermaidBoard, mermaidBoardSync, mermaidBoardExports.length, scenarioDesignPackage?.mermaidArtifacts?.length, scenarioFigJamExports.length]);
  const latestRun = session ?? defaultWorkbenchSession(recentSessions);
  const workspaceLabel = compactWorkspaceLabel(status?.projectRoot ?? workspacePermissions?.currentWorkspace ?? "");
  const truthStripItems = useMemo<TruthStripItemModel[]>(() => [
    {
      id: "runtime",
      label: "Runtime",
      detail: runtimeHealthDisplayLabel(runtimeHealth, status?.runtime?.runtimeSource),
      status: runtimeTruthStatus(runtimeHealth),
      title: runtimeTruthTitle(status, runtimeRecoveryMessage),
    },
    {
      id: "codex",
      label: "Codex",
      detail: truthHarnessStateLabel(codexHarness),
      status: truthHarnessStatus(codexHarness),
      title: truthHarnessLabel(codexHarness, "Codex"),
    },
    {
      id: "claude",
      label: "Claude",
      detail: truthHarnessStateLabel(claudeHarness),
      status: truthHarnessStatus(claudeHarness),
      title: truthHarnessLabel(claudeHarness, "Claude"),
    },
    {
      id: "workspace",
      label: "Worktree",
      detail: worktreeTruthLabel(designTrace, lastFailure),
      status: worktreeTruthStatus(designTrace, lastFailure),
      title: worktreeTruthTitle(designTrace, lastFailure),
    },
  ], [claudeHarness, codexHarness, designTrace, lastFailure, runtimeHealth, runtimeRecoveryMessage, status?.projectRoot, status?.runtime?.runtimeCacheRoot, status?.runtime?.runtimeSource]);
  useEffect(() => {
    if (runtimeHealth !== "ready") return undefined;
    const needsAuthRefresh = [codexHarness, claudeHarness].some((harness) => !harness || !harness.authStatus);
    if (!needsAuthRefresh) {
      harnessReadinessRefreshAttemptsRef.current = 0;
      return undefined;
    }
    if (harnessReadinessRefreshAttemptsRef.current >= 3) return undefined;
    harnessReadinessRefreshAttemptsRef.current += 1;
    const timeout = window.setTimeout(() => {
      void listHarnesses({ refresh: true }).then(setHarnesses).catch(() => undefined);
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [claudeHarness, codexHarness, runtimeHealth]);
  const visibleRecentSessions = recentSessions.length ? recentSessions : session ? [session] : [];
  const sessionInventory = session && !visibleRecentSessions.some((recent) => recent.id === session.id)
    ? [session, ...visibleRecentSessions]
    : visibleRecentSessions;
  const queueDockSessions = sessionInventory.filter(isQueueDockSession);
  const localRunningSessionCount = sessionInventory.filter((recent) => recent.status === "running" || recent.status === "queued").length + (isStartingSession ? 1 : 0);
  const runtimeRunningSessionCount = (effectiveRuntimeMetrics?.activeRuns ?? 0) + (effectiveRuntimeMetrics?.queuedRuns ?? 0);
  const runningSessionCount = Math.max(localRunningSessionCount, runtimeRunningSessionCount);
  const runtimeQueueDockItems = queueDockItemsFromRuntime(effectiveRuntimeMetrics, runtimeHealth);
  const showAgentQueueDock = runtimeQueueDockItems.length > 0 || isStartingSession || queueDockSessions.length > 0;
  const sessionQueueState = runtimeHealth !== "ready"
    ? runtimeHealth
    : (effectiveRuntimeMetrics?.queuedRuns ?? 0) > 0
      ? "queued"
      : isStartingSession
        ? "starting"
        : runningSessionCount > 1
          ? "parallel"
          : visibleSessionStatus;
  const activeSidebarProjectId = session?.cwd ?? visibleRecentSessions[0]?.cwd ?? status?.projectRoot ?? null;
  const mermaidBoardToolRuntimeReady = Boolean(status?.projectRoot && hasCoreMermaidBoardToolContract(studioTools));
  const mermaidSourceRuntimeReady = Boolean(status?.projectRoot && hasMermaidSourceToolContract(studioTools));
  const mermaidBoardCoreRuntimeReady = mermaidBoardToolRuntimeReady || mermaidSourceRuntimeReady;
  const mermaidBoardPmRuntimeReady = mermaidBoardToolRuntimeReady && hasPmMermaidBoardToolContract(studioTools);
  const mermaidBoardRecovery = useMemo(
    () => mermaidBoardRuntimeRecovery(status, mermaidBoardCoreRuntimeReady, mermaidBoardPmRuntimeReady, canRestartStudioRuntime(), mermaidBoardError, mermaidSourceRuntimeReady && !mermaidBoardToolRuntimeReady),
    [mermaidBoardCoreRuntimeReady, mermaidBoardError, mermaidBoardPmRuntimeReady, mermaidBoardToolRuntimeReady, mermaidSourceRuntimeReady, status],
  );
  useEffect(() => {
    if (!activeSidebarProjectId) return;
    setExpandedProjectIds((current) => current.includes(activeSidebarProjectId) ? current : [activeSidebarProjectId, ...current]);
  }, [activeSidebarProjectId]);
  useEffect(() => {
    if (rightPaneUserLocked || runningSessionCount > 1) return;
    const intent = paneIntentForAction(effectiveAction);
    if (!intent) return;
    setPaneIntent(intent);
    setRightPaneTab(normalizeRightPaneTab(intent.tab));
  }, [effectiveAction, rightPaneUserLocked, runningSessionCount]);
  useEffect(() => {
    if (rightPaneUserLocked || runningSessionCount > 1) return;
    const intent = paneIntentForEvents(events, effectiveAction, lastFailure);
    if (!intent || intent.confidence < 0.75) return;
    setPaneIntent(intent);
    setRightPaneTab(normalizeRightPaneTab(intent.tab));
  }, [effectiveAction, events, lastFailure, rightPaneUserLocked, runningSessionCount]);
  useEffect(() => {
    if (rightPaneUserLocked || runningSessionCount > 1 || !activeReviewPacket || activeReviewPacket.artifacts.length === 0) return;
    setPaneIntent({ tab: "work-packet", reason: "Review packet available for this run", confidence: 0.95 });
    setRightPaneTab("work-packet");
  }, [activeReviewPacket?.id, activeReviewPacket?.updatedAt, activeReviewPacket?.artifacts.length, rightPaneUserLocked, runningSessionCount]);
  useEffect(() => {
    if (rightPaneTab !== "mermaid-board" || mermaidBoard || mermaidBoardLoading || !mermaidBoardCoreRuntimeReady) return;
    void handleCreateMermaidBoard();
  }, [mermaidBoard, mermaidBoardCoreRuntimeReady, mermaidBoardError, mermaidBoardLoading, rightPaneTab, status?.projectRoot, studioTools]);
  useEffect(() => {
    if (rightPaneTab !== "ia" || iaBoard || iaBoardLoading || !mermaidBoardCoreRuntimeReady) return;
    void handleCaptureIABoard();
  }, [events, iaBoard, iaBoardLoading, mermaidBoardCoreRuntimeReady, rightPaneTab, status?.projectRoot, studioTools]);
  useEffect(() => {
    setSlashCommandIndex(0);
  }, [prompt]);
  const contextItems = useMemo(
    () => filterContextItems(memoryItems, contextQuery, contextFilter).slice(0, 8),
    [contextFilter, contextQuery, memoryItems],
  );
  const visibleKnowledgeItems = useMemo(
    () => filterKnowledgeItems(knowledgeItems, knowledgeQuery, knowledgeFilter).slice(0, 10),
    [knowledgeFilter, knowledgeItems, knowledgeQuery],
  );
  const workbenchStyle = {
    "--chat-rail-width": `${chatRailWidthPercent}%`,
  } as CSSProperties;

  const terminalBlocks = useMemo(
    () => buildTerminalBlocks({
      session,
      events,
      harnessLabel: currentHarness?.label ?? selectedHarness,
      action: effectiveAction,
      prompt,
    }),
    [currentHarness?.label, effectiveAction, events, prompt, selectedHarness, session],
  );
  const visibleTerminalBlocks = useMemo(
    () => filterTerminalBlocksByQuery(terminalBlocks, chatSearchQuery),
    [chatSearchQuery, terminalBlocks],
  );
  const latestActivity = traceModel.activities.at(-1) ?? null;
  const latestThinkingActivity = [...traceModel.activities].reverse().find((activity) => activity.kind === "thinking") ?? null;
  const latestRunningActivity = [...traceModel.activities].reverse().find((activity) => activity.status === "running") ?? null;
  const hasRunningWork = traceModel.activeProcesses.length > 0
    || traceModel.activities.some((activity) => activity.status === "running" && activity.kind !== "thinking");
  const agentThinkingState: "thinking" | "running" | "idle" | "failed" = lastFailure
    ? "failed"
    : hasRunningWork
      ? "running"
      : isSessionActive
        ? "thinking"
        : "idle";
  const agentLiveLabel = agentThinkingState === "failed"
    ? "Failed"
    : agentThinkingState === "running"
      ? "Running"
      : agentThinkingState === "thinking"
        ? "Thinking"
        : sessionStatus === "completed"
          ? "Done"
          : sessionStatus === "cancelled"
            ? "Stopped"
            : "Ready";
  const agentLiveSummary = lastFailure?.message
    ?? traceModel.activeProcesses[0]?.command
    ?? compactRunSummary(latestRunningActivity?.summary, session?.harness ?? selectedHarness, 88)
    ?? compactRunSummary(latestThinkingActivity?.summary, session?.harness ?? selectedHarness, 88)
    ?? compactRunSummary(latestActivity?.summary, session?.harness ?? selectedHarness, 88)
    ?? compactSessionStatusLabel(visibleSessionStatus);
  const runPanelTitle = latestRun
    ? queueDockPromptLabel(latestRun.prompt, latestRun.harness, 72)
    : prompt.trim()
      ? queueDockPromptLabel(prompt.trim(), selectedHarness, 72)
      : "New run";

  useEffect(() => {
    setUserPinnedToBottom(true);
    window.requestAnimationFrame(() => scrollConversationToLatest("auto"));
  }, [session?.id]);

  useEffect(() => {
    if (!userPinnedToBottom) return;
    bottomAnchorRef.current?.scrollIntoView({
      block: "end",
      behavior: isSessionActive ? "smooth" : "auto",
    });
  }, [
    events.length,
    isSessionActive,
    terminalBlocks.length,
    traceModel.activeProcesses.length,
    traceModel.activities.length,
    userPinnedToBottom,
  ]);

  useEffect(() => {
    return () => {
      scrollRetryTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
      scrollRetryTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (runtimeHealth !== "starting" && runtimeHealth !== "degraded") return undefined;
    const delay = runtimeHealth === "starting" ? 750 : 2000;
    const interval = window.setInterval(() => {
      if (runtimeStartupRefreshInFlightRef.current) return;
      runtimeStartupRefreshInFlightRef.current = true;
      void refresh().finally(() => {
        runtimeStartupRefreshInFlightRef.current = false;
      });
    }, delay);
    return () => {
      window.clearInterval(interval);
      runtimeStartupRefreshInFlightRef.current = false;
    };
  }, [runtimeHealth]);

  useEffect(() => {
    if (runtimeHealth !== "ready") {
      runtimeReadyHydrationRef.current = null;
      return undefined;
    }
    const runtimeKey = String(status?.runtime?.pid ?? status?.runtime?.url ?? "ready");
    if (runtimeReadyHydrationRef.current === runtimeKey) return undefined;
    runtimeReadyHydrationRef.current = runtimeKey;
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [runtimeHealth, status?.runtime?.pid, status?.runtime?.url]);

  useEffect(() => {
    if (runtimeHealth !== "ready" || recentSessions.length > 0 || session || !status?.projectRoot) return undefined;
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      void listSessions()
        .then((nextSessions) => {
          if (nextSessions.length > 0) setRecentSessions(nextSessions);
        })
        .catch(() => undefined);
      if (attempts >= 6) window.clearInterval(interval);
    }, 750);
    return () => window.clearInterval(interval);
  }, [recentSessions.length, runtimeHealth, session, status?.projectRoot]);

  useEffect(() => {
    if (runtimeHealth !== "ready" || !status?.projectRoot) return undefined;
    const refreshIfVisible = () => {
      if (document.visibilityState === "hidden") return;
      void refreshWorktreeTrace();
    };
    window.addEventListener("focus", refreshIfVisible);
    const interval = window.setInterval(() => {
      if (isSessionActive) return;
      refreshIfVisible();
    }, WORKTREE_TRACE_REFRESH_MS);
    return () => {
      window.removeEventListener("focus", refreshIfVisible);
      window.clearInterval(interval);
    };
  }, [isSessionActive, runtimeHealth, status?.projectRoot]);

  async function refresh() {
    try {
      const nextStatus = await getStatus();
      const nextRuntimeMetrics = await getRuntimeMetrics().catch(() => nextStatus.metrics ?? null);
      const [
        nextHarnesses,
        nextMemory,
        nextKnowledge,
        nextFigma,
        nextSessions,
        nextCompatibility,
        nextComputer,
        nextDesignTrace,
        nextArtifacts,
        nextMarketplaceNotes,
        nextDesignChangelogEntries,
        nextReviewPackets,
        nextStudioTools,
        nextBrowserStatus,
        nextAutomations,
        nextAutomationTemplates,
        nextAutomationScheduler,
        nextUsage,
        nextRecentWorkspaces,
        nextWorkspacePermissions,
      ] = await Promise.all([
        listHarnesses({ refresh: true }).catch(() => nextStatus.harnesses ?? []),
        getProjectMemory().catch(() => null),
        getKnowledgeIndex().catch(() => null),
        getFigmaStatus().catch(() => null),
        listSessions().catch(() => []),
        getCompatibility().catch(() => null),
        getComputerStatus().catch(() => null),
        getDesignSystemTrace().catch(() => null),
        listDesignSystemArtifacts().catch(() => []),
        getMarketplaceNotes().catch(() => null),
        listDesignChangelogEntries().catch(() => []),
        listReviewPackets().catch(() => []),
        listStudioTools().catch(() => []),
        getBrowserStatus().catch(() => null),
        listAutomations().catch(() => []),
        getAutomationTemplates().catch(() => []),
        getAutomationSchedulerStatus().catch(() => null),
        getUsageSnapshot().catch(() => null),
        listRecentWorkspaces().catch(() => []),
        getWorkspacePermissions().catch(() => null),
      ]);
      const nextRuntimeHealth = runtimeHealthFromStatus(nextStatus);
      const nextResolvedHarnesses = nextHarnesses.length ? nextHarnesses : nextStatus.harnesses ?? [];
      setStatus(nextStatus);
      setRuntimeMetrics(nextRuntimeMetrics);
      setRuntimeHealth(nextRuntimeHealth);
      setRuntimeRecoveryMessage(nextStatus.runtime?.error ?? null);
      setHarnesses(nextResolvedHarnesses);
      setSettingsDraft(nextStatus.config);
      setSelectedHarness(normalizePrimaryHarness(nextStatus.config.defaultHarness, nextResolvedHarnesses));
      setInputMode(nextStatus.config.ui?.inputMode ?? "agent");
      if (!session && nextStatus.config.codex?.planModeDefault) setPermissionMode("plan");
      setProjectMemory(nextMemory);
      setKnowledgeIndex(nextKnowledge);
      setFigmaStatus(nextFigma);
      setRecentSessions(nextSessions);
      setCompatibility(nextCompatibility);
      setComputerStatus(nextComputer);
      setDesignTrace(nextDesignTrace);
      updateDesignArtifacts(nextArtifacts);
      setMarketplaceNotes(nextMarketplaceNotes);
      setDesignChangelogEntries(nextDesignChangelogEntries);
      setReviewPackets(nextReviewPackets);
      setStudioTools(nextStudioTools);
      setBrowserStatus(nextBrowserStatus);
      setAutomations(nextAutomations);
      setAutomationTemplates(nextAutomationTemplates);
      setAutomationScheduler(nextAutomationScheduler);
      setUsageSnapshot(nextUsage);
      setRecentWorkspaces(nextRecentWorkspaces);
      setWorkspacePermissions(nextWorkspacePermissions);
      if (!session) {
        const initialSession = defaultWorkbenchSession(nextSessions);
        if (initialSession) await openSessionSummary(initialSession, nextResolvedHarnesses);
      }
      const primaryHarnessStatusIncomplete = ["codex", "claude-code"].some((id) =>
        !nextResolvedHarnesses.find((harness) => harness.id === id)?.authStatus,
      );
      if (nextRuntimeHealth === "ready" && primaryHarnessStatusIncomplete) {
        harnessReadinessRefreshAttemptsRef.current = 0;
        window.setTimeout(() => {
          void listHarnesses({ refresh: true }).then(setHarnesses).catch(() => undefined);
        }, 650);
      }
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(null);
      setStudioTools([]);
      setRuntimeMetrics(null);
      setRuntimeHealth("offline");
      setRuntimeRecoveryMessage(message);
      if (rightPaneTab === "mermaid-board") setMermaidBoardError(MERMAID_BOARD_RUNTIME_UNAVAILABLE);
      setError(message);
    }
  }

  async function handleDiagnoseHarness(id: HarnessId) {
    await diagnoseHarness(id, { refresh: true });
    await refresh();
  }

  async function handleInstallAgentKit(target: AgentInstallTargetInput) {
    try {
      await installAgentKit({
        target,
        dryRun: false,
        force: false,
        project: status?.projectRoot ?? settingsDraft?.workspaceRoots?.[0],
      });
      await refresh();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function scheduleSessionTraceRefresh(sessionId: string) {
    pendingTraceSessionIdRef.current = sessionId;
    if (traceRefreshTimerRef.current !== null) return;
    traceRefreshTimerRef.current = window.setTimeout(() => {
      traceRefreshTimerRef.current = null;
      const nextSessionId = pendingTraceSessionIdRef.current;
      pendingTraceSessionIdRef.current = null;
      void refreshSessionTrace(nextSessionId);
    }, TRACE_REFRESH_DELAY_MS);
  }

  async function refreshSessionTrace(sessionId = session?.id ?? null) {
    if (!sessionId) {
      setServerTrace(null);
      return;
    }
    try {
      const payload = await getSessionTrace(sessionId);
      setServerTrace(payload.trace);
    } catch {
      setServerTrace(null);
    }
  }

  async function refreshUsageSnapshot() {
    try {
      setUsageSnapshot(await getUsageSnapshot());
    } catch {
      setUsageSnapshot(null);
    }
  }

  async function refreshWorktreeTrace() {
    if (worktreeTraceRefreshInFlightRef.current) return;
    worktreeTraceRefreshInFlightRef.current = true;
    try {
      setDesignTrace(await getDesignSystemTrace());
    } catch {
      // Keep the last known trace instead of flashing a false unavailable state.
    } finally {
      worktreeTraceRefreshInFlightRef.current = false;
    }
  }

  function updateDesignArtifacts(nextArtifacts: DesignSystemArtifact[]) {
    setDesignArtifacts(nextArtifacts);
    setSelectedArtifactId((current) => {
      if (!nextArtifacts.length) return null;
      if (current && nextArtifacts.some((artifact) => artifact.id === current)) return current;
      return nextArtifacts[0].id;
    });
  }

  async function openSessionSummary(nextSession: SessionSummary, availableHarnesses = harnesses) {
    const nextComposerState = composerStateForSession(nextSession, MODE_PRESETS);
    setSession(nextSession);
    setServerTrace(null);
    setCollapsedBlockIds(new Set());
    setSelectedAction(nextComposerState.action);
    setSelectedHarness(normalizeComposerHarness(nextSession.harness, availableHarnesses));
    setChatMode(nextComposerState.chatMode);
    setPermissionMode(nextComposerState.permissionMode);
    setActiveConversationId(nextSession.conversationId ?? nextSession.id);
    setConversationGoal(nextSession.goal ?? "");
    setGoalEditorOpen(false);
    if (nextSession.status === "interrupted") {
      setPrompt(nextSession.prompt ?? "");
    }
    const [eventResult, traceResult] = await Promise.allSettled([
      getSessionEvents(nextSession.id, SESSION_EVENT_LIMIT),
      getSessionTrace(nextSession.id),
    ]);
    if (eventResult.status === "fulfilled") {
      setEvents(eventResult.value.events);
      setSession((current) => current?.id === nextSession.id ? { ...current, ...eventResult.value.session } : current);
    } else {
      setEvents([]);
    }
    if (traceResult.status === "fulfilled") {
      setServerTrace(traceResult.value.trace);
      setSession((current) => current?.id === nextSession.id ? { ...current, ...traceResult.value.session } : current);
    } else {
      setServerTrace(null);
    }
    const failures = [eventResult, traceResult].filter((result) => result.status === "rejected") as PromiseRejectedResult[];
    if (failures.length === 2) {
      setError(failures.map((failure) => failure.reason instanceof Error ? failure.reason.message : String(failure.reason)).join(" / "));
    } else {
      setError(null);
    }
  }

  function openSettingsPanel(section = settingsDraft?.setup?.completedAt ? "General" : "Setup") {
    setSettingsSection(section);
    setSettingsOpen(true);
  }

  async function refreshMarketplaceNotes() {
    try {
      const [nextMarketplace, nextForks] = await Promise.all([
        getMarketplaceNotes({ refresh: true }),
        listNoteForks(),
      ]);
      setMarketplaceNotes(nextMarketplace);
      setNoteForks(nextForks);
      setMarketplaceError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMarketplaceError(message);
      setError(message);
    }
  }
  async function refreshDesignChangelog() {
    setDesignChangelogLoading(true);
    try {
      setDesignChangelogEntries(await listDesignChangelogEntries());
      setDesignChangelogError(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setDesignChangelogError(message);
      setError(message);
    } finally {
      setDesignChangelogLoading(false);
    }
  }

  async function handleCreateDesignChangelogEntry(input: DesignChangelogCreateInput) {
    try {
      await createDesignChangelogEntry(input);
      await refreshDesignChangelog();
      await refreshMemory();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setDesignChangelogError(message);
      setError(message);
    }
  }

  async function handleUpdateDesignChangelogEntry(id: string, patch: DesignChangelogPatchInput) {
    try {
      await updateDesignChangelogEntry(id, patch);
      await refreshDesignChangelog();
      await refreshMemory();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setDesignChangelogError(message);
      setError(message);
    }
  }

  async function handleArchiveDesignChangelogEntry(id: string) {
    try {
      await archiveDesignChangelogEntry(id);
      await refreshDesignChangelog();
      await refreshMemory();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setDesignChangelogError(message);
      setError(message);
    }
  }

  async function handleRestoreDesignChangelogEntry(id: string) {
    try {
      await restoreDesignChangelogEntry(id);
      await refreshDesignChangelog();
      await refreshMemory();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setDesignChangelogError(message);
      setError(message);
    }
  }

  async function handleExportDesignChangelog() {
    try {
      await copyText(await exportDesignChangelogMarkdown());
      setDesignChangelogError(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setDesignChangelogError(message);
      setError(message);
    }
  }

  async function refreshReviewPackets() {
    try {
      setReviewPackets(await listReviewPackets());
      setReviewPacketError(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setReviewPacketError(message);
      setError(message);
    }
  }

  async function ensureActiveReviewPacket(): Promise<StudioReviewPacket | null> {
    if (activeReviewPacket) return activeReviewPacket;
    if (!session && events.length === 0) return null;
    try {
      const result = await captureReviewPacket({
        session,
        events,
        trace: designTrace,
      });
      if (result.packet) {
        setReviewPackets((current) => [result.packet as StudioReviewPacket, ...current.filter((packet) => packet.id !== result.packet?.id)]);
        setReviewPacketError(null);
        return result.packet;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setReviewPacketError(message);
      setError(message);
    }
    return null;
  }

  async function openActiveReviewPacket() {
    await ensureActiveReviewPacket();
    chooseRightPane("work-packet", "Work packet opened");
  }

  async function handleExportReviewPacket() {
    const packet = await ensureActiveReviewPacket();
    if (!packet) return;
    try {
      await copyText(await exportReviewPacketMarkdown(packet.id));
      setReviewPacketError(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setReviewPacketError(message);
      setError(message);
    }
  }

  async function handleInstallMarketplaceNote(noteId: string) {
    setMarketplaceBusyId(noteId);
    try {
      const result = await installMarketplaceNote({ noteId });
      setMarketplaceDownloadJobs((current) => ({ ...current, [noteId]: result.job }));
      subscribeDownloadEvents(result.job.id, (event) => {
        setMarketplaceDownloadJobs((current) => {
          const previous = current[noteId] ?? result.job;
          const status = event.type === "completed" ? "completed" : event.type === "failed" ? "failed" : previous.status;
          return {
            ...current,
            [noteId]: {
              ...previous,
              status,
              progress: event.progress,
              message: event.message,
              updatedAt: event.timestamp,
              completedAt: event.type === "completed" || event.type === "failed" ? event.timestamp : previous.completedAt,
              error: event.type === "failed" ? event.message : previous.error,
            },
          };
        });
        if (event.type === "completed") void refreshMarketplaceNotes();
      });
      setMarketplaceNotes(result.marketplace);
      setMarketplaceError(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMarketplaceError(message);
      setError(message);
    } finally {
      setMarketplaceBusyId(null);
    }
  }

  async function handleRemoveMarketplaceNote(name: string) {
    setMarketplaceBusyId(name);
    try {
      setMarketplaceNotes(await removeMarketplaceNote(name));
      setMarketplaceError(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMarketplaceError(message);
      setError(message);
    } finally {
      setMarketplaceBusyId(null);
    }
  }

  async function handleForkMarketplaceNote(noteId: string) {
    setMarketplaceBusyId(noteId);
    try {
      const result = await forkMarketplaceNote(noteId);
      setMarketplaceNotes(result.marketplace);
      setNoteForks(await listNoteForks());
      setSelectedNoteForkId(result.fork.name);
      setNoteForkFiles(await getNoteForkFiles(result.fork.name));
      setSelectedNoteForkFile(null);
      setNoteForkValidation(null);
      setNoteForkDiff(null);
      setNoteForkPrHandoff(null);
      setMarketplaceError(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMarketplaceError(message);
      setError(message);
    } finally {
      setMarketplaceBusyId(null);
    }
  }

  async function handleSelectNoteFork(name: string) {
    try {
      setSelectedNoteForkId(name);
      setNoteForkFiles(await getNoteForkFiles(name));
      setSelectedNoteForkFile(null);
      setNoteForkValidation(null);
      setNoteForkDiff(null);
      setNoteForkPrHandoff(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMarketplaceError(message);
      setError(message);
    }
  }

  async function handleUpdateNoteForkFile(path: string, content: string) {
    if (!selectedNoteForkId) return;
    try {
      const file = await updateNoteForkFile(selectedNoteForkId, { path, content });
      setNoteForkFiles((current) => current.map((candidate) => candidate.path === file.path ? file : candidate));
      setNoteForkDiff(await getNoteForkDiff(selectedNoteForkId));
      setMarketplaceError(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMarketplaceError(message);
      setError(message);
    }
  }

  async function handleValidateNoteFork() {
    if (!selectedNoteForkId) return;
    try {
      setNoteForkValidation(await validateNoteFork(selectedNoteForkId));
      setMarketplaceError(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMarketplaceError(message);
      setError(message);
    }
  }

  async function handleExportNoteForkPr() {
    if (!selectedNoteForkId) return;
    try {
      setNoteForkPrHandoff(await exportNoteForkPr(selectedNoteForkId));
      setMarketplaceError(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMarketplaceError(message);
      setError(message);
    }
  }

  async function refreshAutomations() {
    const [nextAutomations, nextTemplates, nextScheduler] = await Promise.all([
      listAutomations().catch(() => []),
      getAutomationTemplates().catch(() => []),
      getAutomationSchedulerStatus().catch(() => null),
    ]);
    setAutomations(nextAutomations);
    setAutomationTemplates(nextTemplates);
    setAutomationScheduler(nextScheduler);
  }

  async function loadAutomationHistory(automationId: string) {
    try {
      const runs = await listAutomationRuns(automationId);
      setAutomationRuns((current) => ({ ...current, [automationId]: runs }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCreateAutomation(input: Partial<StudioAutomationDefinition> & { templateId?: string }) {
    setAutomationBusyId("create");
    try {
      const automation = await createAutomation({
        ...input,
        cwd: input.cwd ?? status?.projectRoot ?? "",
      });
      await refreshAutomations();
      await loadAutomationHistory(automation.id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAutomationBusyId(null);
    }
  }

  async function handleUpdateAutomation(id: string, patch: Partial<StudioAutomationDefinition>) {
    setAutomationBusyId(id);
    try {
      await updateAutomation(id, patch);
      await refreshAutomations();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAutomationBusyId(null);
    }
  }

  async function handleDeleteAutomation(id: string) {
    setAutomationBusyId(id);
    try {
      await deleteAutomation(id);
      setAutomationRuns((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      await refreshAutomations();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAutomationBusyId(null);
    }
  }

  async function handleRunAutomation(id: string) {
    setAutomationBusyId(id);
    try {
      const run = await runAutomationNow(id);
      await refreshAutomations();
      await loadAutomationHistory(id);
      if (run.sessionId) {
        const nextSessions = await listSessions().catch(() => recentSessions);
        setRecentSessions(nextSessions);
        const nextSession = nextSessions.find((candidate) => candidate.id === run.sessionId);
        if (nextSession) await openSessionSummary(nextSession);
      }
      setError(run.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAutomationBusyId(null);
    }
  }

  async function handleInstallAutomationScheduler() {
    setAutomationBusyId("scheduler");
    try {
      setAutomationScheduler(await installAutomationScheduler());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAutomationBusyId(null);
    }
  }

  async function handleUninstallAutomationScheduler() {
    setAutomationBusyId("scheduler");
    try {
      setAutomationScheduler(await uninstallAutomationScheduler());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAutomationBusyId(null);
    }
  }

  function chooseRightPane(tab: RightPaneTab, reason = "User selected pane", source: "user" | "agent" = "user") {
    const normalized = normalizeRightPaneTab(tab);
    setRightPaneTab(normalized);
    setPaneIntent({ tab: normalized, reason, confidence: 1 });
    setRightPaneUserLocked(source === "user");
  }

  function inspectWorkbenchItem(selection: InspectorSelection) {
    setInspectorSelection(selection);
    setRightPaneTab("run");
    setPaneIntent(null);
    setRightPaneUserLocked(true);
  }

  function openPluginsSurface() {
    openSettingsPanel("Plugins");
    void refreshMarketplaceNotes();
  }

  function openFigmaSurface() {
    chooseRightPane("figma", "Figma bridge opened");
    void getFigmaStatus().then(setFigmaStatus).catch(() => undefined);
  }

  function openDesignSystemSurface() {
    chooseRightPane("design-system", activeDesignArtifact ? "Design-system artifact opened" : "Design-system lane opened");
    void listDesignSystemArtifacts().then(updateDesignArtifacts).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }

  function openFigJamBoardSurface() {
    chooseRightPane("mermaid-board", mermaidBoard || mermaidBoardExports.length ? "FigJam board opened" : "FigJam board requested");
  }

  function openResearchLabSurface() {
    chooseRightPane("research-lab", "Research Lab opened");
  }

  function openAutomationsSurface() {
    setAutomationsOpen(true);
    void refreshAutomations();
  }

  function openChangelogSurface() {
    chooseRightPane("design-changelog", "Design memory opened");
    void refreshDesignChangelog();
  }

  function openCommandPalette(query = "") {
    setCommandPaletteQuery(query);
    setCommandPaletteOpen(true);
  }

  function startNewChat() {
    setSession(null);
    setEvents([]);
    setServerTrace(null);
    setCollapsedBlockIds(new Set());
    setPrompt("");
    setActiveConversationId(null);
    setConversationGoal("");
    setQueuedPrompt("");
  }

  function applyStarterPrompt(starter: (typeof STARTER_PROMPTS)[number]) {
    if (starter.label === CRITIQUE_SCREEN_STARTER_LABEL) {
      void runCritiqueScreenFlow(starter);
      return;
    }
    setPrompt(starter.template);
    setSelectedAction(starter.action);
    setChatMode(starter.chatMode);
    setPermissionMode(starter.permissionMode);
  }

  async function runCritiqueScreenFlow(starter: (typeof STARTER_PROMPTS)[number]) {
    setSelectedAction(starter.action);
    setChatMode(starter.chatMode);
    setPermissionMode(starter.permissionMode);
    if (runtimeHealth !== "ready" || !status || !harnessCanRun(currentHarness, starter.action)) {
      setRunBlockedMessage(runDisabledMessage);
      setPrompt(starter.template);
      return;
    }
    try {
      setError(null);
      setRunBlockedMessage(null);
      const result = await callComputerAction({ action: "captureScreen", approved: true });
      setComputerStatus(await getComputerStatus().catch(() => computerStatus));
      if (result.status !== "completed" || !result.artifactPath) {
        const fallbackPrompt = buildCritiqueScreenUnavailablePrompt(starter.template, result.message);
        setError(result.message || "Screen capture unavailable. Running critique without screenshot evidence.");
        await runWithPrompt(fallbackPrompt, {
          actionOverride: starter.action,
          chatModeOverride: starter.chatMode,
          permissionModeOverride: starter.permissionMode,
          attachmentsOverride: [],
          restorePromptOnFailure: true,
        });
        return;
      }
      const screenshotAttachment = attachmentFromScreenshot(result.artifactPath);
      await runWithPrompt(buildCritiqueScreenPrompt(starter.template, result.artifactPath), {
        actionOverride: starter.action,
        chatModeOverride: starter.chatMode,
        permissionModeOverride: starter.permissionMode,
        attachmentsOverride: [screenshotAttachment],
        restorePromptOnFailure: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setPrompt(starter.template);
    }
  }

  function applyModePreset(preset: (typeof MODE_PRESETS)[number]) {
    setPermissionMode(preset.permissionMode);
    setChatMode(preset.chatMode);
    setSelectedAction(preset.action);
  }

  function handleSlashCommand(command: SlashCommand) {
    const patch = applySlashCommand(command, { prompt });
    if (patch.clear) {
      setPrompt("");
    } else if (patch.openHelp) {
      setPrompt(slashHelpPrompt());
    } else if (patch.prompt !== undefined) {
      setPrompt(patch.prompt);
    }
    if (patch.action) setSelectedAction(patch.action);
    if (patch.chatMode) setChatMode(patch.chatMode);
    if (patch.permissionMode) setPermissionMode(patch.permissionMode);
    if (patch.harness) chooseHarness(patch.harness);
    if (patch.pane) chooseRightPane(patch.pane as RightPaneTab, patch.preview);
    if (patch.openUsage) void openUsageLimits(patch.preview);
    setSlashCommandIndex(0);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (slashCommandMatches.length > 0 && prompt.startsWith("/")) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashCommandIndex((current) => (current + 1) % slashCommandMatches.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashCommandIndex((current) => (current - 1 + slashCommandMatches.length) % slashCommandMatches.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        handleSlashCommand(selectedSlashCommand ?? slashCommandMatches[0]);
        return;
      }
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void run();
    }
  }

  async function openUsageLimits(reason = "Usage limits opened") {
    chooseRightPane("run", reason);
    setUsageLoading(true);
    try {
      setUsageSnapshot(await getUsageSnapshot());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUsageLoading(false);
    }
  }

  function toggleProjectFolder(projectId: string) {
    setExpandedProjectIds((current) =>
      current.includes(projectId) ? current.filter((candidate) => candidate !== projectId) : [projectId, ...current],
    );
  }

  async function openContextItem(item: ProjectMemoryItem) {
    setSelectedContextItem(item);
    setContextItemDetail(null);
    try {
      setContextItemDetail(await getProjectMemoryItem(item.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function openKnowledgeItem(item: StudioKnowledgeItem) {
    setSelectedKnowledgeItem(item);
    setKnowledgeItemDetail(null);
    try {
      setKnowledgeItemDetail(await getKnowledgeItem(item.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function chooseHarness(id: HarnessId) {
    const nextId = normalizeComposerHarness(id, harnesses);
    const nextHarness = harnesses.find((harness) => harness.id === nextId);
    setSelectedHarness(nextId);
    setSettingsDraft((current) => current ? { ...current, defaultHarness: nextId } : current);
    setSelectedAction((current) => resolveHarnessAction(current, nextHarness));
  }

  function chooseComposerHarness(harness: Harness) {
    chooseHarness(harness.id);
    if (!harness.enabled) openSettingsPanel("Agents");
  }

  async function saveSettings() {
    if (!settingsDraft) return;
    try {
      const saved = await saveConfig(settingsDraft);
      setSettingsDraft(saved);
      setSelectedHarness(normalizeComposerHarness(saved.defaultHarness, harnesses));
      setInputMode(saved.ui?.inputMode ?? "agent");
      setThemeMode(saved.ui?.theme === "light" ? "light" : "dark");
      setSettingsSavedAt(formatTime(new Date().toISOString()));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function resetWorkspaceScopedState() {
    setSession(null);
    setEvents([]);
    setServerTrace(null);
    setRecentSessions([]);
    setProjectMemory(null);
    setKnowledgeIndex(null);
    setSelectedContextItem(null);
    setContextItemDetail(null);
    setSelectedKnowledgeItem(null);
    setKnowledgeItemDetail(null);
    setMermaidBoard(null);
    setMermaidBoardExports([]);
  }

  async function handleOpenWorkspace(path?: string) {
    try {
      await openWorkspace(path);
      resetWorkspaceScopedState();
      await refresh();
      setSelectedHarness("codex");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCreateWorkspace() {
    const name = window.prompt("New folder name", "sarvesh-portfolio-landing");
    if (!name) return;
    try {
      await createWorkspace({
        parentPath: workspacePermissions?.homeRoot ? `${workspacePermissions.homeRoot}/Desktop` : null,
        name,
      });
      resetWorkspaceScopedState();
      await refresh();
      setSelectedHarness("codex");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function changeWorkspace() {
    await handleOpenWorkspace();
  }

  async function finishSetup() {
    if (!settingsDraft) return;
    const completedAt = new Date().toISOString();
    const nextConfig: StudioConfig = {
      ...settingsDraft,
      setup: {
        wizardVersion: 1,
        completedAt,
        dismissedAt: settingsDraft.setup?.dismissedAt ?? null,
        lastCheckedAt: completedAt,
        downloadReadyAcknowledged: true,
      },
    };
    try {
      const saved = await saveConfig(nextConfig);
      setSettingsDraft(saved);
      setSettingsSavedAt(formatTime(completedAt));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function refreshMemory() {
    try {
      setProjectMemory(await refreshProjectMemory());
      setKnowledgeIndex(await refreshKnowledgeIndex());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function refreshKnowledge() {
    try {
      setKnowledgeIndex(await refreshKnowledgeIndex());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleFigmaConnect() {
    setFigmaConnecting(true);
    setFigmaError(null);
    try {
      setFigmaStatus(await connectFigma(settingsDraft?.figma?.preferredPort ?? null));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFigmaError(message);
      setError(message);
    } finally {
      setFigmaConnecting(false);
    }
  }

  async function handleFigmaDisconnect() {
    setFigmaError(null);
    try {
      setFigmaStatus(await disconnectFigma());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFigmaError(message);
      setError(message);
    }
  }

  async function handleFigmaAction(input: FigmaAction | FigmaActionRequest) {
    setFigmaActionRunning(true);
    setFigmaError(null);
    try {
      const request = typeof input === "string" ? { action: input } : input;
      const result = await runFigmaAction(request);
      setFigmaActionResult(result);
      await refreshMemory();
      setFigmaStatus(await getFigmaStatus().catch(() => figmaStatus));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFigmaError(message);
      setError(message);
    } finally {
      setFigmaActionRunning(false);
    }
  }

  async function handleFigmaOpen() {
    setFigmaError(null);
    try {
      await openFigma(settingsDraft?.figma?.lastFileKey ?? null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFigmaError(message);
      setError(message);
    }
  }

  function patchSettings(update: (current: StudioConfig) => StudioConfig) {
    setSettingsDraft((current) => current ? update(current) : current);
  }

  async function handleComputerCaptureRequest() {
    const starter = STARTER_PROMPTS.find((candidate) => candidate.label === CRITIQUE_SCREEN_STARTER_LABEL);
    if (starter) {
      await runCritiqueScreenFlow(starter);
      return;
    }
    try {
      const result = await callComputerAction({ action: "captureScreen", approved: true });
      setError(result.status === "approval_required" ? result.message : null);
      setComputerStatus(await getComputerStatus().catch(() => computerStatus));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleMacOSPermissionOpen(permission: string) {
    try {
      await openComputerTarget({
        target: "url",
        value: macOSSettingsUrl(permission),
        approved: true,
      });
      setComputerStatus(await getComputerStatus().catch(() => computerStatus));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function addFilesToComposer(files: FileList | File[], source: StudioAttachmentSource) {
    for (const file of Array.from(files)) {
      try {
        const isText = file.type.startsWith("text/") || /\.(md|mdx|txt|json|yaml|yml|csv)$/i.test(file.name);
        const isImage = file.type.startsWith("image/");
        const dataUrl = isText ? undefined : await readFileAsDataUrl(file);
        const captured = await captureAttachment({
          kind: isImage ? "image" : isText ? "text" : "file",
          name: file.name,
          mimeType: file.type || (isText ? "text/plain" : "application/octet-stream"),
          source,
          text: isText ? await readFileAsText(file) : undefined,
          dataUrl,
        });
        setAttachments((current) => [...current, isImage && dataUrl ? { ...captured, previewUrl: dataUrl } : captured]);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }

  async function addTextMaterial(text: string, source: StudioAttachmentSource) {
    const captured = await captureAttachment({
      kind: "text",
      name: "pasted-material.txt",
      mimeType: "text/plain",
      source,
      text,
    });
    setAttachments((current) => [...current, captured]);
  }

  function attachmentFromScreenshot(path: string): StudioAttachment {
    const name = path.split(/[\\/]/).filter(Boolean).at(-1) ?? "screen-capture.png";
    return {
      id: `screen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      kind: "image",
      name,
      mimeType: "image/png",
      size: 0,
      source: "material",
      path,
      createdAt: new Date().toISOString(),
    };
  }

  function handlePromptPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files).filter((file) => file.size > 0);
    if (files.length) {
      event.preventDefault();
      void addFilesToComposer(files, "paste");
      return;
    }
    const text = event.clipboardData.getData("text/plain");
    if (text.length > 1200) {
      event.preventDefault();
      void addTextMaterial(text, "material").catch((err) => setError(err instanceof Error ? err.message : String(err)));
    }
  }

  function handleComposerDrop(event: DragEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    if (event.dataTransfer.files.length) void addFilesToComposer(event.dataTransfer.files, "drop");
  }

  function handleChatRailPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const container = event.currentTarget.parentElement;
    const bounds = container?.getBoundingClientRect();
    const totalWidth = Math.max(bounds?.width ?? window.innerWidth, 1);

    const applyWidth = (clientX: number) => {
      const left = bounds?.left ?? 0;
      const nextWidth = ((clientX - left) / totalWidth) * 100;
      setChatRailWidthPercent(clampNumber(nextWidth, MIN_CHAT_RAIL_WIDTH_PERCENT, MAX_CHAT_RAIL_WIDTH_PERCENT));
    };

    applyWidth(event.clientX);

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      applyWidth(moveEvent.clientX);
    };
    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  function handleChatRailResizeKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -2 : 2;
      setChatRailWidthPercent((current) => clampNumber(current + direction, MIN_CHAT_RAIL_WIDTH_PERCENT, MAX_CHAT_RAIL_WIDTH_PERCENT));
    }
    if (event.key === "Home") {
      event.preventDefault();
      setChatRailWidthPercent(MIN_CHAT_RAIL_WIDTH_PERCENT);
    }
    if (event.key === "End") {
      event.preventDefault();
      setChatRailWidthPercent(MAX_CHAT_RAIL_WIDTH_PERCENT);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      setChatRailWidthPercent(DEFAULT_CHAT_RAIL_WIDTH_PERCENT);
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  async function run() {
    if (runtimeHealth !== "ready" || !status || !prompt.trim() || !harnessCanRun(currentHarness, effectiveAction)) {
      setRunBlockedMessage(runDisabledMessage);
      return;
    }
    const submittedPrompt = prompt.trim();
    if (isSessionActive) {
      setQueuedPrompt(submittedPrompt);
      setPrompt("");
      return;
    }
    setPrompt("");
    setRunBlockedMessage(null);
    await runWithPrompt(submittedPrompt, { restorePromptOnFailure: true });
  }

  async function runWithPrompt(text: string, options: {
    conversationIdOverride?: string | null;
    restorePromptOnFailure?: boolean;
    actionOverride?: StudioAction;
    chatModeOverride?: StudioChatMode;
    permissionModeOverride?: StudioPermissionMode;
    attachmentsOverride?: StudioAttachment[];
  } = {}) {
    const actionForRun = options.actionOverride ?? effectiveAction;
    const chatModeForRun = options.chatModeOverride ?? chatMode;
    const permissionModeForRun = options.permissionModeOverride ?? permissionMode;
    const attachmentsForRun = options.attachmentsOverride ?? attachments;
    if (!status || !text.trim() || !harnessCanRun(currentHarness, actionForRun)) {
      setRunBlockedMessage(runDisabledMessage);
      return;
    }
    setEvents([]);
    setServerTrace(null);
    setError(null);
    setRunBlockedMessage(null);
    setCollapsedBlockIds(new Set());
    setStartingPrompt(text.trim());
    setIsStartingSession(true);
    const continuingConversationId = options.conversationIdOverride !== undefined
      ? options.conversationIdOverride
      : canContinueConversation
        ? activeConversationId
        : null;
    try {
      const nextSession = await startSession({
        harness: selectedHarness,
        action: actionForRun,
        cwd: status.projectRoot,
        prompt: text,
        chatMode: chatModeForRun,
        permissionMode: permissionModeForRun,
        attachments: attachmentsForRun,
        ...(continuingConversationId ? { conversationId: continuingConversationId } : {}),
        ...(conversationGoal.trim() ? { goal: conversationGoal.trim() } : {}),
        ...(activeModelId ? { model: activeModelId } : {}),
        ...(selectedEffort && effortOptions.includes(selectedEffort) ? { effort: selectedEffort } : {}),
      });
      setAttachments([]);
      setSession(nextSession);
      setGoalEditorOpen(false);
      setActiveConversationId(nextSession.conversationId ?? nextSession.id);
      setRecentSessions((current) => [nextSession, ...current.filter((candidate) => candidate.id !== nextSession.id)].slice(0, 8));
      await refreshSessionTrace(nextSession.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      if (options.restorePromptOnFailure) {
        setPrompt((current) => current.trim() ? current : text);
      }
    } finally {
      setStartingPrompt("");
      setIsStartingSession(false);
    }
  }

  async function cancel() {
    if (!session) return;
    await cancelSession(session.id);
    await refreshSessionTrace(session.id);
  }

  async function handleResolveApproval(callId: string, decision: "approve" | "deny") {
    if (!session) return;
    try {
      await resolveApproval(session.id, callId, decision);
      await refreshSessionTrace(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function toggleBlock(blockId: string) {
    setCollapsedBlockIds((current) => {
      const next = new Set(current);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }

  function attachBlock(block: TerminalBlock) {
    const snippet = block.messages.join("").trim();
    if (!snippet) return;
    setPrompt((current) => `${current.trim()}\n\nUse this ${block.title} as context:\n${trimText(snippet, 1200)}`.trim());
  }

  function attachWorkspaceContext() {
    const contextLines = [
      `Harness: ${currentHarness?.label ?? selectedHarness}`,
      `Action: ${effectiveAction}`,
      `Readiness: ${harnessStatusCopy}`,
      designTrace ? `Design trace: ${designTrace.reviewLabel}` : null,
      designTrace?.designSystemFiles.length ? `Design-system files: ${designTrace.designSystemFiles.slice(0, 5).map((file) => file.path).join(", ")}` : null,
      traceModel.references.length ? `References: ${traceModel.references.slice(0, 5).map((item) => item.label).join(", ")}` : null,
    ].filter(Boolean);
    setPrompt((current) => `${current.trim()}\n\nUse this Studio context:\n${contextLines.join("\n")}`.trim());
  }

  function handleConversationScroll() {
    const element = scrollRegionRef.current;
    if (!element) return;
    if (latestScrollRestoringRef.current) {
      element.dataset.autoScrollState = "pinned";
      return;
    }
    const pinned = isNearScrollBottom(element);
    element.dataset.autoScrollState = pinned ? "pinned" : "paused";
    setUserPinnedToBottom((current) => current === pinned ? current : pinned);
  }

  function scrollConversationToLatest(behavior: ScrollBehavior = "auto") {
    latestScrollRestoringRef.current = true;
    setUserPinnedToBottom(true);
    scrollRetryTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    scrollRetryTimeoutsRef.current = [];
    const scrollNow = (nextBehavior: ScrollBehavior) => {
      const element = scrollRegionRef.current;
      if (!element) return null;
      element.dataset.autoScrollState = "pinned";
      element.scrollTo({ top: element.scrollHeight, behavior: nextBehavior });
      element.scrollTop = element.scrollHeight;
      bottomAnchorRef.current?.scrollIntoView({ block: "end", behavior: nextBehavior });
      setUserPinnedToBottom(true);
      return element;
    };
    if (!scrollNow(behavior)) {
      latestScrollRestoringRef.current = false;
      bottomAnchorRef.current?.scrollIntoView({ block: "end", behavior });
      return;
    }
    window.requestAnimationFrame(() => {
      scrollNow("auto");
      window.requestAnimationFrame(() => scrollNow("auto"));
    });
    scrollRetryTimeoutsRef.current = [80, 220, 420].map((delay) =>
      window.setTimeout(() => {
        const element = scrollNow("auto");
        if (delay === 420) {
          const stillPinned = element ? isNearScrollBottom(element) : true;
          if (element) element.dataset.autoScrollState = stillPinned ? "pinned" : "paused";
          latestScrollRestoringRef.current = false;
          setUserPinnedToBottom(stillPinned);
        }
      }, delay),
    );
  }

  function handleChatFollowUp(text: string) {
    setPrompt((current) => `${current.trim()}\n\n${text}`.trim());
  }

  function pinCurrentChatMemory() {
    const nextPin = [
      activeDesignArtifact?.title,
      designTrace?.reviewLabel,
      latestRun?.prompt,
      prompt,
    ].find((value): value is string => Boolean(value?.trim())) ?? "Current chat context";
    setChatMemoryPins((current) => [trimText(nextPin, 96), ...current.filter((pin) => pin !== nextPin)].slice(0, 6));
  }

  function branchCurrentChat() {
    setSession(null);
    setEvents([]);
    setServerTrace(null);
    setPrompt(`Branch from ${latestRun ? trimText(latestRun.prompt, 120) : "current chat"}:\n${prompt}`.trim());
    setChatSearchQuery("");
    scrollConversationToLatest("auto");
  }

  function copyCurrentVerificationReceipt() {
    const receipt = [
      `Session: ${session?.id ?? "draft"}`,
      `Status: ${visibleSessionStatus}`,
      `Files: ${designTrace?.files.length ?? 0}`,
      `Artifacts: ${sessionDesignArtifacts.length}`,
      `Events: ${events.length}`,
      lastFailure ? `Failure: ${lastFailure.message}` : "Failures: none",
    ].join("\n");
    void copyText(receipt);
  }

  function handleAttachmentPick(event: ChangeEvent<HTMLInputElement>) {
    void addFilesToComposer(event.target.files ?? [], "file");
    event.currentTarget.value = "";
  }

  async function reviewArtifactSection(
    artifactId: string,
    sectionId: string,
    reviewState: "unreviewed" | "looks_good" | "needs_work",
    comment?: string,
  ) {
    try {
      const artifact = await reviewDesignSystemArtifactSection({ artifactId, sectionId, reviewState, comment });
      setSelectedArtifactId(artifact.id);
      setDesignArtifacts((current) => [artifact, ...current.filter((candidate) => candidate.id !== artifact.id)]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveDesignSystemArtifact(nextArtifact: DesignSystemArtifact) {
    try {
      const artifact = await captureDesignSystemArtifact({
        artifact: {
          ...nextArtifact,
          updatedAt: new Date().toISOString(),
        },
      });
      setSelectedArtifactId(artifact.id);
      setDesignArtifacts((current) => [artifact, ...current.filter((candidate) => candidate.id !== artifact.id)]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  async function handleFixDesignSystemSection(
    artifactId: string,
    sectionId: string,
    comment?: string,
  ) {
    const artifact = designArtifacts.find((candidate) => candidate.id === artifactId) ?? activeDesignArtifact;
    const section = artifact?.sections.find((candidate) => candidate.id === sectionId);
    await reviewArtifactSection(artifactId, sectionId, "needs_work", comment ?? `${section?.title ?? "Section"} needs a follow-up pass.`);
    setSelectedArtifactId(artifactId);
    setPermissionMode("guarded");
    setChatMode("build");
    setSelectedAction("fix");
    const sourceRefs = section?.sourceRefs?.slice(0, 5).map((ref) => `${ref.label}${ref.sourcePath ? ` (${ref.sourcePath}${ref.line ? `:${ref.line}` : ""})` : ""}`).join("\n") ?? "No source refs captured.";
    setPrompt([
      `Fix design-system review section: ${section?.title ?? sectionId}`,
      `Artifact: ${artifact?.title ?? artifactId}`,
      `Artifact id: ${artifactId}`,
      `Section id: ${sectionId}`,
      "",
      "Source refs:",
      sourceRefs,
      "",
      "Keep the fix scoped, verify visually, and report changes before marking the section OK.",
    ].join("\n"));
    chooseRightPane("run", "Design-system fix prepared");
    requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Prompt"]')?.focus();
    });
  }

  function useDesignSystemArtifact(artifact: DesignSystemArtifact) {
    setSelectedArtifactId(artifact.id);
    setPrompt((current) => `${current.trim()}\n\nUse design system artifact: ${artifact.title}\n${artifact.sections.map((section) => `${section.title}: ${section.summary}`).join("\n")}`.trim());
  }

  async function runScenarioLabModelSwarm() {
    if (!status?.projectRoot) return;
    setScenarioRunning(true);
    setError(null);
    try {
      const modelsCall = await callStudioTool({
        toolId: "simulation.models",
        cwd: status.projectRoot,
        input: {},
      });
      const profiles = (modelsCall.data as { profiles?: ScenarioModelProfile[] } | undefined)?.profiles ?? [];
      setScenarioModels(profiles);

      const matrixCall = await callStudioTool({
        toolId: "simulation.run_matrix",
        cwd: status.projectRoot,
        input: {
          adapter: "model-swarm",
          hypotheses: [
            scenarioHypothesis,
            `${scenarioHypothesis} with stricter ${scenarioVariable.toLowerCase()} thresholds`,
          ],
          maxAgents: 20,
          rounds: 2,
          allowLiveModels: false,
        },
      });
      const matrix = (matrixCall.data as ScenarioMatrixState | undefined) ?? { runs: [] };
      setScenarioMatrix(matrix);
      const firstRunId = matrix.runs?.[0]?.run?.id;
      if (firstRunId) {
        const transcriptCall = await callStudioTool({
          toolId: "simulation.transcript",
          cwd: status.projectRoot,
          input: { runId: firstRunId },
        });
        setScenarioTranscripts((transcriptCall.data as { transcripts?: ScenarioTranscriptItem[] } | undefined)?.transcripts ?? []);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setScenarioRunning(false);
    }
  }

  async function studyResearchHarness() {
    if (!status?.projectRoot || !researchStudyHarness) return;
    setScenarioRunning(true);
    setError(null);
    try {
      const studyCall = await callStudioTool({
        toolId: "harness.study",
        cwd: status.projectRoot,
        input: { harnessId: researchStudyHarness.id },
      });
      const study = (studyCall.data as { study?: HarnessStudySummary } | undefined)?.study ?? null;
      setHarnessStudy(study);
      const patternsCall = await callStudioTool({
        toolId: "research.patterns.extract",
        cwd: status.projectRoot,
        input: { study, events },
      });
      setResearchPatterns((patternsCall.data as { patterns?: ResearchPatternSummary[] } | undefined)?.patterns ?? []);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setScenarioRunning(false);
    }
  }

  async function refreshResearchPatterns() {
    if (!status?.projectRoot) return;
    setScenarioRunning(true);
    setError(null);
    try {
      const patternsCall = await callStudioTool({
        toolId: "research.patterns.list",
        cwd: status.projectRoot,
        input: {},
      });
      setResearchPatterns((patternsCall.data as { patterns?: ResearchPatternSummary[] } | undefined)?.patterns ?? []);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setScenarioRunning(false);
    }
  }

  async function exportScenarioLabToFigJam() {
    if (!status?.projectRoot) return;
    setScenarioRunning(true);
    setError(null);
    try {
      const runId = scenarioMatrix?.comparison?.winnerRunId ?? scenarioMatrix?.runs?.[0]?.run?.id;
      const packageCall = await callStudioTool({
        toolId: "research.design_package",
        cwd: status.projectRoot,
        input: {
          intent: "Vibe design a research-backed product decision workspace for product people.",
          hypothesis: scenarioHypothesis,
          runId,
        },
      });
      const designPackage = (packageCall.data as { package?: ScenarioDesignPackage } | undefined)?.package ?? null;
      setScenarioDesignPackage(designPackage);

      const exportCall = await callStudioTool({
        toolId: "mermaid_jam.export",
        cwd: status.projectRoot,
        input: {
          source: runId ?? "research",
          intent: "Vibe design a research-backed product decision workspace for product people.",
          hypothesis: scenarioHypothesis,
          runId,
        },
      });
      const exports = (exportCall.data as { exports?: ScenarioFigJamExport[] } | undefined)?.exports ?? [];
      setScenarioFigJamExports(exports);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setScenarioRunning(false);
    }
  }

  async function ensureMermaidBoardRuntimeReady(options: { requirePm?: boolean } = {}): Promise<string> {
    try {
      const [nextStatus, nextTools] = await Promise.all([getStatus(), listStudioTools()]);
      setStatus(nextStatus);
      setStudioTools(nextTools);
      if (!nextStatus.projectRoot || (!hasCoreMermaidBoardToolContract(nextTools) && !hasMermaidSourceToolContract(nextTools))) {
        throw new Error(MERMAID_BOARD_RUNTIME_UNAVAILABLE);
      }
      if (options.requirePm && !hasPmMermaidBoardToolContract(nextTools)) {
        throw new Error(MERMAID_BOARD_PM_RUNTIME_STALE);
      }
      return nextStatus.projectRoot;
    } catch (err) {
      if (err instanceof Error && err.message === MERMAID_BOARD_PM_RUNTIME_STALE) {
        throw err;
      }
      setStatus(null);
      setStudioTools([]);
      throw new Error(MERMAID_BOARD_RUNTIME_UNAVAILABLE);
    }
  }

  async function handleRestartStudioRuntime() {
    setMermaidBoardLoading(true);
    setMermaidBoardError(null);
    try {
      const restarted = await restartStudioRuntime();
      if (!restarted) {
        throw new Error("Packaged runtime restart is unavailable in browser preview. Restart the Studio runtime process, then refresh this board.");
      }
      const fresh = await waitForMermaidBoardRuntimeTools();
      setStatus(fresh.status);
      setRuntimeMetrics(fresh.status.metrics ?? null);
      setRuntimeHealth("ready");
      setRuntimeRecoveryMessage(null);
      setStudioTools(fresh.tools);
      setError(null);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setMermaidBoardError(message);
      setError(message);
    } finally {
      setMermaidBoardLoading(false);
    }
  }

  async function handleCreateMermaidBoard() {
    setMermaidBoardLoading(true);
    setMermaidBoardError(null);
    try {
      const projectRoot = await ensureMermaidBoardRuntimeReady();
      if (!mermaidBoardToolRuntimeReady && mermaidSourceRuntimeReady) {
        const readyBoard = createLocalMermaidBoard(prompt || latestRun?.prompt || "", mermaidBoard?.id ?? "studio-mermaid-board", "pm-brainstorm");
        setMermaidBoard(readyBoard);
        chooseRightPane("mermaid-board", "Local FigJam source board ready");
        setError(null);
        return;
      }
      const call = await callStudioTool({
        toolId: "board.create",
        cwd: projectRoot,
        input: {
          id: mermaidBoard?.id ?? "studio-mermaid-board",
          mode: "pm-brainstorm",
          templateId: "pm-brainstorm",
          prompt: prompt || latestRun?.prompt || "",
        },
      });
      assertToolCallCompleted(call);
      const board = (call.data as { board?: MermaidBoard } | undefined)?.board;
      if (!board) throw new Error("Board create did not return a board.");
      const readyBoard = hydrateMermaidBoardAgentSurface(board);
      setMermaidBoard(readyBoard);
      chooseRightPane("mermaid-board", readyBoard.agentSurface.startSummary ?? readyBoard.title);
      setError(null);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setMermaidBoardError(message);
      setError(message);
    } finally {
      setMermaidBoardLoading(false);
    }
  }

  async function handleApplyMermaidBoardTemplate() {
    setMermaidBoardLoading(true);
    setMermaidBoardError(null);
    try {
      const projectRoot = await ensureMermaidBoardRuntimeReady({ requirePm: mermaidBoardToolRuntimeReady });
      if (!mermaidBoardToolRuntimeReady) {
        const readyBoard = createLocalMermaidBoard(prompt || latestRun?.prompt || "", mermaidBoard?.id ?? "studio-mermaid-board", "pm-brainstorm");
        setMermaidBoard(readyBoard);
        chooseRightPane("mermaid-board", "Local product board template ready");
        setError(null);
        return;
      }
      const call = await callStudioTool({
        toolId: "board.apply_template",
        cwd: projectRoot,
        input: {
          boardId: mermaidBoard?.id ?? "studio-mermaid-board",
          templateId: "pm-brainstorm",
          prompt: prompt || latestRun?.prompt || "",
        },
      });
      assertToolCallCompleted(call);
      const board = (call.data as { board?: MermaidBoard } | undefined)?.board;
      if (!board) throw new Error("Board template did not return a board.");
      const readyBoard = hydrateMermaidBoardAgentSurface(board);
      setMermaidBoard(readyBoard);
      chooseRightPane("mermaid-board", readyBoard.agentSurface.briefLabel ?? readyBoard.title);
      setError(null);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setMermaidBoardError(message);
      setError(message);
    } finally {
      setMermaidBoardLoading(false);
    }
  }

  async function handleAddMermaidBoardNode(kind: MermaidBoardNodeKind) {
    setMermaidBoardLoading(true);
    setMermaidBoardError(null);
    try {
      const projectRoot = await ensureMermaidBoardRuntimeReady();
      const context = trimText((prompt || latestRun?.prompt || "").trim(), 240);
      if (!mermaidBoardToolRuntimeReady && mermaidSourceRuntimeReady) {
        const readyBoard = addLocalMermaidBoardNode(mermaidBoard ?? createLocalMermaidBoard(prompt || latestRun?.prompt || "", "studio-mermaid-board", "pm-brainstorm"), kind, context);
        setMermaidBoard(readyBoard);
        chooseRightPane("mermaid-board", readyBoard.nodes.at(-1)?.title ?? readyBoard.title);
        setError(null);
        return;
      }
      const call = await callStudioTool({
        toolId: "board.add_node",
        cwd: projectRoot,
        input: {
          boardId: mermaidBoard?.id ?? "studio-mermaid-board",
          kind,
          body: context || undefined,
          author: "agent",
          sourceEventIds: latestRun?.id ? [latestRun.id] : [],
        },
      });
      assertToolCallCompleted(call);
      const board = (call.data as { board?: MermaidBoard } | undefined)?.board;
      if (!board) throw new Error("Board add node did not return a board.");
      const readyBoard = hydrateMermaidBoardAgentSurface(board);
      setMermaidBoard(readyBoard);
      const addedNode = readyBoard.nodes.at(-1);
      chooseRightPane("mermaid-board", addedNode?.title ?? readyBoard.title);
      setError(null);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setMermaidBoardError(message);
      setError(message);
    } finally {
      setMermaidBoardLoading(false);
    }
  }

  async function handleLayoutMermaidBoard() {
    setMermaidBoardLoading(true);
    setMermaidBoardError(null);
    try {
      const projectRoot = await ensureMermaidBoardRuntimeReady();
      if (!mermaidBoardToolRuntimeReady && mermaidBoard) {
        const readyBoard = hydrateMermaidBoardAgentSurface(layoutLocalMermaidBoard(mermaidBoard));
        setMermaidBoard(readyBoard);
        chooseRightPane("mermaid-board", "Local board arranged");
        setError(null);
        return;
      }
      const call = await callStudioTool({
        toolId: "board.layout",
        cwd: projectRoot,
        input: { boardId: mermaidBoard?.id ?? "studio-mermaid-board" },
      });
      assertToolCallCompleted(call);
      const board = (call.data as { board?: MermaidBoard } | undefined)?.board;
      if (!board) throw new Error("Board layout did not return a board.");
      const readyBoard = hydrateMermaidBoardAgentSurface(board);
      setMermaidBoard(readyBoard);
      chooseRightPane("mermaid-board", readyBoard.agentSurface.actions.find((action) => action.id === "board.layout")?.label ?? readyBoard.title);
      setError(null);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setMermaidBoardError(message);
      setError(message);
    } finally {
      setMermaidBoardLoading(false);
    }
  }

  async function handleExportMermaidBoard() {
    setMermaidBoardLoading(true);
    setMermaidBoardError(null);
    try {
      const projectRoot = await ensureMermaidBoardRuntimeReady();
      if (!mermaidBoardToolRuntimeReady && mermaidSourceRuntimeReady) {
        const call = await callStudioTool({
          toolId: "mermaid_jam.export",
          cwd: projectRoot,
          input: { source: "research", intent: prompt || latestRun?.prompt || mermaidBoard?.title || "Product design board" },
        });
        assertToolCallCompleted(call);
        const exports = mermaidBoardExportsFromResearchCall(call.data);
        setMermaidBoardExports(exports);
        chooseRightPane("mermaid-board", "Local Mermaid Jam source ready");
        setError(null);
        return;
      }
      const call = await callStudioTool({
        toolId: "board.export_mermaid_jam",
        cwd: projectRoot,
        input: { boardId: mermaidBoard?.id ?? "studio-mermaid-board" },
      });
      assertToolCallCompleted(call);
      const payload = call.data as { board?: MermaidBoard; exports?: MermaidBoardExport[] } | undefined;
      if (payload?.board) {
        setMermaidBoard(hydrateMermaidBoardAgentSurface(payload.board));
      }
      setMermaidBoardExports(payload?.exports ?? []);
      const source = payload?.exports?.[0]?.integration;
      await openMermaidJamIntegration(source === "local-manifest" ? "local-manifest" : "community").catch(() => undefined);
      chooseRightPane("mermaid-board", "Exported Mermaid Jam source");
      setError(null);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setMermaidBoardError(message);
      setError(message);
    } finally {
      setMermaidBoardLoading(false);
    }
  }

  async function handleSyncMermaidBoardToFigJam() {
    setMermaidBoardLoading(true);
    setMermaidBoardError(null);
    try {
      const projectRoot = await ensureMermaidBoardRuntimeReady({ requirePm: mermaidBoardToolRuntimeReady });
      if (!mermaidBoardToolRuntimeReady && mermaidSourceRuntimeReady) {
        const call = await callStudioTool({
          toolId: "mermaid_jam.export",
          cwd: projectRoot,
          input: { source: "research", intent: prompt || latestRun?.prompt || mermaidBoard?.title || "Product design board" },
        });
        assertToolCallCompleted(call);
        const exports = mermaidBoardExportsFromResearchCall(call.data);
        setMermaidBoardExports(exports);
        if (mermaidBoard) {
          setMermaidBoard({
            ...mermaidBoard,
            lastFigJamSync: localFigJamFallbackSync(exports),
            updatedAt: new Date().toISOString(),
          });
        }
        chooseRightPane("mermaid-board", "Mermaid Jam source ready");
        setError(null);
        return;
      }
      const call = await callStudioTool({
        toolId: "board.sync_figjam",
        cwd: projectRoot,
        input: { boardId: mermaidBoard?.id ?? "studio-mermaid-board" },
      });
      assertToolCallCompleted(call);
      const payload = call.data as { board?: MermaidBoard; exports?: MermaidBoardExport[]; sync?: MermaidBoard["lastFigJamSync"] } | undefined;
      if (payload?.board) {
        setMermaidBoard(hydrateMermaidBoardAgentSurface(payload.board));
      }
      setMermaidBoardExports(payload?.exports ?? []);
      if (payload?.sync?.status !== "synced") {
        const source = payload?.sync?.integration ?? payload?.exports?.[0]?.integration;
        await openMermaidJamIntegration(source === "local-manifest" ? "local-manifest" : "community").catch(() => undefined);
      }
      chooseRightPane("mermaid-board", payload?.sync?.status === "synced" ? "Synced board to FigJam" : "Mermaid Jam source ready");
      setError(null);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setMermaidBoardError(message);
      setError(message);
    } finally {
      setMermaidBoardLoading(false);
    }
  }

  function handleUseMermaidBoardAgentPrompt(nextPrompt: string) {
    setPrompt(nextPrompt);
    chooseRightPane("mermaid-board", "Brainstorm prompt ready");
  }

  async function handleCaptureIABoard() {
    setIaBoardLoading(true);
    setIaBoardError(null);
    try {
      const projectRoot = await ensureMermaidBoardRuntimeReady();
      if (!mermaidBoardToolRuntimeReady && mermaidSourceRuntimeReady) {
        const readyBoard = createLocalMermaidBoard(prompt || latestRun?.prompt || "", iaBoard?.id ?? "studio-ia-board", "ia");
        setIaBoard(readyBoard);
        chooseRightPane("ia", "Local IA board ready");
        setError(null);
        return;
      }
      const call = await callStudioTool({
        toolId: "board.capture_ia",
        cwd: projectRoot,
        sessionId: session?.id ?? latestRun?.id ?? null,
        input: {
          boardId: iaBoard?.id ?? "studio-ia-board",
          mode: "ia",
          templateId: "ia-journeys",
          prompt: prompt || latestRun?.prompt || "",
          sessionId: session?.id ?? latestRun?.id ?? null,
          events,
        },
      });
      assertToolCallCompleted(call);
      const board = (call.data as { board?: MermaidBoard } | undefined)?.board;
      if (!board) throw new Error("IA capture did not return a board.");
      setIaBoard(hydrateMermaidBoardAgentSurface(board));
      chooseRightPane("ia", "IA captured");
      setError(null);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setIaBoardError(message);
      setError(message);
    } finally {
      setIaBoardLoading(false);
    }
  }

  async function handleExportIABoard() {
    setIaBoardLoading(true);
    setIaBoardError(null);
    try {
      const projectRoot = await ensureMermaidBoardRuntimeReady();
      if (!mermaidBoardToolRuntimeReady && mermaidSourceRuntimeReady) {
        const call = await callStudioTool({
          toolId: "mermaid_jam.export",
          cwd: projectRoot,
          input: { source: "research", intent: prompt || latestRun?.prompt || iaBoard?.title || "IA board" },
        });
        assertToolCallCompleted(call);
        const exports = mermaidBoardExportsFromResearchCall(call.data);
        setIaBoardExports(exports);
        chooseRightPane("ia", "IA source ready");
        setError(null);
        return;
      }
      const call = await callStudioTool({
        toolId: "board.export_mermaid_jam",
        cwd: projectRoot,
        input: { boardId: iaBoard?.id ?? "studio-ia-board" },
      });
      assertToolCallCompleted(call);
      const payload = call.data as { board?: MermaidBoard; exports?: MermaidBoardExport[] } | undefined;
      if (payload?.board) setIaBoard(hydrateMermaidBoardAgentSurface(payload.board));
      setIaBoardExports(payload?.exports ?? []);
      const source = payload?.exports?.[0]?.integration;
      await openMermaidJamIntegration(source === "local-manifest" ? "local-manifest" : "community").catch(() => undefined);
      chooseRightPane("ia", "IA export ready");
      setError(null);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setIaBoardError(message);
      setError(message);
    } finally {
      setIaBoardLoading(false);
    }
  }

  async function handleSyncIABoardToFigJam() {
    setIaBoardLoading(true);
    setIaBoardError(null);
    try {
      const projectRoot = await ensureMermaidBoardRuntimeReady({ requirePm: mermaidBoardToolRuntimeReady });
      if (!mermaidBoardToolRuntimeReady && mermaidSourceRuntimeReady) {
        const call = await callStudioTool({
          toolId: "mermaid_jam.export",
          cwd: projectRoot,
          input: { source: "research", intent: prompt || latestRun?.prompt || iaBoard?.title || "IA board" },
        });
        assertToolCallCompleted(call);
        const exports = mermaidBoardExportsFromResearchCall(call.data);
        setIaBoardExports(exports);
        if (iaBoard) {
          setIaBoard({
            ...iaBoard,
            lastFigJamSync: localFigJamFallbackSync(exports),
            updatedAt: new Date().toISOString(),
          });
        }
        chooseRightPane("ia", "IA source ready");
        setError(null);
        return;
      }
      const call = await callStudioTool({
        toolId: "board.sync_figjam",
        cwd: projectRoot,
        input: { boardId: iaBoard?.id ?? "studio-ia-board" },
      });
      assertToolCallCompleted(call);
      const payload = call.data as { board?: MermaidBoard; exports?: MermaidBoardExport[]; sync?: MermaidBoard["lastFigJamSync"] } | undefined;
      if (payload?.board) setIaBoard(hydrateMermaidBoardAgentSurface(payload.board));
      setIaBoardExports(payload?.exports ?? []);
      if (payload?.sync?.status !== "synced") {
        const source = payload?.sync?.integration ?? payload?.exports?.[0]?.integration;
        await openMermaidJamIntegration(source === "local-manifest" ? "local-manifest" : "community").catch(() => undefined);
      }
      chooseRightPane("ia", payload?.sync?.status === "synced" ? "IA synced" : "IA source ready");
      setError(null);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setIaBoardError(message);
      setError(message);
    } finally {
      setIaBoardLoading(false);
    }
  }

  function handleUseIAAgentPrompt(nextPrompt: string) {
    setPrompt(nextPrompt);
    setSelectedAction("design-doc");
    setChatMode("research");
    setPermissionMode("plan");
    chooseRightPane("run", "IA prompt ready");
  }

  function renderScenarioLab() {
    const latestMatrixRun = scenarioMatrix?.runs?.[0]?.run;
    const winnerRunId = scenarioMatrix?.comparison?.winnerRunId ?? latestMatrixRun?.id ?? null;
    const scorecard = latestMatrixRun?.scorecard;
    const studiedHarnessLabel = harnessStudy?.label ?? researchStudyHarness?.label ?? "Agent";
    const studiedHarnessNodeId = harnessStudy ? "model-study" : null;
    const edges = [
      ["agent-pm", "finding-risk"],
      ["agent-research", "finding-risk"],
      ["model-codex", "agent-pm"],
      ...(studiedHarnessNodeId ? [[studiedHarnessNodeId, "agent-research"] as [string, string]] : []),
      ["variable", "finding-risk"],
      ["finding-risk", "outcome"],
    ] as Array<[string, string]>;
    const nodes = layoutScenarioLabGraph([
      { id: "agent-pm", label: "PM", kind: "agent" },
      { id: "agent-research", label: "Research", kind: "agent" },
      { id: "model-codex", label: "Codex", kind: "agent" },
      ...(studiedHarnessNodeId ? [{ id: studiedHarnessNodeId, label: studiedHarnessLabel, kind: "agent" } as ScenarioLabNode] : []),
      { id: "finding-risk", label: "Risk", kind: "finding" },
      { id: "variable", label: scenarioVariable, kind: "variable" },
      { id: "outcome", label: winnerRunId ? "Winner" : "Spec", kind: "outcome" },
    ], edges);
    const selected = nodes.find((node) => node.id === selectedScenarioNode) ?? nodes[0];
    const timeline = latestMatrixRun?.rounds?.length
      ? latestMatrixRun.rounds.map((_, index) => ({ label: `Round ${index + 1}`, text: `${latestMatrixRun.transcripts?.length ?? 0} transcript turns captured.` }))
      : [];
    const designSpecCount = scenarioDesignPackage?.specs
      ? Object.values(scenarioDesignPackage.specs).reduce((total, specs) => total + (Array.isArray(specs) ? specs.length : 0), 0)
      : 0;
    const researchSources = researchSourcesFromEvents(events);
    return (
      <section className="scenario-lab" data-scenario-lab="research-lab-model-swarm" data-browser-research-harness={effectiveAction === "browser-audit" ? "active" : "ready"}>
        <header className="scenario-lab-head">
          <div>
            <p className="eyebrow">Research Lab</p>
            <h2>PM harness study</h2>
          </div>
          <div className="scenario-head-actions">
            <button type="button" data-action-id="research-lab.harness-study" onClick={() => void studyResearchHarness()} disabled={scenarioRunning || !status?.projectRoot || !researchStudyHarness}>
              {researchStudyHarness?.label ?? "Agent"}
            </button>
            <button type="button" data-action-id="research-lab.patterns" onClick={() => void refreshResearchPatterns()} disabled={scenarioRunning || !status?.projectRoot}>
              Patterns
            </button>
            <button type="button" data-action-id="scenario.context" onClick={() => setPrompt((current) => `${current.trim()}\n\nRun a model-swarm product simulation with hypothesis: ${scenarioHypothesis}\nVariable: ${scenarioVariable}`.trim())}>
              Context
            </button>
            <button type="button" data-action-id="scenario.run_matrix" onClick={() => void runScenarioLabModelSwarm()} disabled={scenarioRunning || !status?.projectRoot}>
              {scenarioRunning ? "Running" : "Run matrix"}
            </button>
            <button type="button" data-action-id="scenario.export_figjam" onClick={() => void exportScenarioLabToFigJam()} disabled={scenarioRunning || !status?.projectRoot}>
              Export to FigJam
            </button>
          </div>
        </header>
        <div className="scenario-controls">
          <label data-research-evidence-source={researchSource}>
            <span>Source</span>
            <select aria-label="Research source" value={researchSource} onChange={(event) => setResearchSource(event.target.value)}>
              <option value="research-store">Research store</option>
              <option value="agent-captures">Agent captures</option>
              <option value="browser-evidence">Browser evidence</option>
              <option value="knowledge">Knowledge</option>
              <option value="manual">Manual brief</option>
            </select>
          </label>
          <label>
            <span>Hypothesis</span>
            <input value={scenarioHypothesis} onChange={(event) => setScenarioHypothesis(event.target.value)} />
          </label>
          <label>
            <span>Variable</span>
            <input value={scenarioVariable} onChange={(event) => setScenarioVariable(event.target.value)} />
          </label>
        </div>
        <div className="research-source-strip" data-research-source-strip="research-lab">
          {researchSources.length ? researchSources.slice(0, 5).map((source) => (
            <span key={`${source.url}-${source.title}`} title={source.url}>{trimText(source.title || source.url, 34)}</span>
          )) : <button data-smart-empty-state="memory-sync" type="button" onClick={() => void refreshKnowledge()}>Sync</button>}
        </div>
        <div className="research-lab-surfaces" data-research-lab="pm-harness-study">
          <article data-harness-study={harnessStudy?.harnessId ?? researchStudyHarness?.id ?? "primary"}>
            <span>Harness Study</span>
            <strong>{harnessStudy ? `${harnessStudy.label} ${harnessStudy.available ? "ready" : "offline"}` : "Not run"}</strong>
            <small>{harnessStudy?.model ?? `Study ${researchStudyHarness?.label ?? "agent"}`}</small>
            <div>
              {harnessStudy?.toolsets?.enabled?.slice(0, 4).map((toolset) => (
                <em key={toolset}>{toolset}</em>
              ))}
            </div>
          </article>
          <article data-pm-pattern-library>
            <span>PM Pattern Library</span>
            <strong>{researchPatterns.length ? `${researchPatterns.length} patterns` : "No patterns"}</strong>
            {researchPatterns.slice(0, 3).map((pattern) => (
              <small key={pattern.id} title={pattern.summary}>{pattern.category}: {trimText(pattern.title, 42)}</small>
            ))}
            {!researchPatterns.length ? <small>Run patterns</small> : null}
          </article>
          <article data-research-evidence-source={researchSource}>
            <span>Evidence Intake</span>
            <strong>{researchSource.replace(/-/g, " ")}</strong>
            <small>{researchSources.length ? `${researchSources.length} sources` : "Sync or capture agent evidence"}</small>
          </article>
          <article data-scenario-compare-view="hypothesis-matrix-summary">
            <span>Hypothesis Matrix</span>
            <strong>{scenarioMatrix?.runs?.length ? `${scenarioMatrix.runs.length} runs` : "No runs"}</strong>
            <small>{scenarioMatrix?.comparison?.winnerRunId ?? "Run matrix"}</small>
          </article>
        </div>
        <div className="scenario-model-matrix" data-scenario-model-matrix="codex-first">
          {scenarioModels.length ? scenarioModels.slice(0, 5).map((profile) => (
            <article key={profile.id}>
              <span>{profile.provider}</span>
              <strong>{profile.label}</strong>
              <small>{profile.available ? "ready" : "offline"} / {profile.model}</small>
            </article>
          )) : (
            <article>
              <span>Models</span>
              <strong>Not loaded</strong>
              <small>Run matrix</small>
            </article>
          )}
        </div>
        <div className="scenario-grid">
          <section className="scenario-graph-panel" aria-label="Agent cohort graph" data-scenario-live-graph="round-state" data-scenario-cohort-editor="research-backed">
            <svg viewBox="0 0 460 280" role="img" aria-label="Scenario agent graph">
              {edges.map(([sourceId, targetId]) => {
                const source = nodes.find((node) => node.id === sourceId);
                const target = nodes.find((node) => node.id === targetId);
                if (!source || !target) return null;
                return <line key={`${sourceId}-${targetId}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />;
              })}
              {nodes.map((node) => (
                <g
                  key={node.id}
                  className="scenario-graph-node"
                  transform={`translate(${node.x} ${node.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${node.label}`}
                  onClick={() => setSelectedScenarioNode(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedScenarioNode(node.id);
                    }
                  }}
                >
                  <circle className={`node-${node.kind} ${selectedScenarioNode === node.id ? "active" : ""}`} r={selectedScenarioNode === node.id ? 26 : 22} />
                  <text textAnchor="middle" dy="4">{node.label.slice(0, 12)}</text>
                </g>
              ))}
            </svg>
            <div className="scenario-node-detail">
              <span>{selected.kind}</span>
              <strong>{selected.label}</strong>
              <small>{scenarioHypothesis}</small>
            </div>
          </section>
          <section className="scenario-timeline-panel" aria-label="Simulation timeline">
            {timeline.length ? timeline.map((item, index) => (
              <article key={`${item.label}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.text}</p>
                </div>
              </article>
            )) : (
              <article>
                <span>00</span>
                <div>
                  <strong>No rounds</strong>
                  <p>Run matrix</p>
                </div>
              </article>
            )}
          </section>
          <section className="scenario-transcript-viewer" aria-label="Transcript memory" data-scenario-transcript-viewer="model-memory">
            <div>
              <span>Transcript</span>
              <strong>{scenarioTranscripts.length || latestMatrixRun?.transcripts?.length || 0} turns</strong>
            </div>
            {(scenarioTranscripts.length ? scenarioTranscripts : latestMatrixRun?.transcripts ?? []).slice(0, 3).map((transcript) => (
              <p key={transcript.id}>{transcript.modelProfileId}: {trimText(transcript.response, 120)}</p>
            ))}
            {!scenarioTranscripts.length && !latestMatrixRun?.transcripts?.length ? <p>No transcript</p> : null}
          </section>
          <section className="scenario-cost-panel" aria-label="Simulation budget" data-scenario-cost-panel="budget">
            <div>
              <span>Budget</span>
              <strong>${(latestMatrixRun?.costs?.estimatedCostUsd ?? 0).toFixed(4)}</strong>
            </div>
            <p>{latestMatrixRun?.costs?.inputTokens ?? 0} input tokens / {latestMatrixRun?.costs?.outputTokens ?? 0} output tokens</p>
          </section>
          <section className="scenario-report-panel" aria-label="Spec impact report">
            <div>
              <span>Spec impact</span>
              <strong>{scorecard ? `${Math.round((scorecard.confidence ?? 0) * 100)}% confidence` : "No scorecard"}</strong>
            </div>
            {scorecard ? (
              <ul>
                <li>Adoption {Math.round((scorecard.adoption ?? 0) * 100)}%</li>
                <li>Resistance {Math.round((scorecard.resistance ?? 0) * 100)}%</li>
                <li>Risk {Math.round((scorecard.risk ?? 0) * 100)}%</li>
              </ul>
            ) : <p>Run matrix</p>}
          </section>
          <section className="scenario-figjam-export" aria-label="FigJam export" data-scenario-figjam-export="mermaid-jam">
            <div>
              <span>FigJam</span>
              <strong>{scenarioFigJamExports.length ? `${scenarioFigJamExports.length} Mermaid sources` : "Source + open"}</strong>
            </div>
            <p>research.design_package and mermaid_jam.export turn current research into Atomic Design specs and Mermaid Jam-ready FigJam source.</p>
            {scenarioDesignPackage ? (
              <dl>
                <div>
                  <dt>Package</dt>
                  <dd>{scenarioDesignPackage.id}</dd>
                </div>
                <div>
                  <dt>Specs</dt>
                  <dd>{designSpecCount}</dd>
                </div>
                <div>
                  <dt>Artifacts</dt>
                  <dd>{scenarioDesignPackage.mermaidArtifacts?.length ?? 0}</dd>
                </div>
              </dl>
            ) : null}
            {scenarioFigJamExports.slice(0, 3).map((item) => (
              <article key={item.id}>
                <span>{item.kind}</span>
                <strong>{item.title}</strong>
                <small title={item.outputPath}>{item.outputPath}</small>
              </article>
            ))}
          </section>
          <section className="scenario-compare-view" aria-label="Hypothesis comparison" data-scenario-compare-view="hypothesis-matrix">
            <div>
              <span>Compare</span>
              <strong>{winnerRunId ?? "No run yet"}</strong>
            </div>
            <p>{scenarioMatrix?.comparison?.summary ?? "No matrix"}</p>
          </section>
        </div>
      </section>
    );
  }

  function renderConsolePanel() {
    return (
      <section
        className="console-panel"
        data-chat-workbench="input-output"
        data-chat-transcript="continuous"
        data-output-first="design-research-terminal"
        title="Console"
        aria-label="Conversation"
      >
        <header className="panel-head">
          <div>
            <h2>{runPanelTitle}</h2>
          </div>
          <div className="inline-actions">
            <IconButton actionId="right-pane.tab.run" ariaLabel="Run pane" title="Run" icon="details" onClick={() => chooseRightPane("run", "Run pane opened")} />
            <IconButton {...workbenchAction("refresh")} actionId="memory.refresh" onClick={refresh} />
          </div>
        </header>

        <section className="console-run-info" data-codex-power-strip="sandbox" data-harness-readiness-contract="mode-rail" data-mode-rail-density="icon-only" aria-label="Run mode">
          <HarnessChip
            kind="access"
            icon="access"
            label="Access"
            value={compactPermissionModePowerLabel(permissionMode)}
            title={permissionModePowerDetail(permissionMode)}
            iconOnly={true}
          />
          <HarnessChip
            kind="reasoning"
            icon="plan"
            label="Reasoning"
            value={codexReasoningLabel(settingsDraft?.codex?.reasoningEffort ?? "xhigh")}
            title={`Codex reasoning: ${codexReasoningDetail(settingsDraft?.codex?.reasoningEffort ?? "xhigh")}`}
            iconOnly={true}
          />
          <HarnessChip
            kind="action"
            icon="action"
            label="Action"
            value={effectiveActionLabel}
            iconOnly={true}
          />
        </section>

        {runtimeHealth !== "ready" && hasWorkspace ? (
          <RuntimeRecoveryStrip
            health={runtimeHealth}
            message={runtimeRecoveryMessage}
            canRestart={canRestartStudioRuntime()}
            onRetry={refresh}
            onRestart={() => void handleRestartStudioRuntime()}
            onOpenSettings={() => openSettingsPanel()}
          />
        ) : null}

        {showConversationGoalRow ? (
          <ConversationGoalRow
            goal={conversationGoal}
            turnIndex={conversationTurnCount}
            onChange={setConversationGoal}
            editing={goalEditorOpen}
            onEditingChange={setGoalEditorOpen}
          />
        ) : null}
        {queuedPrompt.trim() ? (
          <section className="queued-prompt-row" data-queued-prompt="pending" aria-label="Queued follow-up">
            <span className="queued-prompt-label">Queued</span>
            <span className="queued-prompt-text" title={queuedPrompt}>{queuedPrompt}</span>
            <button
              type="button"
              className="queued-prompt-clear"
              data-action-id="queue.cancel"
              title="Cancel queued follow-up"
              onClick={() => setQueuedPrompt("")}
            >
              Cancel
            </button>
          </section>
        ) : null}
        {hasChangedFileContext ? (
          <ChangedFilesPanel
            trace={designTrace}
            onReview={() => chooseRightPane("changes", "Changed files review")}
            onSelectFile={(file) => inspectWorkbenchItem({ kind: "file", path: file.path })}
          />
        ) : null}

        {showCreationStrip ? (
          <CreationStrip
            session={session}
            sessionStatus={visibleSessionStatus}
            action={effectiveAction}
            traceModel={traceModel}
            events={events}
            terminalBlocks={terminalBlocks}
            artifacts={sessionDesignArtifacts}
            designTrace={designTrace}
            memoryPins={chatMemoryPins}
            packet={activeReviewPacket}
            searchQuery={chatSearchQuery}
            lastFailure={lastFailure}
            onSearchChange={setChatSearchQuery}
            onFollowUp={handleChatFollowUp}
            onPinMemory={pinCurrentChatMemory}
            onBranch={branchCurrentChat}
            onCopyVerification={copyCurrentVerificationReceipt}
            onSelectArtifact={(artifact) => inspectWorkbenchItem({ kind: "artifact", id: artifact.id })}
            onOpenPacket={() => void openActiveReviewPacket()}
          />
        ) : null}
        <ApprovalBanner
          events={events}
          onResolve={handleResolveApproval}
          onSelect={(event) => inspectWorkbenchItem({ kind: "approval", eventId: event.id })}
        />

        <section
          className="conversation-scroll-region"
          data-auto-scroll-state={userPinnedToBottom ? "pinned" : "paused"}
          data-agent-thinking-state={agentThinkingState}
          data-conversation-scroll="activity-output"
          aria-label="Conversation activity and output"
          onScroll={handleConversationScroll}
          ref={scrollRegionRef}
        >
          <RunSpine
            session={session}
            prompt={prompt}
            actionLabel={effectiveActionLabel}
            activities={traceModel.activities}
            activeProcesses={traceModel.activeProcesses}
            events={events}
            agentThinkingState={agentThinkingState}
            terminalBlocks={visibleTerminalBlocks}
            totalTerminalBlockCount={terminalBlocks.length}
            designTrace={designTrace}
            lastFailure={lastFailure}
            usageSnapshot={usageSnapshot}
            designLaneReceipt={designLaneReceipt}
            collapsedBlockIds={collapsedBlockIds}
            canStart={canRunSession}
            startDisabledReason={runDisabledMessage}
            onStart={() => void run()}
            onCopyBlock={(block) => void copyText(block.messages.join(""))}
            onAttachBlock={attachBlock}
            onToggleBlock={toggleBlock}
            onClearSearch={() => setChatSearchQuery("")}
            onSelectActivity={(activity) => inspectWorkbenchItem({ kind: "activity", id: activity.id })}
            onSelectProcess={(process) => inspectWorkbenchItem({ kind: "process", id: process.id })}
            onSelectFile={(file) => inspectWorkbenchItem({ kind: "file", path: file.path })}
            onSelectEvent={(event) => inspectWorkbenchItem({ kind: "event", id: event.id })}
          />
          <div aria-hidden="true" data-latest-anchor ref={bottomAnchorRef} />
        </section>

        <div className="agent-live-status" data-agent-thinking-state={agentThinkingState}>
          <span className="status-dot" aria-hidden="true" />
          <strong>{agentLiveLabel}</strong>
          {agentLiveSummary && agentLiveSummary !== agentLiveLabel ? (
            <small title={agentLiveSummary}>{trimText(agentLiveSummary, 88)}</small>
          ) : null}
          {!userPinnedToBottom ? (
            <IconButton
              {...workbenchAction("latest")}
              actionId={workbenchAction("latest").id}
              className="scroll-latest-button"
              onClick={() => scrollConversationToLatest("auto")}
            />
          ) : null}
        </div>

        {showAgentQueueDock ? (
          <div
            className="agent-queue-dock"
            data-agent-queue-dock
            data-concurrent-run-count={runningSessionCount}
            data-queue-runtime-backed={runtimeMetrics ? "true" : "false"}
            aria-label="Agent queue"
          >
            {runtimeQueueDockItems.map((item) => (
              <button
                className={`agent-queue-chip runtime ${item.status}`}
                data-agent-queue-chip
                data-status={item.status}
                data-action-id={item.status === "empty" ? undefined : `queue.runtime.${item.id}`}
                key={item.id}
                type="button"
                disabled={item.status === "empty" || item.status === "blocked"}
                onClick={() => item.status === "empty" ? startNewChat() : undefined}
              >
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </button>
            ))}
            {isStartingSession ? (
              <button className="agent-queue-chip" aria-label={WORKBENCH_COPY.queue.queuedLabel} data-agent-queue-chip data-status="queued" data-action-id="queue.starting" type="button" disabled={true} title={WORKBENCH_COPY.queue.queuedLabel}>
                <span aria-hidden="true">...</span>
                <small>{queueDockPromptLabel(startingPrompt || prompt.trim() || WORKBENCH_COPY.queue.fallbackPrompt, selectedHarness)}</small>
              </button>
            ) : null}
            {queueDockSessions.slice(0, isStartingSession ? 4 : 5).map((recent) => (
              <button
                className="agent-queue-chip"
                data-agent-queue-chip
                data-status={queueDockStatusLabel(recent.status).toLowerCase()}
                data-action-id={`queue.open.${recent.id}`}
                key={recent.id}
                title={queueDockSessionTitle(recent)}
                type="button"
                onClick={() => void openSessionSummary(recent)}
              >
                <span aria-hidden="true">{queueDockStatusGlyph(recent.status)}</span>
                <small>{queueDockSessionLabel(recent)}</small>
              </button>
            ))}
          </div>
        ) : null}

        <CommandBar data-command-editor="bottom-pinned" data-composer-layout="single-toolbar">
          <div
            className="message-composer"
            data-composer-agent-state="codex-workbench"
            data-composer-layout="single-toolbar"
            data-composer-selected="chat-active"
            data-message-composer="warp-claude"
            data-chat-mode={chatMode}
            data-permission-mode={permissionMode}
          >
            <textarea
              aria-label="Prompt"
              placeholder={composerPlaceholder(inputMode, chatMode)}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              onPaste={handlePromptPaste}
              onDrop={handleComposerDrop}
              onDragOver={(event) => event.preventDefault()}
            />
            <AttachmentShelf attachments={attachments} onRemove={removeAttachment} />
            <div className="mode-preset-strip" data-mode-presets="agent-run" aria-label="Mode presets">
              {MODE_PRESETS.map((preset) => (
                <ActionChip
                  action={{ id: `mode-preset.${preset.id}`, label: preset.label, shortLabel: preset.shortLabel, ariaLabel: preset.label, title: `${preset.label}: ${preset.chatMode} / ${preset.permissionMode} / ${preset.action}`, icon: preset.icon, iconOnly: preset.iconOnly }}
                  active={activeModePreset === preset.id}
                  data={{ "data-mode-preset": preset.id }}
                  key={preset.id}
                  onClick={() => applyModePreset(preset)}
                />
              ))}
            </div>
            {prompt.trim().length === 0 ? (
              <div className="composer-starter-chips" data-agent-run-launcher="composer-inline" data-starter-prompts="composer-inline" aria-label="Agent run launcher">
                {DEFAULT_COMPOSER_STARTERS.map((starter, index) => (
                  <ActionChip
                    action={composerStarterAction(starter, index)}
                    key={starter.label}
                    className="composer-starter-chip"
                    onClick={() => applyStarterPrompt(starter)}
                  />
                ))}
              </div>
            ) : null}
            {slashCommandMatches.length ? (
              <div className="slash-command-menu" data-slash-command-menu="composer" role="listbox">
                {slashCommandMatches.map((command) => (
                  <button
                    aria-selected={selectedSlashCommand?.id === command.id}
                    className={selectedSlashCommand?.id === command.id ? "active" : undefined}
                    data-action-id={`slash-command.${command.id}`}
                    key={command.id}
                    role="option"
                    title={command.description}
                    type="button"
                    onClick={() => handleSlashCommand(command)}
                  >
                    <span>{command.label}</span>
                    <small>{slashCommandPreview(command)}</small>
                  </button>
                ))}
              </div>
            ) : null}
            {slashCommandPreviewText ? (
              <div className="slash-command-preview" data-slash-command-preview="staged">
                {slashCommandPreviewText}
              </div>
            ) : null}
            <div className="composer-controls" data-composer-controls="icon-only" data-composer-tooltip="visible-on-hover">
              <label className="icon-button attachment-button" data-action-id="attachment.add" data-icon-tooltip="Attach" title="Attach context">
                <StudioControlIcon name="attach" />
                <input ref={fileInputRef} type="file" multiple onChange={handleAttachmentPick} />
              </label>
              <label className="composer-select" data-composer-control="mode" data-icon-tooltip="Mode" title={`Mode: ${activeChatModeLabel}`}>
                <StudioControlIcon name="mode" />
                <span className="composer-control-text">{activeChatModeLabel}</span>
                <select aria-label={`Mode: ${activeChatModeLabel}`} data-action-id="chat-mode.select" value={chatMode} onChange={(event) => setChatMode(event.target.value as StudioChatMode)}>
                  {CHAT_MODES.map((mode) => (
                    <option key={mode.id} value={mode.id}>{mode.label}</option>
                  ))}
                </select>
              </label>
              <label className="composer-select" data-composer-control="access" data-icon-tooltip="Access" title={`Access: ${activePermissionModeLabel} — ${permissionModePowerDetail(permissionMode)}`}>
                <StudioControlIcon name="access" />
                <span className="composer-control-text">{activePermissionModeLabel}</span>
                <select aria-label={`Access: ${activePermissionModeLabel}`} data-action-id="permission-mode.select" value={permissionMode} onChange={(event) => setPermissionMode(event.target.value as StudioPermissionMode)}>
                  {PERMISSION_MODES.map((mode) => (
                    <option key={mode.id} value={mode.id}>{mode.label}</option>
                  ))}
                </select>
              </label>
              <div className="harness-switcher" role="radiogroup" aria-label="Agent" data-composer-control="harness">
                {visibleHarnesses.map((harness) => {
                  const selected = selectedHarness === harness.id;
                  const readiness = harnessAuthDot(harness);
                  const title = composerHarnessTitle(harness);
                  return (
                    <button
                      key={harness.id}
                      aria-checked={selected}
                      aria-label={harness.enabled ? title : `Set up ${harness.label}`}
                      data-action-id={`harness.select.${harness.id}`}
                      data-harness-id={harness.id}
                      data-harness-ready={readiness}
                      data-harness-short={composerHarnessShortLabel(harness.id, harness.label)}
                      data-harness-state={harness.enabled ? selected ? "active" : "available" : "setup"}
                      data-harness-tier={composerHarnessTier(harness.id)}
                      data-icon-tooltip={composerHarnessTooltip(harness)}
                      role="radio"
                      title={title}
                      type="button"
                      onClick={() => chooseComposerHarness(harness)}
                    >
                      <StudioControlIcon name={composerHarnessIcon(harness.id)} />
                      <i className="harness-switcher-status" data-auth-status={readiness} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              <button
                className={`icon-button goal-toggle${conversationGoal.trim() ? " active" : ""}`}
                data-action-id="conversation.goal.toggle"
                data-icon-tooltip="Goal"
                type="button"
                title={conversationGoal.trim() ? `Goal: ${conversationGoal.trim()}` : "Set conversation goal"}
                aria-label="Set conversation goal"
                onClick={() => setGoalEditorOpen(true)}
              >
                <StudioControlIcon name="pin" />
              </button>
              {showModelPicker ? (
                <label className="composer-select" data-composer-control="model" data-icon-tooltip="Model" title={`Model: ${activeModelLabel}`}>
                  <StudioControlIcon name="harness" />
                  <span className="composer-control-text">{activeModelLabel}</span>
                  <select
                    aria-label={`Model: ${activeModelLabel}`}
                    data-action-id="harness.model.select"
                    value={activeModelId ?? ""}
                    onChange={(event) => setSelectedModelByHarness((current) => ({ ...current, [selectedHarness]: event.target.value }))}
                  >
                    {activeModelRegistry?.models.map((model) => (
                      <option key={model.id} value={model.id}>{model.label}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              {showEffortPicker ? (
                <label className="composer-select" data-composer-control="effort" data-icon-tooltip="Reasoning" title={`Reasoning effort: ${activeEffortLabel}`}>
                  <StudioControlIcon name="plan" />
                  <span className="composer-control-text">{activeEffortLabel}</span>
                  <select
                    aria-label={`Reasoning effort: ${activeEffortLabel}`}
                    data-action-id="harness.effort.select"
                    value={selectedEffort ?? ""}
                    onChange={(event) => setSelectedEffort(event.target.value === "" ? null : event.target.value as StudioEffort)}
                  >
                    <option value="">Default</option>
                    {effortOptions.map((effort) => (
                      <option key={effort} value={effort}>{effort[0].toUpperCase() + effort.slice(1)}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="composer-select" data-composer-control="action" data-icon-tooltip="Action" title={`Action: ${effectiveActionLabel}`}>
                <StudioControlIcon name="action" />
                <span className="composer-control-text">{effectiveActionLabel}</span>
                <select
                  aria-label={`Action: ${effectiveActionLabel}`}
                  data-action-id="harness.action.select"
                  value={effectiveAction}
                  onChange={(event) => setSelectedAction(event.target.value as StudioAction)}
                  disabled={harnessActions.length <= 1}
                >
                  {harnessActions.map((action) => (
                    <option key={action.id} value={action.id}>{action.label}</option>
                  ))}
                </select>
              </label>
              <button
                className={`usage-limit-chip ${usageWarning?.status ?? "ok"}`}
                data-action-id="usage.limits.open"
                data-icon-tooltip="Usage"
                type="button"
                title={usageWarning?.message ?? "Usage and rate-limit status"}
                onClick={() => void openUsageLimits()}
              >
                <StudioControlIcon name="warning" />
                <span>{usageLimitChipLabel(usageSnapshot, usageWarning)}</span>
              </button>
              {session && isSessionActive ? (
                <IconButton
                  {...workbenchAction("stop")}
                  actionId={workbenchAction("stop").id}
                  className="danger"
                  onClick={cancel}
                />
              ) : null}
              <IconButton
                {...workbenchAction(canContinueConversation ? "continue" : "run")}
                actionId="session.run"
                className="primary run-button submit-button"
                data-conversation-turn={conversationTurnCount + 1}
                data-resume-interrupted={isResumingInterrupted ? "true" : undefined}
                onClick={run}
                disabled={!canRunSession}
                title={canRunSession
                  ? isResumingInterrupted
                    ? `Resume interrupted session (turn ${conversationTurnCount + 1})`
                    : canContinueConversation
                      ? `Continue conversation (turn ${conversationTurnCount + 1})`
                      : workbenchAction("run").title
                  : runDisabledMessage}
              >
                {isStartingSession ? <span aria-hidden="true">...</span> : null}
              </IconButton>
            </div>
            {runBlockedMessage ? (
              <p className="composer-blocked-reason" data-composer-blocked-reason="run">{runBlockedMessage}</p>
            ) : null}
          </div>
          <div className="workspace-status-row" data-workspace-status="local-branch">
            <span title={status?.projectRoot}>{workspaceLabel}</span>
            <IconButton
              {...workbenchAction("changeWorkspace")}
              actionId={workbenchAction("changeWorkspace").id}
              onClick={() => void handleOpenWorkspace()}
            />
          </div>
        </CommandBar>
      </section>
    );
  }

  function renderRunCockpitPane() {
    return (
      <ContextualInspectorPane
        selection={inspectorSelection}
        session={session}
        visibleSessionStatus={visibleSessionStatus}
        workspaceLabel={workspaceLabel}
        runtimeHealth={runtimeHealth}
        status={status}
        harnessLabel={currentHarness?.label ?? selectedHarness}
        activities={traceModel.activities}
        activeProcesses={traceModel.activeProcesses}
        designTrace={designTrace}
        artifacts={sessionDesignArtifacts}
        events={events}
        lastFailure={lastFailure}
        usageSnapshot={usageSnapshot}
        usageLoading={usageLoading}
        onClearSelection={() => setInspectorSelection(null)}
        onCopyText={(value) => void copyText(value)}
        onOpenUsageLimits={() => void openUsageLimits()}
        onRefresh={refresh}
        onResolveApproval={handleResolveApproval}
      />
    );
  }

  function renderChangesCockpitPane() {
    return (
      <section className="agent-cockpit-pane" data-agent-cockpit="changes" data-pane-intent-surface="changes">
        <section className="design-system-trace-panel cockpit-card" data-design-system-trace="backend-review">
          <div className="drawer-section-head">
            <span>Design system trace</span>
            <button data-action-id="design-trace.review" type="button" onClick={() => chooseRightPane("design-system", "Trace review opened")}>Review</button>
            <button data-action-id="design-trace.refresh" type="button" onClick={refresh}>Refresh</button>
          </div>
          <div className="change-summary">
            <strong>{designTrace?.reviewLabel ?? "No trace"}</strong>
            <small>{designTrace?.status ?? "checking"}</small>
          </div>
          <div className="trace-file-list">
            {(designTrace?.designSystemFiles.length ? designTrace.designSystemFiles : designTrace?.files ?? []).slice(0, 12).map((file) => (
              <article key={file.path}>
                <span>{file.path}</span>
                <small>{file.kind} · {file.status} · +{file.insertions} -{file.deletions}</small>
              </article>
            ))}
            {designTrace && designTrace.files.length === 0 ? <span className="empty">Clean</span> : null}
            {designTrace?.error ? <span className="error">{designTrace.error}</span> : null}
          </div>
        </section>
      </section>
    );
  }

  function renderFigmaCockpitPane() {
    return (
      <section className="agent-cockpit-pane" data-agent-cockpit="figma" data-pane-intent-surface="figma">
        <FigmaDriver
          figmaStatus={figmaStatus}
          figmaActionResult={figmaActionResult}
          figmaConnecting={figmaConnecting}
          figmaActionRunning={figmaActionRunning}
          figmaError={figmaError}
          settingsDraft={settingsDraft}
          onConnect={handleFigmaConnect}
          onDisconnect={handleFigmaDisconnect}
          onOpen={handleFigmaOpen}
          onAction={handleFigmaAction}
          onPatchSettings={patchSettings}
          onSaveSettings={saveSettings}
          settingsSavedAt={settingsSavedAt}
        />
      </section>
    );
  }

  function renderMemoryCockpitPane() {
    return (
      <section className="agent-cockpit-pane" data-agent-cockpit="memory" data-pane-intent-surface="memory">
        <ContextRail
          contextItemDetail={contextItemDetail}
          contextFilter={contextFilter}
          contextItems={contextItems}
          contextQuery={contextQuery}
          events={events}
          knowledgeFilter={knowledgeFilter}
          knowledgeItemDetail={knowledgeItemDetail}
          knowledgeItems={visibleKnowledgeItems}
          knowledgeQuery={knowledgeQuery}
          memoryItems={memoryItems}
          selectedContextItem={selectedContextItem}
          selectedKnowledgeItem={selectedKnowledgeItem}
          session={session}
          traceModel={traceModel}
          onFilterChange={setContextFilter}
          onKnowledgeFilterChange={setKnowledgeFilter}
          onKnowledgeQueryChange={setKnowledgeQuery}
          onOpenKnowledgeItem={openKnowledgeItem}
          onOpenItem={openContextItem}
          onQueryChange={setContextQuery}
          onRefreshKnowledge={refreshKnowledge}
          onRefreshMemory={refreshMemory}
        />
      </section>
    );
  }

  function renderMermaidBoardPane() {
    const surfaceProps: MermaidBoardSurfaceProps = {
      board: mermaidBoard,
      exports: mermaidBoardExports,
      loading: mermaidBoardLoading,
      error: mermaidBoardError,
      coreRuntimeReady: mermaidBoardCoreRuntimeReady,
      pmRuntimeReady: mermaidBoardPmRuntimeReady,
      recovery: mermaidBoardRecovery,
      onCreate: handleCreateMermaidBoard,
      onRestartRuntime: handleRestartStudioRuntime,
      onApplyTemplate: handleApplyMermaidBoardTemplate,
      onAddNode: handleAddMermaidBoardNode,
      onLayout: handleLayoutMermaidBoard,
      onExport: handleExportMermaidBoard,
      onSyncFigJam: handleSyncMermaidBoardToFigJam,
      onUsePrompt: handleUseMermaidBoardAgentPrompt,
    };
    return (
      <Suspense fallback={<section className="mermaid-board-surface" data-mermaid-board="pm-brainstorm-loading" aria-busy="true" />}>
        <MermaidBoardSurface {...surfaceProps} />
      </Suspense>
    );
  }

  function renderWorkPacketPane() {
    const starters = STARTER_PROMPTS.slice(0, 4).map((starter) => ({
      label: starter.label,
      description: starter.template,
      onSelect: () => applyStarterPrompt(starter),
    }));
    return (
      <section className="agent-cockpit-pane" data-agent-cockpit="work-packet" data-pane-intent-surface="work-packet">
        <WorkPacketPane
          packet={activeReviewPacket}
          session={session}
          events={events}
          harnessLabel={currentHarness?.label ?? selectedHarness}
          starters={starters}
          onRefresh={refreshReviewPackets}
          onExport={() => void handleExportReviewPacket()}
          onOpenBoard={() => chooseRightPane("mermaid-board", "Packet feeds PM Board")}
          onOpenChangelog={openChangelogSurface}
          onOpenFigma={openFigmaSurface}
          onCreatePacket={() => {
            startNewChat();
            requestAnimationFrame(() => {
              const promptEl = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Prompt"]');
              promptEl?.focus();
            });
          }}
          onOpenWorkspace={() => { void handleOpenWorkspace(); }}
          onBrowseTemplates={openPluginsSurface}
          onViewExamples={() => window.open("https://github.com/sarveshsea/memi#examples", "_blank")}
        />
        {reviewPacketError ? <p className="error">{reviewPacketError}</p> : null}
      </section>
    );
  }

  function renderIAPane() {
    const surfaceProps: IASurfaceProps = {
      board: iaBoard,
      exports: iaBoardExports,
      events,
      loading: iaBoardLoading,
      error: iaBoardError,
      coreRuntimeReady: mermaidBoardCoreRuntimeReady,
      pmRuntimeReady: mermaidBoardPmRuntimeReady,
      onCapture: handleCaptureIABoard,
      onExport: handleExportIABoard,
      onSyncFigJam: handleSyncIABoardToFigJam,
      onUsePrompt: handleUseIAAgentPrompt,
    };
    return (
      <Suspense fallback={<section className="ia-surface" data-information-architecture="mermaid-jam" aria-busy="true" />}>
        <IASurface {...surfaceProps} />
      </Suspense>
    );
  }

  function renderRightPaneBody() {
    if (rightPaneTab === "run") return renderRunCockpitPane();
    if (rightPaneTab === "work-packet") return renderWorkPacketPane();
    if (rightPaneTab === "changes") return renderChangesCockpitPane();
    if (rightPaneTab === "design-system") {
      return (
        <DesignSystemReviewSurface
          artifact={activeDesignArtifact}
          figmaStatus={figmaStatus}
          onReviewSection={reviewArtifactSection}
          onFixSection={handleFixDesignSystemSection}
          onSaveArtifact={saveDesignSystemArtifact}
          onUseSystem={useDesignSystemArtifact}
        />
      );
    }
    if (rightPaneTab === "ia") return renderIAPane();
    if (rightPaneTab === "research-lab") return renderScenarioLab();
    if (rightPaneTab === "mermaid-board") return renderMermaidBoardPane();
    if (rightPaneTab === "design-changelog") {
      return (
        <DesignChangelogPage
          entries={designChangelogEntries}
          loading={designChangelogLoading}
          error={designChangelogError}
          onRefresh={refreshDesignChangelog}
          onCreate={handleCreateDesignChangelogEntry}
          onUpdate={handleUpdateDesignChangelogEntry}
          onArchive={handleArchiveDesignChangelogEntry}
          onRestore={handleRestoreDesignChangelogEntry}
          onExport={handleExportDesignChangelog}
        />
      );
    }
    if (rightPaneTab === "figma") return renderFigmaCockpitPane();
    return renderMemoryCockpitPane();
  }

  return (
    <main
      className={`studio-shell theme-${themeMode}`}
      data-studio-shell="harness-console"
      data-studio-workbench="harness-console"
      data-action-registry="studio-actions"
      data-marketplace-notes="memoire-notes"
      data-runtime-health={runtimeHealth}
      data-runtime-recovery={runtimeHealth === "ready" ? "ready" : runtimeHealth}
      data-theme={themeMode}
    >
      <div className="harness-console-shell studio-frame" data-studio-workbench="memoire-project-memory">
        <header className="console-topbar" data-top-status-bar="studio-status" data-topbar-density="thirty-percent" data-icon-topbar="memoire-compact">
          <div className="wordmark-row" aria-label="Mémoire">
            <MemoireLogoMark />
            <span className="wordmark-text">Mémoire</span>
          </div>
          <div className="harness-readiness-row" data-harness-readiness="compact" data-harness-readiness-contract="truth-strip" data-topbar-tags="left-compact" aria-label="Runtime, agent, and workspace status">
            {truthStripItems.map((item) => (
              <TruthStripItem item={item} key={item.id} />
            ))}
          </div>
          <div className="topbar-actions" data-topbar-actions="right-aligned">
            <button className="topbar-icon-button" aria-label="Command" title="Command" data-icon-tooltip="Command" data-action-id="command-palette.open" type="button" onClick={() => openCommandPalette()}>
              <StudioControlIcon name="command" />
            </button>
            <div className="theme-toggle" data-theme-toggle aria-label="Theme">
              <button
                aria-label="Light mode"
                aria-pressed={themeMode === "light"}
                className={themeMode === "light" ? "active" : ""}
                data-action-id="theme.light"
                data-icon-tooltip="Light mode"
                title="Light mode"
                type="button"
                onClick={() => setThemeMode("light")}
              >
                <StudioControlIcon name="light" />
              </button>
              <button
                aria-label="Dark mode"
                aria-pressed={themeMode === "dark"}
                className={themeMode === "dark" ? "active" : ""}
                data-action-id="theme.dark"
                data-icon-tooltip="Dark mode"
                title="Dark mode"
                type="button"
                onClick={() => setThemeMode("dark")}
              >
                <StudioControlIcon name="dark" />
              </button>
            </div>
            <button
              aria-label="Settings"
              className="topbar-icon-button"
              data-action-id="settings.open"
              data-icon-tooltip="Settings"
              title="Settings"
              type="button"
              onClick={() => openSettingsPanel()}
            >
              <StudioControlIcon name="settings" />
            </button>
          </div>
        </header>

        <section
          className="console-layout"
          data-action-registry="studio-actions"
          data-action-count={STUDIO_ACTION_REGISTRY.length}
          data-concurrent-run-count={runningSessionCount}
          data-sidebar-collapsed={String(projectSidebarCollapsed)}
          data-session-queue-state={sessionQueueState}
          data-runtime-health={runtimeHealth}
          data-runtime-recovery={runtimeHealth === "ready" ? "ready" : runtimeHealth}
        >
          <ProjectSidebar
            sessions={visibleRecentSessions}
            currentSessionId={session?.id ?? null}
            currentWorkspace={status?.projectRoot ?? null}
            recentWorkspaces={recentWorkspaces}
            collapsed={projectSidebarCollapsed}
            expandedProjectIds={expandedProjectIds}
            onToggleCollapsed={() => setProjectSidebarCollapsed((current) => !current)}
            onToggleProject={toggleProjectFolder}
            onOpenSession={(nextSession) => void openSessionSummary(nextSession)}
            onOpenWorkspace={(path) => { void handleOpenWorkspace(path); }}
            onCreateWorkspace={() => { void handleCreateWorkspace(); }}
            onOpenSettings={() => openSettingsPanel()}
            onNewChat={startNewChat}
            onOpenCommand={() => openCommandPalette()}
            onOpenPlugins={openPluginsSurface}
            onOpenChangelog={openChangelogSurface}
            onOpenAutomations={openAutomationsSurface}
            onOpenFigma={openFigmaSurface}
          />
          <section className="console-content" data-console-content="primary">
            {error ? <div className="error">{error}</div> : null}
            <section
              className="agent-workbench-shell"
              data-agent-workbench="design-system"
              data-design-lane-active={String(designLaneState.active)}
              data-design-lane-reason={designLaneState.reason}
            >
              <section
                className="agent-workbench"
                data-agent-workbench="resizable-conversation-artifacts"
                data-run-workbench="conversation-artifacts"
                style={workbenchStyle}
              >
                <aside className="agent-chat-rail run-workbench chat-home" data-agent-chat-rail="model-reasoning">
                  {renderConsolePanel()}
                </aside>
                <div
                  aria-label="Resize conversation and artifact panels"
                  aria-orientation="vertical"
                  aria-valuemax={MAX_CHAT_RAIL_WIDTH_PERCENT}
                  aria-valuemin={MIN_CHAT_RAIL_WIDTH_PERCENT}
                  aria-valuenow={Math.round(chatRailWidthPercent)}
                  className="chat-resize-handle"
                  data-chat-resize-handle="conversation-artifact"
                  onDoubleClick={() => setChatRailWidthPercent(DEFAULT_CHAT_RAIL_WIDTH_PERCENT)}
                  onKeyDown={handleChatRailResizeKey}
                  onPointerDown={handleChatRailPointerDown}
                  role="separator"
                  tabIndex={0}
                  title="Resize"
                />
                <section className="artifact-canvas" data-artifact-canvas={rightPaneTab} data-agent-cockpit-shell="right-pane">
                  <div className="artifact-pane-tabs" data-right-pane-tabs="agent-cockpit-mermaid-board" role="tablist" aria-label="Agent Cockpit">
                    {RIGHT_PANE_TAB_GROUPS.map((group) => (
                      <div className="artifact-pane-tab-group" data-right-pane-tab-group={group} key={group}>
                        {visibleRightPaneTabs.filter((tab) => tab.group === group).map((tab) => (
                          <button
                            aria-label={tab.label}
                            aria-selected={rightPaneTab === tab.id}
                            className={rightPaneTab === tab.id ? "active" : ""}
                            data-action-id={`right-pane.tab.${tab.id}`}
                            data-tab-kind={tab.iconOnly ? "icon" : "text"}
                            key={tab.id}
                            onClick={() => chooseRightPane(tab.id)}
                            role="tab"
                            title={tab.label}
                            type="button"
                          >
                            {tab.icon ? <StudioControlIcon name={tab.icon} /> : null}
                            {tab.iconOnly ? null : <span>{tab.label}</span>}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                  <section className="artifact-pane-body" data-artifact-pane-body={rightPaneTab}>
                    {renderRightPaneBody()}
                  </section>
                </section>
              </section>
            </section>
          </section>
        </section>
      </div>
      <CommandPalette
        open={commandPaletteOpen}
        query={commandPaletteQuery}
        compatibility={compatibility}
        sessions={recentSessions}
        knowledgeItems={knowledgeItems}
        onQueryChange={setCommandPaletteQuery}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenSettings={() => {
          setCommandPaletteOpen(false);
          openSettingsPanel();
        }}
        onOpenSettingsSection={(section) => {
          setCommandPaletteOpen(false);
          openSettingsPanel(section);
          if (section === "Plugins") void refreshMarketplaceNotes();
        }}
        onOpenFigma={() => {
          setCommandPaletteOpen(false);
          openFigmaSurface();
        }}
        onOpenDesignSystem={() => {
          setCommandPaletteOpen(false);
          openDesignSystemSurface();
        }}
        onOpenBoard={() => {
          setCommandPaletteOpen(false);
          openFigJamBoardSurface();
        }}
        onOpenResearchLab={() => {
          setCommandPaletteOpen(false);
          openResearchLabSurface();
        }}
        onOpenPlugins={() => {
          setCommandPaletteOpen(false);
          openPluginsSurface();
        }}
        onOpenAutomations={() => {
          setCommandPaletteOpen(false);
          openAutomationsSurface();
        }}
        onOpenChangelog={() => {
          setCommandPaletteOpen(false);
          openChangelogSurface();
        }}
        onSelectHarness={(id) => {
          chooseHarness(id);
          setCommandPaletteOpen(false);
        }}
        onOpenSession={(nextSession) => {
          setCommandPaletteOpen(false);
          chooseRightPane("run", "Session opened");
          void openSessionSummary(nextSession);
        }}
        onOpenKnowledgeItem={(item) => {
          setCommandPaletteOpen(false);
          chooseRightPane("memory", "Knowledge item opened");
          void openKnowledgeItem(item);
        }}
      />
      <AutomationCenter
        open={automationsOpen}
        automations={automations}
        templates={automationTemplates}
        runsByAutomation={automationRuns}
        scheduler={automationScheduler}
        projectRoot={status?.projectRoot ?? ""}
        busyId={automationBusyId}
        onClose={() => setAutomationsOpen(false)}
        onRefresh={refreshAutomations}
        onCreate={handleCreateAutomation}
        onUpdate={handleUpdateAutomation}
        onDelete={handleDeleteAutomation}
        onRunNow={handleRunAutomation}
        onLoadRuns={loadAutomationHistory}
        onInstallScheduler={handleInstallAutomationScheduler}
        onUninstallScheduler={handleUninstallAutomationScheduler}
      />
      <SettingsPanel
        open={settingsOpen}
        activeSection={settingsSection}
        status={status}
        config={settingsDraft}
        compatibility={compatibility}
        computerStatus={computerStatus}
        figmaStatus={figmaStatus}
        figmaConnecting={figmaConnecting}
        harnesses={harnesses}
        marketplaceNotes={marketplaceNotes}
        marketplaceBusyId={marketplaceBusyId}
        marketplaceError={marketplaceError}
        marketplaceDownloadJobs={marketplaceDownloadJobs}
        selectedMarketplaceNoteId={selectedMarketplaceNoteId}
        noteForks={noteForks}
        selectedNoteForkId={selectedNoteForkId}
        noteForkFiles={noteForkFiles}
        selectedNoteForkFile={selectedNoteForkFile}
        noteForkValidation={noteForkValidation}
        noteForkDiff={noteForkDiff}
        noteForkPrHandoff={noteForkPrHandoff}
        studioTools={studioTools}
        browserStatus={browserStatus}
        onClose={() => setSettingsOpen(false)}
        onSectionChange={setSettingsSection}
        onRefresh={refresh}
        onRefreshMarketplace={refreshMarketplaceNotes}
        onInstallMarketplaceNote={handleInstallMarketplaceNote}
        onRemoveMarketplaceNote={handleRemoveMarketplaceNote}
        onForkMarketplaceNote={handleForkMarketplaceNote}
        onMarketplaceSelectionChange={setSelectedMarketplaceNoteId}
        onSelectNoteFork={handleSelectNoteFork}
        onSelectNoteForkFile={setSelectedNoteForkFile}
        onUpdateNoteForkFile={handleUpdateNoteForkFile}
        onValidateNoteFork={handleValidateNoteFork}
        onExportNoteForkPr={handleExportNoteForkPr}
        onOpenAutomationsCenter={openAutomationsSurface}
        onPatchConfig={patchSettings}
        onSave={saveSettings}
        onInstallAgentKit={handleInstallAgentKit}
        onComputerCapture={handleComputerCaptureRequest}
        onConnectFigma={handleFigmaConnect}
        onOpenFigma={handleFigmaOpen}
        onOpenMacOSPermission={handleMacOSPermissionOpen}
        onSelectHarness={chooseHarness}
        onDiagnoseHarness={handleDiagnoseHarness}
        onSelectWorkspace={changeWorkspace}
        onCompleteSetup={finishSetup}
      />
    </main>
  );
}

function paneIntentForAction(action: StudioAction): PaneIntent | null {
  if (action === "simulate") {
    return { tab: "run", reason: "Simulation runs stay in the trace", confidence: 0.9 };
  }
  if (action === "research") {
    return { tab: "memory", reason: "Research context is most relevant", confidence: 0.84 };
  }
  if (action === "self-design" || action === "design-doc") {
    return { tab: "run", reason: "Design action starts in the run trace", confidence: 0.82 };
  }
  if (action === "audit" || action === "fix" || action === "app-build" || action === "browser-audit") {
    return { tab: "run", reason: "Run trace is most relevant", confidence: 0.78 };
  }
  return null;
}

function paneIntentForEvents(events: StudioEvent[], action: StudioAction, lastFailure: StudioEvent | null): PaneIntent | null {
  if (lastFailure) {
    return {
      tab: "run",
      reason: "Run needs attention",
      confidence: 0.95,
      sourceEventId: lastFailure.id,
    };
  }

  const event = events.at(-1);
  if (!event) return paneIntentForAction(action);
  const type = event.type.toLowerCase();
  const text = `${type} ${event.message ?? ""} ${JSON.stringify(event.data ?? {})}`;
  if (type.startsWith("simulation_") || type.includes("simulation")) {
    return { tab: "run", reason: "Simulation event received", confidence: 0.88, sourceEventId: event.id };
  }
  if (type.startsWith("research_") || type.includes("research")) {
    return { tab: "memory", reason: "Research event received", confidence: 0.82, sourceEventId: event.id };
  }
  if (type.startsWith("figma_") || type.includes("figma")) {
    return { tab: "work-packet", reason: "Figma artifact received", confidence: 0.86, sourceEventId: event.id };
  }
  if (type.includes("design_system") || type.includes("design_artifact") || type === "artifact" || type === "design_decision" || type === "session_result") {
    return { tab: "work-packet", reason: "Packet-ready artifact received", confidence: 0.84, sourceEventId: event.id };
  }
  if (type.includes("git") || type.includes("file") || type.includes("diff")) {
    return { tab: "changes", reason: "Changed files updated", confidence: 0.8, sourceEventId: event.id };
  }
  return null;
}

function assertToolCallCompleted(call: StudioToolCallResult): void {
  if (call.status !== "completed") {
    throw new Error(call.error ?? `${call.toolId} failed`);
  }
}

function createLocalMermaidBoard(prompt: string, id: string, mode: MermaidBoard["mode"] = "pm-brainstorm"): MermaidBoard {
  const now = new Date().toISOString();
  const board: MermaidBoard = {
    schemaVersion: 1,
    id,
    title: mode === "ia" ? "IA Board" : "Product Design Board",
    description: "Local Studio board for product design planning and FigJam source export.",
    mode,
    templateId: mode === "ia" ? "ia-journeys" : "pm-brainstorm",
    brief: {
      problem: prompt.trim() || "Clarify the product design direction.",
      targetUser: "Product designers and PMs",
      outcome: "Editable, evidence-linked design decisions.",
      constraints: [],
      ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
    },
    lastFigJamSync: null,
    nodes: [],
    edges: [],
    frames: [],
    createdAt: now,
    updatedAt: now,
  };
  const defaults: Array<[string, MermaidBoardNodeKind, string, string]> = mode === "ia"
    ? [
        ["sitemap", "spec", "Sitemap hypothesis", "Top-level routes and product areas to validate."],
        ["navigation", "sticky", "Navigation model", "Primary wayfinding, labels, and hierarchy."],
        ["journeys", "mermaid", "Journey flow", "flowchart TD\n  Start[Open product] --> Decide[Choose task]\n  Decide --> Done[Complete flow]"],
        ["screens", "spec", "Screen inventory", "Screens and states required for the next prototype."],
      ]
    : [
        ["problem", "sticky", "Problem", board.brief?.problem ?? "Clarify the product direction."],
        ["users", "persona", "User", board.brief?.targetUser ?? "Product designers and PMs"],
        ["journey", "mermaid", "Journey map", "journey\n  title Product design review\n  section Discover\n    Gather evidence: 5: Designer\n  section Decide\n    Compare options: 4: PM\n  section Ship\n    Export FigJam source: 5: Designer"],
        ["opportunities", "spec", "Opportunity", board.brief?.outcome ?? "Improve design handoff clarity."],
        ["risks", "risk", "Risk", "Source evidence can get lost if the board is not kept local and editable."],
      ];
  board.nodes = defaults.map(([laneId, kind, title, body], index) => ({
    id: `local-${laneId}-${index + 1}`,
    kind,
    title,
    body,
    mermaidSource: kind === "mermaid" ? body : undefined,
    researchBacking: [],
    sourceEventIds: [],
    author: "agent",
    laneId,
    priority: index === 0 ? "high" : "medium",
    decisionStatus: kind === "risk" ? "open" : undefined,
    position: { x: 0, y: 0, width: 220, height: 128 },
    createdAt: now,
    updatedAt: now,
  }));
  return hydrateMermaidBoardAgentSurface(layoutLocalMermaidBoard(board));
}

function addLocalMermaidBoardNode(board: MermaidBoard, kind: MermaidBoardNodeKind, body: string): MermaidBoard {
  const now = new Date().toISOString();
  const node = {
    id: `local-${kind}-${Date.now().toString(36)}`,
    kind,
    title: localBoardNodeTitle(kind),
    body: body || "Captured board note.",
    mermaidSource: kind === "mermaid" ? body : undefined,
    researchBacking: [],
    sourceEventIds: [],
    author: "agent" as const,
    laneId: localBoardLane(kind, board.mode),
    priority: "medium" as const,
    decisionStatus: kind === "risk" ? "open" as const : undefined,
    position: { x: 0, y: 0, width: 220, height: 128 },
    createdAt: now,
    updatedAt: now,
  };
  return hydrateMermaidBoardAgentSurface(layoutLocalMermaidBoard({
    ...board,
    nodes: [...board.nodes, node],
    updatedAt: now,
  }));
}

function layoutLocalMermaidBoard(board: MermaidBoard): MermaidBoard {
  const lanes = board.mode === "ia"
    ? ["sitemap", "navigation", "journeys", "screens", "evidence"]
    : ["problem", "users", "journey", "opportunities", "decisions", "risks", "metrics", "next-steps"];
  const laneIndex = new Map(lanes.map((lane, index) => [lane, index]));
  const counts = new Map<string, number>();
  return {
    ...board,
    nodes: board.nodes.map((node) => {
      const laneId = node.laneId ?? localBoardLane(node.kind, board.mode);
      const index = counts.get(laneId) ?? 0;
      counts.set(laneId, index + 1);
      return {
        ...node,
        laneId,
        position: { x: (laneIndex.get(laneId) ?? lanes.length) * 260, y: index * 160, width: node.position.width, height: node.position.height },
      };
    }),
    frames: lanes.map((lane, index) => ({
      id: `frame-${lane}`,
      title: lane.replace(/-/g, " "),
      laneId: lane,
      nodeIds: board.nodes.filter((node) => (node.laneId ?? localBoardLane(node.kind, board.mode)) === lane).map((node) => node.id),
      position: { x: index * 260 - 16, y: -48, width: 248, height: Math.max(180, (counts.get(lane) ?? 1) * 160) },
    })),
  };
}

function mermaidBoardExportsFromResearchCall(data: unknown): MermaidBoardExport[] {
  const exports = data && typeof data === "object" && Array.isArray((data as { exports?: unknown }).exports)
    ? (data as { exports: Array<Record<string, unknown>> }).exports
    : [];
  return exports.map((item, index) => ({
    id: typeof item.id === "string" ? item.id : `research-export-${index + 1}`,
    title: typeof item.title === "string" ? item.title : `FigJam source ${index + 1}`,
    format: item.format === "markdown" ? "markdown" : item.format === "json" ? "json" : "mermaid",
    kind: "board-source",
    source: typeof item.source === "string" ? item.source : "",
    outputPath: typeof item.outputPath === "string" ? item.outputPath : "",
    integration: "mermaid-jam",
    nextSteps: Array.isArray(item.nextSteps) ? item.nextSteps.filter((step): step is string => typeof step === "string") : [],
  }));
}

function localFigJamFallbackSync(exports: MermaidBoardExport[]): NonNullable<MermaidBoard["lastFigJamSync"]> {
  return {
    status: "fallback",
    message: "Local Mermaid Jam source is ready. Direct FigJam writes were not executed.",
    syncedAt: new Date().toISOString(),
    integration: exports[0]?.integration ?? "mermaid-jam",
    outputPaths: exports.map((item) => item.outputPath).filter(Boolean),
    createdNodeCount: 0,
    artifactPath: exports[0]?.outputPath ?? null,
    diagnostics: ["External FigJam sync requires explicit approval and a connected bridge."],
    fallbackReason: "No external FigJam write was requested.",
  };
}

function localBoardNodeTitle(kind: MermaidBoardNodeKind): string {
  if (kind === "persona") return "Persona";
  if (kind === "risk") return "Risk";
  if (kind === "metric") return "Metric";
  if (kind === "spec") return "Spec";
  if (kind === "evidence") return "Evidence";
  if (kind === "comment") return "Decision";
  if (kind === "mermaid") return "Flow";
  return "Note";
}

function localBoardLane(kind: MermaidBoardNodeKind, mode: MermaidBoard["mode"]): string {
  if (mode === "ia") {
    if (kind === "mermaid") return "journeys";
    if (kind === "spec") return "screens";
    return "evidence";
  }
  if (kind === "persona") return "users";
  if (kind === "mermaid") return "journey";
  if (kind === "spec") return "opportunities";
  if (kind === "comment") return "decisions";
  if (kind === "risk") return "risks";
  if (kind === "metric") return "metrics";
  if (kind === "evidence") return "next-steps";
  return "problem";
}

async function waitForMermaidBoardRuntimeTools(): Promise<{ status: StudioStatus; tools: StudioToolDefinition[] }> {
  for (let attempt = 0; attempt < 14; attempt += 1) {
    try {
      const [nextStatus, nextTools] = await Promise.all([getStatus(), listStudioTools()]);
      if (nextStatus.projectRoot && (hasCoreMermaidBoardToolContract(nextTools) || hasMermaidSourceToolContract(nextTools))) {
        return { status: nextStatus, tools: nextTools };
      }
    } catch {
      // Keep polling while the managed sidecar finishes startup.
    }
    await delay(350);
  }
  throw new Error(MERMAID_BOARD_RUNTIME_UNAVAILABLE);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function hasCoreMermaidBoardToolContract(tools: StudioToolDefinition[]): boolean {
  const toolIds = new Set(tools.filter((tool) => tool.enabled).map((tool) => tool.id));
  return CORE_MERMAID_BOARD_TOOL_IDS.every((toolId) => toolIds.has(toolId));
}

function hasPmMermaidBoardToolContract(tools: StudioToolDefinition[]): boolean {
  const toolIds = new Set(tools.filter((tool) => tool.enabled).map((tool) => tool.id));
  return PM_MERMAID_BOARD_TOOL_IDS.every((toolId) => toolIds.has(toolId));
}

function hasMermaidSourceToolContract(tools: StudioToolDefinition[]): boolean {
  const toolIds = new Set(tools.filter((tool) => tool.enabled).map((tool) => tool.id));
  return MERMAID_SOURCE_TOOL_IDS.every((toolId) => toolIds.has(toolId));
}

function mermaidBoardRuntimeRecovery(
  status: StudioStatus | null,
  coreRuntimeReady: boolean,
  pmRuntimeReady: boolean,
  canRestart: boolean,
  boardError?: string | null,
  sourceOnly = false,
) {
  if (!status?.projectRoot || !coreRuntimeReady) {
    return {
      state: "offline" as const,
      canRestart,
      title: "Studio runtime unavailable",
      actionLabel: canRestart ? "Restart Studio runtime" : "Retry",
      message: canRestart
        ? "Studio runtime is offline or missing core board tools. Restart the managed runtime, then the board will re-check automatically."
        : "Studio runtime is offline or stale in browser preview. Restart `npm run studio:runtime`, then refresh this board.",
    };
  }
  if (!pmRuntimeReady) {
    return {
      state: "stale" as const,
      canRestart,
      title: sourceOnly ? "Local FigJam source ready" : "Runtime update required",
      actionLabel: canRestart && !sourceOnly ? "Restart Studio runtime" : sourceOnly ? "External sync gated" : "Runtime update required",
      message: sourceOnly
        ? "This runtime can create local Mermaid Jam source for FigJam. Direct board editing and FigJam sync unlock after the updated board tools are bundled."
        : canRestart
          ? `${MERMAID_BOARD_PM_RUNTIME_STALE} Restart the managed runtime to enable Brief and Send to FigJam.`
          : `${MERMAID_BOARD_PM_RUNTIME_STALE} In preview/dev, restart the Studio runtime process, then refresh this board.`,
    };
  }
  return {
    state: "ready" as const,
    canRestart: false,
    title: "",
    actionLabel: "",
    message: "Product Brainstorm Board runtime is ready.",
  };
}

function macOSSettingsUrl(permission: string): string {
  if (permission === "screenRecording") return "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";
  if (permission === "accessibility") return "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
  if (permission === "automation") return "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation";
  if (permission === "fileAccess") return "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";
  return "x-apple.systempreferences:com.apple.preference.security";
}

function layoutScenarioLabGraph(nodes: ScenarioLabNode[], edges: Array<[string, string]>): PositionedScenarioLabNode[] {
  const simulationNodes: ScenarioLabNode[] = nodes.map((node, index) => ({
    ...node,
    x: 86 + (index % 3) * 132,
    y: 70 + Math.floor(index / 3) * 110,
  }));
  const simulationLinks: Array<SimulationLinkDatum<ScenarioLabNode>> = edges.map(([source, target]) => ({ source, target }));
  const simulation = forceSimulation<ScenarioLabNode>(simulationNodes)
    .force("link", forceLink<ScenarioLabNode, SimulationLinkDatum<ScenarioLabNode>>(simulationLinks).id((node) => node.id).distance(120).strength(0.8))
    .force("charge", forceManyBody().strength(-280))
    .force("center", forceCenter(230, 140))
    .force("collision", forceCollide<ScenarioLabNode>().radius(48))
    .stop();

  for (let index = 0; index < 90; index += 1) simulation.tick();
  simulation.stop();

  return simulationNodes.map((node) => ({
    ...node,
    x: clampNumber(node.x ?? 230, 58, 402),
    y: clampNumber(node.y ?? 140, 48, 232),
  }));
}

function findLatestFailureEvent(events: StudioEvent[]): StudioEvent | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type === "session_error" || event.type === "stderr") return event;
  }
  return null;
}

type UsageLimitState = StudioUsageSnapshot["rateLimits"][number];

function visibleUsageLimitState(snapshot: StudioUsageSnapshot | null): UsageLimitState | null {
  if (!snapshot) return null;
  return snapshot.rateLimits.find((limit) => limit.status === "limited")
    ?? snapshot.rateLimits.find((limit) => limit.status === "warning")
    ?? snapshot.rateLimits[0]
    ?? null;
}

function usageLimitChipLabel(snapshot: StudioUsageSnapshot | null, limit: UsageLimitState | null): string {
  if (limit?.status === "limited") return "Limited";
  if (limit?.status === "warning") return "Budget";
  if (!snapshot) return "Limits";
  return `${formatTokenCount(snapshot.totals.totalTokens)} tok`;
}

function usageLimitRows(snapshot: StudioUsageSnapshot | null): Array<{ id: string; label: string; message: string; status: UsageLimitState["status"] }> {
  if (!snapshot) return [];
  return snapshot.rateLimits.slice(0, 5).map((limit) => ({
    id: limit.id,
    label: limit.harness ? `${limit.harness} / ${limit.provider}` : limit.provider,
    message: limit.retryAfterSeconds
      ? `${limit.message} Retry in ${limit.retryAfterSeconds}s.`
      : limit.remainingTokens !== undefined && limit.remainingTokens !== null
        ? `${limit.message}. ${formatTokenCount(limit.remainingTokens)} tokens remaining.`
        : limit.message,
    status: limit.status,
  }));
}

function formatTokenCount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}k`;
  return String(Math.round(value));
}

function formatCostEstimate(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "$0";
  if (value < 0.01) return "<$0.01";
  return `$${value.toFixed(2)}`;
}

function slashHelpPrompt(): string {
  return [
    "Slash commands stage Studio actions. Press Run after reviewing the staged settings.",
    "",
    ...SLASH_COMMANDS.map((command) => `/${command.id} - ${command.description}`),
  ].join("\n");
}

function uniqueSessions(sessions: Array<SessionSummary | null | undefined>): SessionSummary[] {
  const seen = new Set<string>();
  const unique: SessionSummary[] = [];
  for (const session of sessions) {
    if (!session || seen.has(session.id)) continue;
    seen.add(session.id);
    unique.push(session);
  }
  return unique;
}

function isLiveRuntimeSession(session: SessionSummary): boolean {
  return session.source !== "persisted" && (session.status === "running" || session.status === "queued");
}

function statusFromSessionEvent(event: StudioEvent): SessionSummary["status"] | null {
  if (event.type === "session_queued") return "queued";
  if (event.type === "session_started") return "running";
  if (event.type === "session_error") return "failed";
  if (event.type === "session_done") {
    return event.message.toLowerCase().includes("cancel") ? "cancelled" : "completed";
  }
  return null;
}

function updateSessionSummary(session: SessionSummary, event: StudioEvent, status: SessionSummary["status"] | null): SessionSummary {
  return {
    ...session,
    status: status ?? session.status,
    completedAt: status && ["completed", "failed", "cancelled"].includes(status) ? event.timestamp : session.completedAt,
    eventCount: session.eventCount + 1,
  };
}

function updateSessionSummaryCollection(
  sessions: SessionSummary[],
  event: StudioEvent,
  status: SessionSummary["status"] | null,
): SessionSummary[] {
  return sessions.map((session) => session.id === event.sessionId ? updateSessionSummary(session, event, status) : session);
}

function RuntimeRecoveryStrip(props: {
  health: RuntimeHealth;
  message: string | null;
  canRestart: boolean;
  onRetry: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
}) {
  const message = props.message
    ?? (props.health === "starting" ? "Starting local runtime..." : "Runtime unavailable");
  return (
    <section
      className="runtime-recovery-strip"
      data-runtime-recovery={props.health}
      data-runtime-health={props.health}
      aria-label="Runtime recovery"
    >
      <strong>{runtimeHealthLabel(props.health)}</strong>
      <span title={message}>{trimText(message, 96)}</span>
      <button data-action-id="runtime.retry" type="button" onClick={props.onRetry}>Retry</button>
      <button data-action-id="runtime.restart" type="button" onClick={props.onRestart} disabled={!props.canRestart}>Restart runtime</button>
      <button data-action-id="settings.open.runtime" type="button" onClick={props.onOpenSettings}>Open Settings</button>
    </section>
  );
}

function runtimeHealthFromStatus(status: StudioStatus): RuntimeHealth {
  const runtimeStatus = status.runtime?.status;
  if (runtimeStatus === "running") return "ready";
  if (runtimeStatus === "starting") return "starting";
  if (runtimeStatus === "stopped" || runtimeStatus === "error") return "degraded";
  if (status.status === "running" || status.status === "ready") return "ready";
  return "degraded";
}

function runtimeHealthLabel(health: RuntimeHealth): string {
  if (health === "ready") return "Ready";
  if (health === "starting") return "Starting";
  if (health === "degraded") return "Degraded";
  return "Offline";
}

function runtimeHealthDisplayLabel(health: RuntimeHealth, source?: string | null): string {
  if (source === "attached-existing-runtime") return "Attached";
  return runtimeHealthLabel(health);
}

function runtimeTruthTitle(status: StudioStatus | null, recoveryMessage?: string | null): string {
  if (status?.runtime?.runtimeSource === "attached-existing-runtime") {
    return "Using an existing runtime on 127.0.0.1:8765. Restart runtime after quitting that process to replace it.";
  }
  if (status?.runtime?.runtimeCacheRoot) {
    return `Runtime cache: ${status.runtime.runtimeCacheRoot}`;
  }
  return status?.projectRoot ?? recoveryMessage ?? "Runtime status";
}

function queueDockItemsFromRuntime(metrics: StudioRuntimeMetrics | null | undefined, health: RuntimeHealth): Array<{ id: string; label: string; detail: string; status: "empty" | "queued" | "running" | "blocked" }> {
  if (health !== "ready") return [{ id: "runtime", label: health === "starting" ? "Starting" : health === "degraded" ? "Blocked" : "Offline", detail: "Runtime", status: health === "starting" ? "running" : "blocked" }];
  if (!metrics) return [];
  const items: Array<{ id: string; label: string; detail: string; status: "empty" | "queued" | "running" | "blocked" }> = [];
  if (metrics.activeRuns > 0) items.push({ id: "active", label: "Running", detail: String(metrics.activeRuns), status: "running" });
  if (metrics.queuedRuns > 0) items.push({ id: "queued", label: "Queued", detail: String(metrics.queuedRuns), status: "queued" });
  if (metrics.workspaceLocks > 0 && metrics.queuedRuns > 0) items.push({ id: "blocked", label: "Blocked", detail: String(metrics.workspaceLocks), status: "blocked" });
  return items;
}

function formatEventName(type: string): string {
  return type.replace(/_/g, " ");
}

function harnessCanRun(harness: Harness | undefined, action: StudioAction): boolean {
  if (!harness) return false;
  if (!harness.enabled || !harness.installed) return false;
  if (harness.capabilities?.length && !harness.capabilities.includes(action)) return false;
  return harness.authStatus !== "missing" && harness.authStatus !== "needs_login";
}

function harnessReadinessLabel(harness: Harness | undefined): string {
  if (!harness) return "checking";
  if (!harness.enabled) return "disabled";
  if (!harness.installed || harness.authStatus === "missing") return "missing";
  if (harness.authStatus === "needs_login") return "needs login";
  if (harness.authStatus === "signed_in" || harness.authStatus === "ready") return "ready";
  if (harness.authStatus === "not_required") return "available";
  return "available";
}

function actionsForHarness(harness: Harness | undefined): Array<{ id: StudioAction; label: string }> {
  const capabilities = harness?.capabilities?.length ? new Set(harness.capabilities) : new Set<StudioAction>(["raw"]);
  const actions = ACTIONS.filter((action) => capabilities.has(action.id));
  return actions.length > 0 ? actions : [{ id: "raw", label: "Raw" }];
}

function resolveHarnessAction(action: StudioAction, harness: Harness | undefined): StudioAction {
  const actions = actionsForHarness(harness).map((candidate) => candidate.id);
  if (actions.includes(action)) return action;
  if (actions.includes("compose")) return "compose";
  return actions[0] ?? "raw";
}

function composerPlaceholder(inputMode: StudioInputMode, chatMode: StudioChatMode): string {
  if (inputMode === "terminal") return "Run a command…";
  if (inputMode === "auto") return "Ask, build, or run a command";
  switch (chatMode) {
    case "ideate":
      return "Sketch a direction or pose a question…";
    case "research":
      return "What should we research?";
    case "build":
      return "Describe what you want built…";
    case "review":
      return "What should we review?";
    case "terminal":
      return "Run a command…";
    default:
      return "Ask Mémoire to design, audit, or build…";
  }
}

function RunSpine(props: {
  session: SessionSummary | null;
  prompt: string;
  actionLabel: string;
  activities: StudioActivityItem[];
  activeProcesses: StudioActiveProcess[];
  events: StudioEvent[];
  agentThinkingState: "thinking" | "running" | "idle" | "failed";
  terminalBlocks: TerminalBlock[];
  totalTerminalBlockCount: number;
  designTrace: StudioDesignSystemTrace | null;
  lastFailure: StudioEvent | null;
  usageSnapshot: StudioUsageSnapshot | null;
  designLaneReceipt: RunSpineReceiptModel | null;
  collapsedBlockIds: Set<string>;
  canStart: boolean;
  startDisabledReason: string;
  onStart: () => void;
  onCopyBlock: (block: TerminalBlock) => void;
  onAttachBlock: (block: TerminalBlock) => void;
  onToggleBlock: (blockId: string) => void;
  onClearSearch: () => void;
  onSelectActivity: (activity: StudioActivityItem) => void;
  onSelectProcess: (process: StudioActiveProcess) => void;
  onSelectFile: (file: StudioDesignSystemTraceFile) => void;
  onSelectEvent: (event: StudioEvent) => void;
}) {
  const promptText = props.session?.prompt ?? props.prompt.trim();
  const latestPlan = [...props.activities].reverse().find((activity) =>
    activity.kind === "thinking" || /plan|intent|reason/i.test(`${activity.label} ${activity.summary}`),
  ) ?? null;
  const toolActivities = props.activities.filter((activity) => activity.kind !== "thinking").slice(-6);
  const toolReceipts = [
    ...props.activeProcesses.map((process) => ({
      id: `process-${process.id}`,
      label: "Running",
      fields: runSpineProcessReceiptFields(process),
      status: "running",
      title: process.cwd ?? process.command,
      onSelect: () => props.onSelectProcess(process),
    })),
    ...toolActivities.map((activity) => runSpineActivityReceipt(activity, props.events, props.session, () => props.onSelectActivity(activity))),
  ].slice(-6);
  const changedFiles = props.designTrace?.files ?? [];
  const fileReceipts = changedFiles.slice(0, 5).map((file) => ({
    id: file.path,
    label: runSpineCompactPath(file.path),
    fields: [
      { label: file.status, value: `+${file.insertions} -${file.deletions}` },
    ],
    status: file.status === "deleted" ? "warn" : "done",
    title: file.path,
    onSelect: () => props.onSelectFile(file),
  }));
  const resultBlock = [...props.terminalBlocks].reverse().find((block) =>
    block.kind === "session_result"
    || block.events.some((event) => ["session_result", "artifact", "design_decision", "acceptance_statement"].includes(event.type)),
  ) ?? null;
  const resultSelectEvent = props.lastFailure ?? resultBlock?.events.find((event) => ["session_result", "artifact", "design_decision", "acceptance_statement"].includes(event.type)) ?? null;
  const sessionReceipt = props.session ? runSpineSessionReceipt(props.session, props.events, props.usageSnapshot, resultSelectEvent ? () => props.onSelectEvent(resultSelectEvent) : undefined) : null;
  const resultSummary = props.lastFailure?.message
    ?? runSpineResultSummary(resultBlock, props.session)
    ?? (props.session ? compactSessionStatusLabel(props.session.status) : null);
  const resultStatus = props.lastFailure
    ? "warn"
    : props.session?.status === "completed"
      ? "done"
      : props.session?.status === "running" || props.session?.status === "queued"
        ? "running"
        : "idle";
  const rows = compactRunSpineRows({
    promptText,
    harness: props.session?.harness,
    promptMeta: props.session ? `${props.session.harness} / ${props.session.action ?? "run"}` : props.actionLabel,
    latestPlanSummary: latestPlan?.summary,
    latestPlanStatus: latestPlan?.status,
    latestPlanMeta: latestPlan ? runSpineActivityMeta(latestPlan, props.session?.harness) : null,
    agentThinkingState: props.agentThinkingState,
    activeProcessCount: props.activeProcesses.length,
    toolActivityCount: toolActivities.length,
    changedFileCount: changedFiles.length,
    fileTraceError: props.designTrace?.error ?? null,
    fileTraceMeta: props.designTrace?.reviewLabel ?? "trace",
    designLane: props.designLaneReceipt ? {
      title: props.designLaneReceipt.title ?? "Design-system and FigJam handoff context is ready.",
      status: props.designLaneReceipt.status,
      meta: "system / figjam",
    } : null,
    resultSummary,
    resultMeta: resultBlock?.title ?? props.session?.status ?? null,
    resultStatus,
  }).map((row) => ({
    ...row,
    receipts: row.id === "tools"
      ? toolReceipts
      : row.id === "files"
        ? fileReceipts
        : row.id === "design-lane" && props.designLaneReceipt
          ? [props.designLaneReceipt]
          : row.id === "result" && sessionReceipt
            ? [sessionReceipt]
            : undefined,
    onSelect: row.id === "design-lane"
      ? props.designLaneReceipt?.onSelect
      : row.id === "result"
        ? resultSelectEvent ? () => props.onSelectEvent(resultSelectEvent) : undefined
        : undefined,
  }));
  return (
    <section className="run-spine" data-run-spine="compact" aria-label="Run timeline">
      {rows.map((row) => (
        <article className="run-spine-row" data-empty={row.summary || row.receipts?.length ? undefined : "true"} data-run-spine-row={row.id} data-status={row.status} key={row.id}>
          <div className="run-spine-marker" aria-hidden="true" />
          <div className="run-spine-row-body">
            <header>
              <span>{row.label}</span>
              {row.meta ? <small>{row.meta}</small> : null}
            </header>
            {row.summary && row.onSelect ? (
              <button className="run-spine-summary-button" data-action-id={`run-spine.inspect.${row.id}`} type="button" onClick={row.onSelect} title={row.summary}>
                {trimText(row.summary, 220)}
              </button>
            ) : row.summary ? (
              <p title={row.summary}>{trimText(row.summary, 220)}</p>
            ) : null}
            {row.receipts?.length ? (
              <div className="run-spine-receipts" data-run-spine-receipts={row.id}>
                {row.receipts.map((receipt) => (
                  <button className="run-spine-receipt" data-status={receipt.status} key={receipt.id} onClick={receipt.onSelect} title={runSpineReceiptTitle(receipt)} type="button">
                    <strong>{receipt.label}</strong>
                    <span className="run-spine-receipt-fields">
                      {receipt.fields.map((field) => (
                        <small key={field.label}>
                          <b>{field.label}</b>
                          <span>{field.value}</span>
                        </small>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </article>
      ))}
      {props.totalTerminalBlockCount > 0 ? (
        <details className="run-spine-log" data-run-spine-log="raw">
          <summary>
            <span>View log</span>
            <small>{props.terminalBlocks.length}/{props.totalTerminalBlockCount} blocks</small>
          </summary>
          <section
            className="block-feed"
            data-block-feed="terminal-blocks"
            data-output-renderer="inline"
            data-message-feed="chat-output"
            aria-label="Raw run log"
          >
            {props.terminalBlocks.map((block) => (
              <TerminalBlockSurface kind={block.kind} key={block.id}>
                <header>
                  <div>
                    <span>{block.title}</span>
                    <small>{block.meta}</small>
                  </div>
                  <div className="blockActions">
                    {block.timestamp ? <time dateTime={block.timestamp}>{formatTime(block.timestamp)}</time> : null}
                    <IconButton {...workbenchAction("copy")} actionId={`block.copy.${block.id}`} ariaLabel={`Copy ${block.title}`} onClick={() => props.onCopyBlock(block)} />
                    <IconButton {...workbenchAction("context")} actionId={`block.context.${block.id}`} ariaLabel={`Use ${block.title} as context`} onClick={() => props.onAttachBlock(block)} />
                    <IconButton
                      {...workbenchAction(props.collapsedBlockIds.has(block.id) ? "expand" : "collapse")}
                      actionId={`block.toggle.${block.id}`}
                      ariaLabel={props.collapsedBlockIds.has(block.id) ? `Expand ${block.title}` : `Collapse ${block.title}`}
                      onClick={() => props.onToggleBlock(block.id)}
                    />
                  </div>
                </header>
                {!props.collapsedBlockIds.has(block.id) ? <BlockBody block={block} /> : null}
              </TerminalBlockSurface>
            ))}
            {props.totalTerminalBlockCount > 0 && props.terminalBlocks.length === 0 ? (
              <div className="empty-state compact-empty-state" data-smart-empty-state="output-filter">
                <button data-action-id="conversation.search.clear" type="button" onClick={props.onClearSearch}>Clear</button>
              </div>
            ) : null}
          </section>
        </details>
      ) : promptText.trim() ? (
        <button className="run-spine-start" data-action-id="activity.start" type="button" onClick={props.onStart} disabled={!props.canStart} title={props.startDisabledReason}>
          <StudioControlIcon name="command" />
          <span>{props.canStart ? "Start" : props.startDisabledReason}</span>
        </button>
      ) : null}
    </section>
  );
}

function ContextualInspectorPane(props: {
  selection: InspectorSelection | null;
  session: SessionSummary | null;
  visibleSessionStatus: string;
  workspaceLabel: string;
  runtimeHealth: RuntimeHealth;
  status: StudioStatus | null;
  harnessLabel: string;
  activities: StudioActivityItem[];
  activeProcesses: StudioActiveProcess[];
  designTrace: StudioDesignSystemTrace | null;
  artifacts: DesignSystemArtifact[];
  events: StudioEvent[];
  lastFailure: StudioEvent | null;
  usageSnapshot: StudioUsageSnapshot | null;
  usageLoading: boolean;
  onClearSelection: () => void;
  onCopyText: (value: string) => void;
  onOpenUsageLimits: () => void;
  onRefresh: () => void;
  onResolveApproval: (callId: string, decision: "approve" | "deny") => Promise<void> | void;
}) {
  const selection = props.selection;
  const pendingApprovals = pendingApprovalEvents(props.events);
  const selectedActivity = selection?.kind === "activity" ? props.activities.find((activity) => activity.id === selection.id) ?? null : null;
  const selectedProcess = selection?.kind === "process" ? props.activeProcesses.find((process) => process.id === selection.id) ?? null : null;
  const selectedFile = selection?.kind === "file" ? props.designTrace?.files.find((file) => file.path === selection.path) ?? null : null;
  const selectedArtifact = selection?.kind === "artifact" ? props.artifacts.find((artifact) => artifact.id === selection.id) ?? null : null;
  const selectedApproval = selection?.kind === "approval" ? props.events.find((event) => event.id === selection.eventId) ?? null : null;
  const selectedEvent = selection?.kind === "event" ? props.events.find((event) => event.id === selection.id) ?? null : null;
  const hasResolvedSelection = Boolean(selectedActivity || selectedProcess || selectedFile || selectedArtifact || selectedApproval || selectedEvent);
  const readinessItems = designerWorkbenchReadiness({
    runtimeHealth: props.runtimeHealth,
    status: props.status,
    workspaceLabel: props.workspaceLabel,
    harnessLabel: props.harnessLabel,
    visibleSessionStatus: props.visibleSessionStatus,
    activities: props.activities,
    activeProcesses: props.activeProcesses,
    designTrace: props.designTrace,
    artifacts: props.artifacts,
    events: props.events,
    pendingApprovals,
    lastFailure: props.lastFailure,
  });
  const [showUsageDetails, setShowUsageDetails] = useState(false);
  const readinessNeedsAttention = readinessItems.some((item) => item.status !== "ready");
  const showReadinessPanel = readinessNeedsAttention;
  const usageRows = usageLimitRows(props.usageSnapshot);

  return (
    <section className="agent-cockpit-pane inspector-pane" data-agent-cockpit="inspector" data-pane-intent-surface="inspector">
      <header className="inspector-pane-head">
        <div>
          <span>Inspector</span>
          <strong>{hasResolvedSelection ? inspectorSelectionTitle(selection) : "Runtime and session"}</strong>
        </div>
        <div className="inspector-pane-actions">
          {hasResolvedSelection ? <button data-action-id="inspector.clear" type="button" onClick={props.onClearSelection}>Clear</button> : null}
          <button data-action-id="runtime.refresh" type="button" onClick={props.onRefresh}>Refresh</button>
        </div>
      </header>

      {!hasResolvedSelection ? (
        <section className="inspector-summary-card" data-inspector-empty="runtime-session">
          <dl>
            <div>
              <dt>Runtime</dt>
              <dd>{runtimeHealthDisplayLabel(props.runtimeHealth, props.status?.runtime?.runtimeSource)}</dd>
            </div>
            <div>
              <dt>Workspace</dt>
              <dd title={props.status?.projectRoot ?? props.workspaceLabel}>{props.workspaceLabel}</dd>
            </div>
            <div>
              <dt>Harness</dt>
              <dd>{props.harnessLabel}</dd>
            </div>
            <div>
              <dt>Session</dt>
              <dd>{compactSessionStatusLabel(props.visibleSessionStatus)}</dd>
            </div>
          </dl>
          {props.lastFailure ? <p>{trimText(props.lastFailure.message, 140)}</p> : null}
          {showReadinessPanel ? (
            <section className="designer-readiness-panel" aria-label="Designer workbench readiness">
              <header>
                <span>Designer workbench</span>
                <strong>{designerReadinessSummary(readinessItems)}</strong>
              </header>
              <div className="designer-readiness-list">
                {readinessItems.map((item) => (
                  <article className="designer-readiness-item" data-readiness-status={item.status} key={item.id}>
                    <i className="status-dot" data-auth-status={item.status === "missing" ? "missing" : item.status} aria-hidden="true" />
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          {showUsageDetails ? (
            <section className="inspector-usage-panel" data-inspector-usage="limits" aria-busy={props.usageLoading ? "true" : undefined}>
              <header>
                <div>
                  <span>Usage and limits</span>
                  <strong>{props.usageLoading ? "Refreshing" : usageLimitChipLabel(props.usageSnapshot, visibleUsageLimitState(props.usageSnapshot))}</strong>
                </div>
                <button data-action-id="inspector.usage.refresh" type="button" onClick={props.onOpenUsageLimits}>Retry</button>
              </header>
              <div className="usage-totals-grid">
                <article>
                  <span>Total</span>
                  <strong>{formatTokenCount(props.usageSnapshot?.totals.totalTokens ?? 0)}</strong>
                </article>
                <article>
                  <span>In / out</span>
                  <strong>{formatTokenCount(props.usageSnapshot?.totals.inputTokens ?? 0)} / {formatTokenCount(props.usageSnapshot?.totals.outputTokens ?? 0)}</strong>
                </article>
                <article>
                  <span>Cost</span>
                  <strong>{formatCostEstimate(props.usageSnapshot?.totals.estimatedCostUsd ?? 0)}</strong>
                </article>
              </div>
              {usageRows.length ? (
                <div className="usage-limit-list">
                  {usageRows.map((row) => (
                    <article key={row.id} className={row.status}>
                      <span>{row.label}</span>
                      <strong>{row.message}</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No observed rate limits. Local budgets are warning-only.</p>
              )}
            </section>
          ) : null}
          <div className="inspector-summary-actions">
            <button
              data-action-id="inspector.usage"
              type="button"
              onClick={() => {
                setShowUsageDetails(true);
                props.onOpenUsageLimits();
              }}
            >
              Usage details
            </button>
          </div>
        </section>
      ) : null}

      {selectedActivity ? (
        <section className="inspector-detail-card" data-inspector-kind="activity">
          <InspectorTitle label={runSpineActivityLabel(selectedActivity)} status={selectedActivity.status} />
          <InspectorMetadata rows={[
            ["Kind", selectedActivity.kind],
            ["Started", formatTime(selectedActivity.startedAt)],
            ["Finished", selectedActivity.completedAt ? formatTime(selectedActivity.completedAt) : "--"],
            ["Target", selectedActivity.targetPath ?? selectedActivity.command ?? "--"],
          ]} />
          <p>{selectedActivity.summary}</p>
          {selectedActivity.command ? <InspectorCode title="Command" value={selectedActivity.command} onCopy={props.onCopyText} /> : null}
          {selectedActivity.outputPreview ? <InspectorCode title="Output" value={selectedActivity.outputPreview} /> : null}
        </section>
      ) : null}

      {selectedProcess ? (
        <section className="inspector-detail-card" data-inspector-kind="process">
          <InspectorTitle label="Running command" status={selectedProcess.status} />
          <InspectorMetadata rows={[
            ["Cwd", selectedProcess.cwd ?? "--"],
            ["Started", formatTime(selectedProcess.startedAt)],
            ["Session", selectedProcess.sessionId ?? "--"],
          ]} />
          <InspectorCode title="Command" value={selectedProcess.command} onCopy={props.onCopyText} />
          {selectedProcess.outputPreview ? <InspectorCode title="Output" value={selectedProcess.outputPreview} /> : null}
        </section>
      ) : null}

      {selectedFile ? (
        <section className="inspector-detail-card" data-inspector-kind="file">
          <InspectorTitle label={runSpineCompactPath(selectedFile.path)} status={selectedFile.status} />
          <InspectorMetadata rows={[
            ["Kind", selectedFile.kind],
            ["Changed", `+${selectedFile.insertions} / -${selectedFile.deletions}`],
            ["Design system", selectedFile.designSystem ? "yes" : "no"],
          ]} />
          <InspectorCode title="Path" value={selectedFile.path} onCopy={props.onCopyText} />
        </section>
      ) : null}

      {selectedArtifact ? (
        <section className="inspector-detail-card" data-inspector-kind="artifact">
          <InspectorTitle label={selectedArtifact.title} status={selectedArtifact.status} />
          <InspectorMetadata rows={[
            ["Harness", selectedArtifact.createdByHarness],
            ["Sections", String(selectedArtifact.sections.length)],
            ["Sources", String(selectedArtifact.sourceRefs.length)],
            ["Updated", formatTime(selectedArtifact.updatedAt)],
          ]} />
          <p>{trimText(selectedArtifact.rawContent, 360)}</p>
          {selectedArtifact.sourceRefs.length ? (
            <div className="inspector-mini-list">
              {selectedArtifact.sourceRefs.slice(0, 5).map((ref) => (
                <span key={ref.id} title={ref.sourcePath ?? ref.url ?? ref.label}>{ref.label}</span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {selectedApproval ? (
        <section className="inspector-detail-card" data-inspector-kind="approval">
          <InspectorTitle label={approvalToolId(selectedApproval) ?? "Approval request"} status="waiting" />
          <InspectorMetadata rows={[
            ["Call", approvalCallId(selectedApproval) ?? selectedApproval.id],
            ["Requested", formatTime(selectedApproval.timestamp)],
            ["Session", selectedApproval.sessionId],
          ]} />
          <p>{selectedApproval.message}</p>
          <div className="inspector-action-row">
            <button className="primary" data-action-id={`inspector.approval.approve.${approvalCallId(selectedApproval) ?? selectedApproval.id}`} type="button" onClick={() => void props.onResolveApproval(approvalCallId(selectedApproval) ?? selectedApproval.id, "approve")}>Approve</button>
            <button data-action-id={`inspector.approval.deny.${approvalCallId(selectedApproval) ?? selectedApproval.id}`} type="button" onClick={() => void props.onResolveApproval(approvalCallId(selectedApproval) ?? selectedApproval.id, "deny")}>Deny</button>
          </div>
          <InspectorData data={selectedApproval.data} />
        </section>
      ) : null}

      {selectedEvent ? (
        <section className="inspector-detail-card" data-inspector-kind="event">
          <InspectorTitle label={formatEventName(selectedEvent.type)} status={selectedEvent.type.includes("fail") ? "failed" : "event"} />
          <InspectorMetadata rows={[
            ["Time", formatTime(selectedEvent.timestamp)],
            ["Session", selectedEvent.sessionId],
          ]} />
          <p>{selectedEvent.message}</p>
          <InspectorData data={selectedEvent.data} />
        </section>
      ) : null}

      {selection && !hasResolvedSelection ? (
        <section className="inspector-summary-card" data-inspector-empty="missing-selection">
          <p>The selected item is no longer in the active trace.</p>
          <button data-action-id="inspector.clear-missing" type="button" onClick={props.onClearSelection}>Show summary</button>
        </section>
      ) : null}
    </section>
  );
}

function designerWorkbenchReadiness(input: {
  runtimeHealth: RuntimeHealth;
  status: StudioStatus | null;
  workspaceLabel: string;
  harnessLabel: string;
  visibleSessionStatus: string;
  activities: StudioActivityItem[];
  activeProcesses: StudioActiveProcess[];
  designTrace: StudioDesignSystemTrace | null;
  artifacts: DesignSystemArtifact[];
  events: StudioEvent[];
  pendingApprovals: StudioEvent[];
  lastFailure: StudioEvent | null;
}): DesignerReadinessItem[] {
  const hasWorkspace = Boolean(input.status?.projectRoot?.trim());
  const liveTraceCount = input.activities.length + input.activeProcesses.length + input.events.length;
  const fileCount = input.designTrace?.files.length ?? 0;
  const filesDetail = input.designTrace?.status === "unavailable"
    ? "File trace unavailable; refresh runtime or open a workspace."
    : fileCount > 0
      ? `${fileCount} changed file${fileCount === 1 ? "" : "s"} ready for review.`
      : "Clean working tree trace.";
  const approvalCount = input.pendingApprovals.length;
  const runtimeStatus: DesignerReadinessStatus = input.runtimeHealth === "ready" ? "ready" : input.runtimeHealth === "offline" ? "missing" : "warn";

  return [
    {
      id: "runtime",
      label: "Agent runtime",
      status: runtimeStatus,
      detail: `${runtimeHealthLabel(input.runtimeHealth)} runtime with Codex-style run, stop, trace, and approval controls.`,
    },
    {
      id: "workspace",
      label: "Workspace",
      status: hasWorkspace ? "ready" : "warn",
      detail: hasWorkspace ? `${input.workspaceLabel} is open for project-aware work.` : "Open a folder before running project-aware work.",
    },
    {
      id: "harness",
      label: "Codex and Claude",
      status: input.runtimeHealth === "ready" ? "ready" : "warn",
      detail: `${input.harnessLabel} selected; primary harness setup lives in Settings.`,
    },
    {
      id: "composer",
      label: "Designer composer",
      status: "ready",
      detail: "Attach context, choose plan/research/build/review/ship, then run or continue.",
    },
    {
      id: "trace",
      label: "Transparent run trace",
      status: "ready",
      detail: liveTraceCount > 0 ? `${liveTraceCount} trace signal${liveTraceCount === 1 ? "" : "s"} captured.` : "Shows prompt, plan, tools, files, result, receipts, and raw logs after a run starts.",
    },
    {
      id: "files",
      label: "Design diff review",
      status: input.designTrace?.status === "unavailable" ? "warn" : "ready",
      detail: filesDetail,
    },
    {
      id: "approvals",
      label: "Guarded actions",
      status: approvalCount > 0 ? "warn" : "ready",
      detail: approvalCount > 0 ? `${approvalCount} approval request${approvalCount === 1 ? "" : "s"} waiting.` : "Risky commands stay explicit through approval receipts.",
    },
    {
      id: "artifacts",
      label: "Product-design artifacts",
      status: "ready",
      detail: input.artifacts.length > 0 ? `${input.artifacts.length} artifact${input.artifacts.length === 1 ? "" : "s"} captured for handoff.` : "Specs, research, tokens, IA, Figma, memory, and handoff packets are available from tabs.",
    },
    {
      id: "quality",
      label: "Quality signals",
      status: input.lastFailure ? "warn" : "ready",
      detail: input.lastFailure ? trimText(input.lastFailure.message, 120) : `${compactSessionStatusLabel(input.visibleSessionStatus)} session state with cost and usage telemetry.`,
    },
  ];
}

function designerReadinessSummary(items: DesignerReadinessItem[]): string {
  const setupCount = items.filter((item) => item.status === "missing").length;
  const attentionCount = items.filter((item) => item.status === "warn").length + setupCount;
  if (setupCount > 0) return `${setupCount} setup item${setupCount === 1 ? "" : "s"} missing`;
  if (attentionCount > 0) return `${attentionCount} item${attentionCount === 1 ? "" : "s"} need attention`;
  return "Ready for designer runs";
}

function InspectorTitle(props: { label: string; status: string }) {
  return (
    <header className="inspector-detail-title">
      <strong title={props.label}>{trimText(props.label, 96)}</strong>
      <span>{props.status}</span>
    </header>
  );
}

function InspectorMetadata(props: { rows: Array<[string, string]> }) {
  return (
    <dl className="inspector-metadata">
      {props.rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd title={value}>{trimText(value, 96)}</dd>
        </div>
      ))}
    </dl>
  );
}

function InspectorCode(props: { title: string; value: string; onCopy?: (value: string) => void }) {
  return (
    <details className="inspector-code-block" open={props.title === "Path" || props.title === "Command"}>
      <summary>
        <span>{props.title}</span>
        {props.onCopy ? <button data-action-id={`inspector.copy.${props.title.toLowerCase()}`} type="button" onClick={(event) => { event.preventDefault(); props.onCopy?.(props.value); }}>Copy</button> : null}
      </summary>
      <pre>{props.value}</pre>
    </details>
  );
}

function InspectorData(props: { data: unknown }) {
  if (props.data === undefined || props.data === null) return null;
  return <InspectorCode title="Data" value={safeInspectorJson(props.data)} />;
}

function pendingApprovalEvents(events: StudioEvent[]): StudioEvent[] {
  const resolved = new Set<string>();
  for (const event of events) {
    if (event.type === "approval_resolved") {
      const callId = approvalCallId(event);
      if (callId) resolved.add(callId);
    }
  }
  return events.filter((event) => {
    if (event.type !== "approval_request") return false;
    const callId = approvalCallId(event);
    return Boolean(callId && !resolved.has(callId));
  });
}

function approvalCallId(event: StudioEvent): string | null {
  const data = event.data && typeof event.data === "object" ? event.data as Record<string, unknown> : null;
  return typeof data?.callId === "string" ? data.callId : null;
}

function approvalToolId(event: StudioEvent): string | null {
  const data = event.data && typeof event.data === "object" ? event.data as Record<string, unknown> : null;
  return typeof data?.toolId === "string" ? data.toolId : null;
}

function inspectorSelectionTitle(selection: InspectorSelection | null): string {
  if (!selection) return "Runtime and session";
  if (selection.kind === "activity") return "Run event";
  if (selection.kind === "process") return "Live process";
  if (selection.kind === "file") return "Changed file";
  if (selection.kind === "artifact") return "Artifact";
  if (selection.kind === "approval") return "Approval";
  return "Event";
}

function safeInspectorJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function runSpineProcessReceiptFields(process: StudioActiveProcess): Array<{ label: string; value: string }> {
  return compactReceiptFields([
    ["cmd", runSpineCompactCommand(process.command)],
    ["cwd", process.cwd ? runSpineCompactPath(process.cwd) : null],
    ["dur", runSpineDurationLabel(process.startedAt, null)],
  ]);
}

function runSpineActivityReceipt(activity: StudioActivityItem, events: StudioEvent[], session: SessionSummary | null, onSelect: () => void) {
  const sourceEvents = runSpineSourceEvents(activity.sourceEventIds, events);
  const cwd = runSpineStringFromEvents(sourceEvents, ["cwd", "workingDirectory", "working_directory"]) ?? session?.cwd ?? null;
  const exitCode = runSpineNumberFromEvents(sourceEvents, ["exit_code", "exitCode"]);
  const fields = compactReceiptFields([
    ["cmd", activity.command ? runSpineCompactCommand(activity.command) : null],
    ["cwd", cwd ? runSpineCompactPath(cwd) : null],
    ["dur", runSpineDurationLabel(activity.startedAt, activity.completedAt ?? null)],
    ["exit", typeof exitCode === "number" ? String(exitCode) : null],
    ["file", activity.targetPath ? runSpineCompactPath(activity.targetPath) : null],
  ]);
  return {
    id: activity.id,
    label: runSpineActivityLabel(activity),
    fields: fields.length ? fields : [{ label: "event", value: runSpineActivityMeta(activity) }],
    status: activity.status === "failed" ? "warn" : activity.status === "running" ? "running" : "done",
    title: activity.command ?? activity.targetPath ?? activity.summary,
    onSelect,
  };
}

function runSpineSessionReceipt(session: SessionSummary, events: StudioEvent[], usageSnapshot: StudioUsageSnapshot | null, onSelect?: () => void) {
  const usage = runSpineUsageSummary(events, usageSnapshot);
  const fields = compactReceiptFields([
    ["dur", runSpineDurationLabel(session.startedAt, session.completedAt)],
    ["exit", session.exitCode === null ? null : String(session.exitCode)],
    ["tokens", usage?.tokens ?? null],
    ["cost", usage?.cost ?? null],
  ]);
  return {
    id: `session-${session.id}`,
    label: compactSessionStatusLabel(session.status),
    fields: fields.length ? fields : [{ label: "events", value: String(session.eventCount) }],
    status: session.status === "failed" ? "warn" : session.status === "running" || session.status === "queued" ? "running" : "done",
    title: session.id,
    onSelect,
  };
}

function compactReceiptFields(fields: Array<[string, string | null | undefined]>): Array<{ label: string; value: string }> {
  return fields
    .filter((field): field is [string, string] => Boolean(field[1]))
    .map(([label, value]) => ({ label, value }));
}

function runSpineSourceEvents(sourceEventIds: string[], events: StudioEvent[]): StudioEvent[] {
  const idSet = new Set(sourceEventIds);
  return events.filter((event) => idSet.has(event.id));
}

function runSpineStringFromEvents(events: StudioEvent[], keys: string[]): string | null {
  for (const event of [...events].reverse()) {
    const data = event.data && typeof event.data === "object" ? event.data as Record<string, unknown> : null;
    for (const key of keys) {
      const value = data?.[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return null;
}

function runSpineNumberFromEvents(events: StudioEvent[], keys: string[]): number | null {
  for (const event of [...events].reverse()) {
    const data = event.data && typeof event.data === "object" ? event.data as Record<string, unknown> : null;
    for (const key of keys) {
      const value = data?.[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
  }
  return null;
}

function runSpineUsageSummary(events: StudioEvent[], usageSnapshot: StudioUsageSnapshot | null): { tokens: string; cost: string } | null {
  const tokenEvent = [...events].reverse().find((event) => event.type === "token_usage");
  const data = tokenEvent?.data && typeof tokenEvent.data === "object" ? tokenEvent.data as Record<string, unknown> : null;
  const totalTokens = numberFromRecord(data, ["totalTokens", "total_tokens", "tokens"]) ?? usageSnapshot?.totals.totalTokens ?? null;
  const cost = numberFromRecord(data, ["estimatedCostUsd", "estimated_cost_usd", "costUsd", "cost_usd"]) ?? usageSnapshot?.totals.estimatedCostUsd ?? null;
  if (totalTokens === null && cost === null) return null;
  return {
    tokens: totalTokens === null ? "--" : formatTokenCount(totalTokens),
    cost: cost === null ? "--" : formatCostEstimate(cost),
  };
}

function numberFromRecord(record: Record<string, unknown> | null, keys: string[]): number | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function runSpineCompactCommand(command: string): string {
  return trimText(command.replace(/\s+/g, " ").trim(), 52);
}

function runSpineDurationLabel(startedAt: string, completedAt: string | null): string | null {
  const start = Date.parse(startedAt);
  const end = completedAt ? Date.parse(completedAt) : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const ms = end - start;
  if (ms < 1_000) return `${Math.max(1, Math.round(ms))}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(ms < 10_000 ? 1 : 0)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

function runSpineReceiptTitle(receipt: { title?: string; fields: Array<{ label: string; value: string }> }): string {
  return receipt.title ?? receipt.fields.map((field) => `${field.label}: ${field.value}`).join(" · ");
}

function runSpineActivityLabel(activity: StudioActivityItem): string {
  if (activity.kind === "reading_file") return "Read";
  if (activity.kind === "searching") return "Search";
  if (activity.kind === "listing") return "List";
  if (activity.kind === "writing_file") return "Write";
  if (activity.kind === "running_command") return "Command";
  if (activity.kind === "browser_action") return "Browser";
  if (activity.kind === "figma_action") return "Figma";
  if (activity.kind === "mcp_call") return "MCP";
  if (activity.kind === "computer_action") return "Computer";
  if (activity.kind === "using_tool") return "Tool";
  return "Action";
}

function runSpineActivityMeta(activity: StudioActivityItem, harness?: HarnessId): string {
  if (activity.targetPath) return runSpineCompactPath(activity.targetPath);
  if (activity.command) return trimText(activity.command, 86);
  return compactRunSummary(activity.summary, harness, 86) ?? trimText(activity.summary, 86);
}

function runSpineCompactPath(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 2 ? parts.slice(-2).join("/") : normalized;
}

function runSpineResultSummary(block: TerminalBlock | null, session?: SessionSummary | null): string | null {
  if (!block) return null;
  const text = block.messages.map((message) => message.trim()).find(Boolean);
  return compactRunSummary(text ?? block.title, session?.harness, 180);
}

function runDisabledReason(harness: Harness | undefined, harnessStatusCopy: string, prompt: string, runtimeHealth: RuntimeHealth, hasWorkspace: boolean, action: StudioAction): string {
  if (!hasWorkspace) return "Open a folder to run";
  if (runtimeHealth !== "ready") return `Runtime ${runtimeHealthLabel(runtimeHealth)}`;
  if (!prompt.trim()) return "Add a prompt to run";
  if (!harness) return "Pick a harness to run";
  if (!harness.enabled) return `${harness.label} is disabled`;
  if (!harness.installed) return `${harness.label} is not installed`;
  if (harness.authStatus === "needs_login") return `${harness.label} needs login`;
  if (harness.authStatus === "missing") return `${harness.label} is missing`;
  if (harness.capabilities?.length && !harness.capabilities.includes(action)) return `${harness.label} cannot run ${action}`;
  return harnessStatusCopy;
}

function TruthStripItem({ item }: { item: TruthStripItemModel }) {
  const accessibleLabel = `${item.label} ${item.detail}`.trim();
  return (
    <span
      aria-label={accessibleLabel}
      className="truth-strip-item"
      data-truth-status={item.status}
      title={item.title ?? accessibleLabel}
    >
      <i className="status-dot" data-auth-status={item.status} aria-hidden="true" />
      <span className="truth-strip-label">{item.label}</span>
      <span className="truth-strip-detail">{item.detail}</span>
    </span>
  );
}

function runtimeTruthStatus(health: RuntimeHealth): TruthStripStatus {
  if (health === "ready") return "ready";
  if (health === "starting") return "unknown";
  if (health === "degraded") return "warn";
  return "missing";
}

function truthHarnessLabel(harness: Harness | undefined, shortName: string): string {
  if (!harness) return `${shortName} checking`;
  if (!harness.enabled) return `${shortName} disabled`;
  if (!harness.installed || harness.authStatus === "missing") return `${shortName} missing`;
  if (harness.authStatus === "needs_login") return `${shortName} login`;
  if (harness.authStatus === "signed_in" || harness.authStatus === "ready") return `${shortName} signed in`;
  if (harness.authStatus === "not_required") return `${shortName} available`;
  return harness.installed ? `${shortName} available` : `${shortName} checking`;
}

function truthHarnessStateLabel(harness: Harness | undefined): string {
  if (!harness) return "Checking";
  if (!harness.enabled) return "Off";
  if (!harness.installed || harness.authStatus === "missing") return "Missing";
  if (harness.authStatus === "needs_login") return "Login";
  if (harness.authStatus === "signed_in" || harness.authStatus === "ready") return "Signed in";
  if (harness.authStatus === "not_required") return "Ready";
  return harness.installed ? "Ready" : "Checking";
}

function truthHarnessStatus(harness: Harness | undefined): TruthStripStatus {
  return harnessAuthDot(harness);
}

function worktreeTruthLabel(trace: StudioDesignSystemTrace | null, lastFailure: StudioEvent | null): string {
  if (lastFailure) return "Failure";
  const changed = trace?.filesChanged ?? trace?.files.length ?? 0;
  return changed > 0 ? `${changed} changed` : "Clean";
}

function worktreeTruthStatus(trace: StudioDesignSystemTrace | null, lastFailure: StudioEvent | null): TruthStripStatus {
  if (lastFailure) return "warn";
  const changed = trace?.filesChanged ?? trace?.files.length ?? 0;
  return changed > 0 ? "warn" : "ready";
}

function worktreeTruthTitle(trace: StudioDesignSystemTrace | null, lastFailure: StudioEvent | null): string {
  if (lastFailure) return lastFailure.message;
  if (trace?.error) return trace.error;
  if (trace && trace.filesChanged > 0) return trace.reviewLabel;
  return "No changed files";
}

function harnessAuthDot(harness: Harness | undefined): "ready" | "warn" | "missing" | "unknown" {
  if (!harness) return "unknown";
  if (!harness.enabled) return "missing";
  if (!harness.installed || harness.authStatus === "missing") return "missing";
  if (harness.authStatus === "needs_login") return "warn";
  if (harness.authStatus === "signed_in" || harness.authStatus === "ready" || harness.authStatus === "not_required") return "ready";
  return harness.installed ? "ready" : "unknown";
}

function composerHarnessIcon(id: HarnessId): WorkbenchIconName {
  if (id === "codex") return "codex";
  if (id === "claude-code") return "claude";
  if (id === "ollama") return "ollama";
  if (id === "opencode") return "opencode";
  return "harness";
}

function composerHarnessTitle(harness: Harness): string {
  if (!harness.enabled) return `${harness.label}: setup required`;
  const state = harnessReadinessLabel(harness);
  return state ? `${harness.label}: ${state}` : harness.label;
}

function composerHarnessTooltip(harness: Harness): string {
  if (!harness.enabled) return `Set up ${harness.label}`;
  return harness.label;
}

function ConversationGoalRow(props: {
  goal: string;
  turnIndex: number;
  onChange: (next: string) => void;
  editing?: boolean;
  onEditingChange?: (next: boolean) => void;
}) {
  const [localEditing, setLocalEditing] = useState(false);
  const [draft, setDraft] = useState(props.goal);
  useEffect(() => { setDraft(props.goal); }, [props.goal]);
  const summary = props.goal.trim();
  const editing = props.editing ?? localEditing;
  function setEditing(next: boolean) {
    setLocalEditing(next);
    props.onEditingChange?.(next);
  }
  function commit() {
    props.onChange(draft.trim());
    setEditing(false);
  }
  return (
    <section className="conversation-goal-row" data-conversation-goal={summary ? "set" : "empty"} aria-label="Conversation goal">
      <span className="conversation-goal-label">Goal</span>
      {editing ? (
        <input
          autoFocus
          aria-label="Conversation goal"
          className="conversation-goal-input"
          data-action-id="conversation.goal.edit"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); commit(); }
            if (event.key === "Escape") { setDraft(props.goal); setEditing(false); }
          }}
          placeholder="Pin a goal for this conversation…"
        />
      ) : (
        <button
          type="button"
          className="conversation-goal-button"
          data-action-id="conversation.goal.open"
          title={summary || "Click to set a persistent goal"}
          onClick={() => setEditing(true)}
        >
          {summary || "Pin a goal for this conversation…"}
        </button>
      )}
      {props.turnIndex > 0 ? <span className="conversation-goal-turn">Turn {props.turnIndex + 1}</span> : null}
      {summary ? (
        <button
          type="button"
          className="conversation-goal-clear"
          data-action-id="conversation.goal.clear"
          title="Clear goal"
          onClick={() => {
            props.onChange("");
            setEditing(false);
          }}
        >
          Clear
        </button>
      ) : null}
    </section>
  );
}

function ApprovalBanner(props: {
  events: StudioEvent[];
  onResolve: (callId: string, decision: "approve" | "deny") => Promise<void> | void;
  onSelect?: (event: StudioEvent) => void;
}) {
  const resolved = new Set<string>();
  for (const event of props.events) {
    if (event.type === "approval_resolved" && event.data && typeof event.data === "object" && "callId" in event.data) {
      resolved.add(String((event.data as { callId: unknown }).callId));
    }
  }
  const pending = props.events.filter((event) => {
    if (event.type !== "approval_request") return false;
    const callId = event.data && typeof event.data === "object" && "callId" in event.data ? String((event.data as { callId: unknown }).callId) : "";
    return callId && !resolved.has(callId);
  });
  if (pending.length === 0) return null;
  return (
    <section className="approval-banner" data-approval-banner="inline" aria-label="Pending agent approvals">
      <header className="approval-banner-header">
        <strong>{pending.length} approval{pending.length === 1 ? "" : "s"} requested</strong>
        <span>Agent is waiting on your decision.</span>
      </header>
      <ul className="approval-banner-list">
        {pending.slice(0, 4).map((event) => {
          const data = (event.data && typeof event.data === "object" ? event.data : {}) as Record<string, unknown>;
          const callId = typeof data.callId === "string" ? data.callId : event.id;
          const toolId = typeof data.toolId === "string" ? data.toolId : null;
          return (
            <li key={event.id} className="approval-banner-row">
              <div className="approval-banner-row-body">
                <strong>{toolId ?? "tool"}</strong>
                <span title={event.message}>{event.message}</span>
              </div>
              <div className="approval-banner-row-actions">
                {props.onSelect ? (
                  <button
                    type="button"
                    data-action-id={`approval.inspect.${callId}`}
                    onClick={() => props.onSelect?.(event)}
                  >
                    Inspect
                  </button>
                ) : null}
                <button
                  type="button"
                  className="primary"
                  data-action-id={`approval.approve.${callId}`}
                  onClick={() => void props.onResolve(callId, "approve")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  data-action-id={`approval.deny.${callId}`}
                  onClick={() => void props.onResolve(callId, "deny")}
                >
                  Deny
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HarnessChip(props: {
  kind: "harness" | "access" | "reasoning" | "action" | "status";
  icon: "harness" | "access" | "plan" | "action" | "mode";
  label: string;
  value: string;
  title?: string;
  iconOnly?: boolean;
}) {
  return (
    <span className="harness-chip" data-harness-chip={props.kind} data-icon-only={props.iconOnly ? "true" : undefined} aria-label={`${props.label}: ${props.value}`} title={props.title ?? `${props.label}: ${props.value}`}>
      <StudioControlIcon name={props.icon} />
      {props.iconOnly ? null : <strong>{props.value}</strong>}
    </span>
  );
}

function codexReasoningLabel(reasoning: StudioCodexReasoningEffort): string {
  if (reasoning === "xhigh") return "X-High";
  return reasoning.charAt(0).toUpperCase() + reasoning.slice(1);
}

function codexReasoningDetail(reasoning: StudioCodexReasoningEffort): string {
  if (reasoning === "xhigh") return "Extra High";
  return reasoning.charAt(0).toUpperCase() + reasoning.slice(1);
}

function compactPermissionModePowerLabel(mode: StudioPermissionMode): string {
  if (mode === "plan") return "Plan";
  if (mode === "full_access") return "Auto";
  return "Auto Edit";
}

function compactSessionStatusLabel(status: string): string {
  if (status === "completed") return "Done";
  if (status === "running") return "Run";
  if (status === "queued") return "Queue";
  if (status === "cancelled") return "Stop";
  if (status === "failed") return "Failed";
  if (status === "idle" || status === "standby") return "Ready";
  return status;
}

function compactWorkspaceLabel(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return "workspace";
  const desktopIndex = parts.lastIndexOf("Desktop");
  if (desktopIndex >= 0 && parts[desktopIndex + 1]) return `Desktop / ${parts[desktopIndex + 1]}`;
  return parts.slice(-2).join(" / ");
}

function queueDockStatusLabel(status: SessionSummary["status"]): "Queued" | "Running" | "Done" | "Failed" | "Stopped" {
  if (status === "queued") return "Queued";
  if (status === "running") return "Running";
  if (status === "completed") return "Done";
  if (status === "cancelled") return "Stopped";
  return "Failed";
}

function queueDockStatusGlyph(status: SessionSummary["status"]): string {
  if (status === "queued") return "...";
  if (status === "running") return ">";
  if (status === "completed") return "ok";
  if (status === "cancelled") return "x";
  return "!";
}

function queueDockSessionLabel(session: SessionSummary): string {
  return queueDockPromptLabel(session.prompt || session.action || WORKBENCH_COPY.queue.fallbackPrompt, session.harness);
}

function queueDockPromptLabel(prompt: string, harness?: HarnessId, maxLength = 32): string {
  return compactRunLabel(prompt, harness, maxLength);
}

function queueDockSessionTitle(session: SessionSummary): string {
  const summary = compactRunSummary(session.prompt, session.harness, 96);
  return summary && summary !== queueDockSessionLabel(session) ? `${queueDockSessionLabel(session)} — ${summary}` : queueDockSessionLabel(session);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolveRead, rejectRead) => {
    const reader = new FileReader();
    reader.onload = () => resolveRead(String(reader.result ?? ""));
    reader.onerror = () => rejectRead(reader.error ?? new Error(`Unable to read ${file.name}`));
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolveRead, rejectRead) => {
    const reader = new FileReader();
    reader.onload = () => resolveRead(String(reader.result ?? ""));
    reader.onerror = () => rejectRead(reader.error ?? new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function readBooleanPreference(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw) === true;
  } catch {
    return fallback;
  }
}

function readStringArrayPreference(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function readNumberPreference(key: string, fallback: number, min: number, max: number): number {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw === null ? fallback : Number(JSON.parse(raw));
    return Number.isFinite(parsed) ? clampNumber(parsed, min, max) : fallback;
  } catch {
    return fallback;
  }
}

function permissionModePowerLabel(mode: StudioPermissionMode): string {
  if (mode === "plan") return "Read";
  if (mode === "full_access") return "Full";
  return "Workspace";
}

function permissionModePowerDetail(mode: StudioPermissionMode): string {
  if (mode === "plan") return "Plan — read-only inspect";
  if (mode === "full_access") return "Auto — runs everything without prompts";
  return "Auto Edit — edits workspace without prompting";
}

function isNearScrollBottom(element: HTMLElement, threshold = 96): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
