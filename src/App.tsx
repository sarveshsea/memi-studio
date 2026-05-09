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
  type StudioDownloadJob,
  type StudioWorkArtifact,
} from "./studio-api";
import { deriveStudioTrace, type StudioTraceModel } from "../../../src/studio/view-model";
import {
  CommandBar,
  TerminalBlock as TerminalBlockSurface,
} from "./studio-primitives";
import {
  BlockBody,
  ActivityTimeline,
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
  WorkArtifactCards,
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
import { WORKBENCH_COPY, workbenchAction, type WorkbenchIconName } from "./workbench-copy";

const MermaidBoardSurface = lazy(() => import("./mermaid-board-surface"));
const IASurface = lazy(() => import("./ia-surface"));

const STARTER_PROMPTS = WORKBENCH_COPY.starterPrompts;
const MODE_PRESETS = WORKBENCH_COPY.modePresets;
const ACTIONS: Array<{ id: StudioAction; label: string }> = WORKBENCH_COPY.actions.map((action) => ({ ...action }));
const CHAT_MODES: Array<{ id: StudioChatMode; label: string }> = WORKBENCH_COPY.chatModes.map((mode) => ({ ...mode }));
const PERMISSION_MODES: Array<{ id: StudioPermissionMode; label: string }> = WORKBENCH_COPY.permissionModes.map((mode) => ({ ...mode }));

type RightPaneTab = (typeof WORKBENCH_COPY.rightPaneTabs)[number]["id"] | "mirofish-research";
type ScenarioLabNodeKind = "agent" | "finding" | "variable" | "outcome";
type ComposerPetState = "idle" | "typing" | "ready" | "submitting" | "running" | "queued" | "success" | "error" | "limited";

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

const RIGHT_PANE_TAB_GROUPS = ["primary", "utility"] as const;
const RIGHT_PANE_TABS: Array<{ id: RightPaneTab; label: string; shortLabel?: string; group: typeof RIGHT_PANE_TAB_GROUPS[number]; icon?: WorkbenchIconName; iconOnly?: boolean }> =
  WORKBENCH_COPY.rightPaneTabs.map((tab) => ({ ...tab }));

const SCENARIO_TOOL_IDS = ["harness.study", "research.patterns.extract", "research.patterns.list", "simulation.models", "simulation.run_matrix", "simulation.transcript", "research.design_package", "mermaid_jam.export"] as const;
const CORE_MERMAID_BOARD_TOOL_IDS = ["board.create", "board.add_node", "board.update_node", "board.connect", "board.layout", "board.capture_ia", "board.export_mermaid_jam"] as const;
const PM_MERMAID_BOARD_TOOL_IDS = ["board.apply_template", "board.sync_figjam"] as const;
const MERMAID_BOARD_RUNTIME_UNAVAILABLE = WORKBENCH_COPY.mermaidRuntime.unavailable;
const MERMAID_BOARD_PM_RUNTIME_STALE = WORKBENCH_COPY.mermaidRuntime.pmRuntimeStale;

const PRIMARY_HARNESS_IDS: HarnessId[] = ["claude-code", "codex", "hermes"];
const DEFAULT_PRIMARY_HARNESS_ID: HarnessId = "claude-code";
const LIVE_EVENT_LIMIT = 220;
const SESSION_EVENT_LIMIT = 120;
const TRACE_REFRESH_DELAY_MS = 350;
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

export function App() {
  const scrollRegionRef = useRef<HTMLElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const latestScrollRestoringRef = useRef(false);
  const scrollRetryTimeoutsRef = useRef<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const traceRefreshTimerRef = useRef<number | null>(null);
  const pendingTraceSessionIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [harnesses, setHarnesses] = useState<Harness[]>([]);
  const [selectedHarness, setSelectedHarness] = useState<HarnessId>(DEFAULT_PRIMARY_HARNESS_ID);
  const [harnessPickerOpen, setHarnessPickerOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<StudioAction>("app-build");
  const [chatMode, setChatMode] = useState<StudioChatMode>("ideate");
  const [permissionMode, setPermissionMode] = useState<StudioPermissionMode>("guarded");
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
  const [queuedPrompt, setQueuedPrompt] = useState<string>("");
  const [startingPrompt, setStartingPrompt] = useState<string>("");
  const [harnessModelRegistries, setHarnessModelRegistries] = useState<Record<string, HarnessModelRegistry>>({});
  const [selectedModelByHarness, setSelectedModelByHarness] = useState<Record<string, string>>({});
  const [selectedEffort, setSelectedEffort] = useState<StudioEffort | null>(null);
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [serverTrace, setServerTrace] = useState<StudioTraceSnapshot | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runtimeHealth, setRuntimeHealth] = useState<"offline" | "starting" | "ready" | "degraded">("starting");
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
      if (event.key.toLowerCase() === "h" && event.shiftKey && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setHarnessPickerOpen((open) => !open);
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
              void listDesignSystemArtifacts().then(setDesignArtifacts).catch(() => undefined);
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
  const visibleHarnesses = useMemo(() => primaryHarnesses(harnesses), [harnesses]);

  const harnessActions = useMemo(() => actionsForHarness(currentHarness), [currentHarness]);
  const effectiveAction: StudioAction = resolveHarnessAction(selectedAction, currentHarness);
  const effectiveActionLabel = harnessActions.find((action) => action.id === effectiveAction)?.label ?? effectiveAction;
  const activeModePreset = MODE_PRESETS.find((preset) =>
    preset.action === selectedAction && preset.chatMode === chatMode && preset.permissionMode === permissionMode,
  )?.id ?? null;
  const sessionStatus = deriveSessionStatus(session, events);
  const visibleSessionStatus = isStartingSession ? "starting" : sessionStatus;
  const isSessionActive = isStartingSession || sessionStatus === "running" || sessionStatus === "queued";
  const harnessStatusCopy = harnessReadinessLabel(currentHarness);
  const effectiveRuntimeMetrics = status?.metrics ?? runtimeMetrics;
  const canRunSession = Boolean(runtimeHealth === "ready" && status && prompt.trim() && !isStartingSession && harnessCanRun(currentHarness, effectiveAction));
  const canContinueConversation = Boolean(activeConversationId && session && (session.status === "completed" || session.status === "interrupted") && (session.conversationId ?? session.id) === activeConversationId);
  const isResumingInterrupted = Boolean(session?.status === "interrupted");
  const activeModelRegistry = harnessModelRegistries[selectedHarness] ?? null;
  const activeModelId = selectedModelByHarness[selectedHarness] ?? activeModelRegistry?.defaultModelId ?? null;
  const effortOptions = effortOptionsForRegistry(activeModelRegistry, activeModelId);
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
  const activeDesignArtifact = useMemo(() => {
    const traceArtifacts = (traceModel.artifacts ?? []) as DesignSystemArtifact[];
    const merged = [...designArtifacts, ...traceArtifacts];
    return merged.find((artifact) => artifact.id === selectedArtifactId)
      ?? traceArtifacts[0]
      ?? designArtifacts[0]
      ?? null;
  }, [designArtifacts, selectedArtifactId, traceModel.artifacts]);
  const activeReviewPacket = useMemo(() => {
    return reviewPackets.find((packet) => packet.sessionId && packet.sessionId === session?.id)
      ?? reviewPackets[0]
      ?? null;
  }, [reviewPackets, session?.id]);
  const lastFailure = useMemo(() => findLatestFailureEvent(events), [events]);
  const composerPet = composerPetState({
    prompt,
    canRunSession,
    isStartingSession,
    isSessionActive,
    queuedPrompt,
    visibleSessionStatus,
    lastFailure,
    usageWarning,
    errorMessage: error,
  });
  const latestRun = session ?? recentSessions[0] ?? null;
  const workspaceLabel = compactWorkspaceLabel(status?.projectRoot ?? workspacePermissions?.currentWorkspace ?? "");
  const visibleRecentSessions = recentSessions.length ? recentSessions : session ? [session] : [];
  const sessionInventory = session && !visibleRecentSessions.some((recent) => recent.id === session.id)
    ? [session, ...visibleRecentSessions]
    : visibleRecentSessions;
  const localRunningSessionCount = sessionInventory.filter((recent) => recent.status === "running" || recent.status === "queued").length + (isStartingSession ? 1 : 0);
  const runtimeRunningSessionCount = (effectiveRuntimeMetrics?.activeRuns ?? 0) + (effectiveRuntimeMetrics?.queuedRuns ?? 0);
  const runningSessionCount = Math.max(localRunningSessionCount, runtimeRunningSessionCount);
  const runtimeQueueDockItems = queueDockItemsFromRuntime(effectiveRuntimeMetrics, runtimeHealth);
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
  const mermaidBoardCoreRuntimeReady = Boolean(status?.projectRoot && hasCoreMermaidBoardToolContract(studioTools));
  const mermaidBoardPmRuntimeReady = mermaidBoardCoreRuntimeReady && hasPmMermaidBoardToolContract(studioTools);
  const mermaidBoardRecovery = useMemo(
    () => mermaidBoardRuntimeRecovery(status, mermaidBoardCoreRuntimeReady, mermaidBoardPmRuntimeReady, canRestartStudioRuntime(), mermaidBoardError),
    [mermaidBoardCoreRuntimeReady, mermaidBoardError, mermaidBoardPmRuntimeReady, status],
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
    ?? latestRunningActivity?.summary
    ?? latestThinkingActivity?.summary
    ?? latestActivity?.summary
    ?? compactSessionStatusLabel(visibleSessionStatus);
  const runPanelTitle = latestRun
    ? trimText(latestRun.prompt, 72)
    : prompt.trim()
      ? trimText(prompt.trim(), 72)
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
        nextStatus.harnesses ? Promise.resolve(nextStatus.harnesses) : listHarnesses(),
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
      setStatus(nextStatus);
      setRuntimeMetrics(nextRuntimeMetrics);
      setRuntimeHealth(nextStatus.status === "running" ? "ready" : "degraded");
      setRuntimeRecoveryMessage(null);
      setHarnesses(nextHarnesses);
      setSettingsDraft(nextStatus.config);
      setSelectedHarness(normalizePrimaryHarness(nextStatus.config.defaultHarness, nextHarnesses));
      setInputMode(nextStatus.config.ui?.inputMode ?? "agent");
      if (!session && nextStatus.config.codex?.planModeDefault) setPermissionMode("plan");
      setProjectMemory(nextMemory);
      setKnowledgeIndex(nextKnowledge);
      setFigmaStatus(nextFigma);
      setRecentSessions(nextSessions);
      setCompatibility(nextCompatibility);
      setComputerStatus(nextComputer);
      setDesignTrace(nextDesignTrace);
      setDesignArtifacts(nextArtifacts);
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
      if (!selectedArtifactId && nextArtifacts[0]) setSelectedArtifactId(nextArtifacts[0].id);
      if (!session && nextSessions[0]) {
        await openSessionSummary(nextSessions[0]);
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

  async function openSessionSummary(nextSession: SessionSummary) {
    setSession(nextSession);
    setServerTrace(null);
    setCollapsedBlockIds(new Set());
    setSelectedAction((nextSession.action as StudioAction | undefined) ?? "raw");
    setSelectedHarness(normalizePrimaryHarness(nextSession.harness, harnesses));
    setChatMode(nextSession.chatMode ?? "ideate");
    setPermissionMode(nextSession.permissionMode ?? "guarded");
    setActiveConversationId(nextSession.conversationId ?? nextSession.id);
    setConversationGoal(nextSession.goal ?? "");
    if (nextSession.status === "interrupted") {
      setPrompt(nextSession.prompt ?? "");
    }
    try {
      const [eventPayload, tracePayload] = await Promise.all([
        getSessionEvents(nextSession.id, SESSION_EVENT_LIMIT),
        getSessionTrace(nextSession.id),
      ]);
      setEvents(eventPayload.events);
      setServerTrace(tracePayload.trace);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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

  function copyWorkArtifact(artifact: StudioWorkArtifact) {
    void copyText(`${artifact.title}\n\n${artifact.body || artifact.summary}`);
  }

  function useWorkArtifactAsContext(artifact: StudioWorkArtifact) {
    setPrompt((current) => `${current.trim()}\n\n${WORKBENCH_COPY.artifactPrompts.context(artifact.title, artifact.body || artifact.summary)}`.trim());
  }

  function addWorkArtifactToChangelog(artifact: StudioWorkArtifact) {
    openChangelogSurface();
    setPrompt((current) => `${current.trim()}\n\n${WORKBENCH_COPY.artifactPrompts.changelog(artifact.title, artifact.body || artifact.summary)}`.trim());
  }

  function sendWorkArtifactToBoard(artifact: StudioWorkArtifact) {
    chooseRightPane("mermaid-board", "Work artifact sent to PM Board");
    handleUseMermaidBoardAgentPrompt(WORKBENCH_COPY.artifactPrompts.board(artifact.title, artifact.body || artifact.summary));
  }

  function sendWorkArtifactToFigma(artifact: StudioWorkArtifact) {
    openFigmaSurface();
    setPrompt((current) => `${current.trim()}\n\n${WORKBENCH_COPY.artifactPrompts.figma(artifact.title, artifact.body || artifact.summary)}`.trim());
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

  function openPluginsSurface() {
    openSettingsPanel("Plugins");
    void refreshMarketplaceNotes();
  }

  function openFigmaSurface() {
    chooseRightPane("figma", "Figma bridge opened");
    void getFigmaStatus().then(setFigmaStatus).catch(() => undefined);
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
    setPrompt(starter.template);
    setSelectedAction(starter.action);
    setChatMode(starter.chatMode);
    setPermissionMode(starter.permissionMode);
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
    const nextId = normalizePrimaryHarness(id, harnesses);
    const nextHarness = harnesses.find((harness) => harness.id === nextId);
    setSelectedHarness(nextId);
    setSettingsDraft((current) => current ? { ...current, defaultHarness: nextId } : current);
    setSelectedAction((current) => resolveHarnessAction(current, nextHarness));
  }

  async function saveSettings() {
    if (!settingsDraft) return;
    try {
      const saved = await saveConfig(settingsDraft);
      setSettingsDraft(saved);
      setSelectedHarness(saved.defaultHarness);
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
    try {
      const result = await callComputerAction({ action: "captureScreen" });
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
    if (runtimeHealth !== "ready" || !status || !prompt.trim() || !harnessCanRun(currentHarness, effectiveAction)) return;
    const submittedPrompt = prompt.trim();
    if (isSessionActive) {
      setQueuedPrompt(submittedPrompt);
      setPrompt("");
      return;
    }
    setPrompt("");
    await runWithPrompt(submittedPrompt, { restorePromptOnFailure: true });
  }

  async function runWithPrompt(text: string, options: { conversationIdOverride?: string | null; restorePromptOnFailure?: boolean } = {}) {
    if (!status || !text.trim() || !harnessCanRun(currentHarness, effectiveAction)) return;
    setEvents([]);
    setServerTrace(null);
    setError(null);
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
        action: effectiveAction,
        cwd: status.projectRoot,
        prompt: text,
        chatMode,
        permissionMode,
        attachments,
        ...(continuingConversationId ? { conversationId: continuingConversationId } : {}),
        ...(conversationGoal.trim() ? { goal: conversationGoal.trim() } : {}),
        ...(activeModelId ? { model: activeModelId } : {}),
        ...(selectedEffort && effortOptions.includes(selectedEffort) ? { effort: selectedEffort } : {}),
      });
      setAttachments([]);
      setSession(nextSession);
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
      `Artifacts: ${(traceModel.artifacts?.length ?? 0) + designArtifacts.length}`,
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

  async function studyHermesResearchHarness() {
    if (!status?.projectRoot) return;
    setScenarioRunning(true);
    setError(null);
    try {
      const studyCall = await callStudioTool({
        toolId: "harness.study",
        cwd: status.projectRoot,
        input: { harnessId: "hermes" },
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
      if (!nextStatus.projectRoot || !hasCoreMermaidBoardToolContract(nextTools)) {
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
      const projectRoot = await ensureMermaidBoardRuntimeReady({ requirePm: true });
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
      const projectRoot = await ensureMermaidBoardRuntimeReady({ requirePm: true });
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
      const projectRoot = await ensureMermaidBoardRuntimeReady({ requirePm: true });
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
    const hasHermesProfile = scenarioModels.some((profile) => profile.provider === "hermes");
    const edges = [
      ["agent-pm", "finding-risk"],
      ["agent-research", "finding-risk"],
      ["model-codex", "agent-pm"],
      ...(hasHermesProfile ? [["model-hermes", "agent-research"] as [string, string]] : []),
      ["variable", "finding-risk"],
      ["finding-risk", "outcome"],
    ] as Array<[string, string]>;
    const nodes = layoutScenarioLabGraph([
      { id: "agent-pm", label: "PM", kind: "agent" },
      { id: "agent-research", label: "Research", kind: "agent" },
      { id: "model-codex", label: "Codex", kind: "agent" },
      ...(hasHermesProfile ? [{ id: "model-hermes", label: "Hermes", kind: "agent" } as ScenarioLabNode] : []),
      { id: "finding-risk", label: "Risk", kind: "finding" },
      { id: "variable", label: scenarioVariable, kind: "variable" },
      { id: "outcome", label: winnerRunId ? "Winner" : "Spec", kind: "outcome" },
    ], edges);
    const selected = nodes.find((node) => node.id === selectedScenarioNode) ?? nodes[0];
    const timeline = latestMatrixRun?.rounds?.length
      ? latestMatrixRun.rounds.map((_, index) => ({ label: `Round ${index + 1}`, text: `${latestMatrixRun.transcripts?.length ?? 0} transcript turns captured.` }))
      : WORKBENCH_COPY.scenario.timelineFallback.map((item) => ({
        label: item.label,
        text: item.label === WORKBENCH_COPY.queue.fallbackPrompt ? scenarioVariable.toLowerCase() : item.text,
      }));
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
            <button type="button" data-action-id="research-lab.harness-study" onClick={() => void studyHermesResearchHarness()} disabled={scenarioRunning || !status?.projectRoot}>
              Hermes
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
          <article data-harness-study="hermes">
            <span>Harness Study</span>
            <strong>{harnessStudy ? `${harnessStudy.label} ${harnessStudy.available ? "ready" : "offline"}` : "Hermes pending"}</strong>
            <small>{harnessStudy?.model ?? "Study Hermes CLI, skills, tools, profiles, sessions"}</small>
            <div>
              {(harnessStudy?.toolsets?.enabled ?? ["skills", "web", "terminal"]).slice(0, 4).map((toolset) => (
                <em key={toolset}>{toolset}</em>
              ))}
            </div>
          </article>
          <article data-pm-pattern-library>
            <span>PM Pattern Library</span>
            <strong>{researchPatterns.length ? `${researchPatterns.length} patterns` : "No patterns"}</strong>
            {(researchPatterns.length ? researchPatterns : [{ id: "pattern-empty", title: "Extract", category: "harness", sourceHarness: "hermes", summary: "Study Hermes to extract PM workflow patterns.", confidence: "medium" }]).slice(0, 3).map((pattern) => (
              <small key={pattern.id} title={pattern.summary}>{pattern.category}: {trimText(pattern.title, 42)}</small>
            ))}
          </article>
          <article data-research-evidence-source={researchSource}>
            <span>Evidence Intake</span>
            <strong>{researchSource.replace(/-/g, " ")}</strong>
            <small>{researchSources.length ? `${researchSources.length} sources` : "Sync or capture agent evidence"}</small>
          </article>
          <article data-scenario-compare-view="hypothesis-matrix-summary">
            <span>Hypothesis Matrix</span>
            <strong>{scenarioMatrix?.runs?.length ? `${scenarioMatrix.runs.length} runs` : "Ready"}</strong>
            <small>{scenarioMatrix?.comparison?.winnerRunId ?? "Run model-swarm comparisons"}</small>
          </article>
        </div>
        <div className="scenario-model-matrix" data-scenario-model-matrix="codex-first">
          {(scenarioModels.length ? scenarioModels : [
            { id: "codex-gpt-5-5", label: "Codex GPT-5.5", provider: "codex", model: "gpt-5.5", available: false },
            { id: "hermes-harness", label: "Hermes Harness", provider: "hermes", model: "default-profile", available: false },
            { id: "claude-code-sonnet", label: "Claude Code", provider: "claude-code", model: "sonnet", available: false },
            { id: "deterministic-product-simulator", label: "Fallback", provider: "deterministic", model: "memoire", available: true },
          ]).slice(0, 5).map((profile) => (
            <article key={profile.id}>
              <span>{profile.provider}</span>
              <strong>{profile.label}</strong>
              <small>{profile.available ? "ready" : "fallback"} / {profile.model}</small>
            </article>
          ))}
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
            {timeline.map((item, index) => (
              <article key={`${item.label}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
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
              <strong>{scorecard ? `${Math.round((scorecard.confidence ?? 0) * 100)}% confidence` : "Recommendations"}</strong>
            </div>
            <ul>
              <li>Finding id</li>
              <li>Outcome metric</li>
              <li>Open assumptions</li>
            </ul>
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
            <section className="run-goal-banner" data-run-goal-banner="agent-objective" aria-label="Run goal">
              <span>{currentHarness?.label ?? selectedHarness} · {effectiveActionLabel} · {compactSessionStatusLabel(visibleSessionStatus)}</span>
            </section>
          </div>
          <div className="inline-actions">
            <IconButton actionId="right-pane.tab.run" ariaLabel="Run pane" title="Run" icon="details" onClick={() => chooseRightPane("run", "Run pane opened")} />
            <IconButton {...workbenchAction("refresh")} actionId="memory.refresh" onClick={refresh} />
          </div>
        </header>

        <section className="console-run-info" data-codex-power-strip="sandbox" data-harness-readiness-contract="status-rail" aria-label="Harness run configuration">
          <HarnessChip
            kind="harness"
            icon="harness"
            label="Harness"
            value={currentHarness?.label ?? selectedHarness}
            title={currentHarness?.authMessage ?? harnessStatusCopy}
          />
          <HarnessChip
            kind="access"
            icon="access"
            label="Access"
            value={compactPermissionModePowerLabel(permissionMode)}
            title={permissionModePowerDetail(permissionMode)}
          />
          <HarnessChip
            kind="reasoning"
            icon="plan"
            label="Reasoning"
            value={codexReasoningLabel(settingsDraft?.codex?.reasoningEffort ?? "xhigh")}
            title={`Codex reasoning: ${codexReasoningDetail(settingsDraft?.codex?.reasoningEffort ?? "xhigh")}`}
          />
          <HarnessChip
            kind="action"
            icon="action"
            label="Action"
            value={effectiveActionLabel}
          />
          <HarnessChip
            kind="status"
            icon="mode"
            label="Status"
            value={compactSessionStatusLabel(visibleSessionStatus)}
          />
        </section>

        {runtimeHealth !== "ready" ? (
          <RuntimeRecoveryStrip
            health={runtimeHealth}
            message={runtimeRecoveryMessage}
            canRestart={canRestartStudioRuntime()}
            onRetry={refresh}
            onRestart={() => void handleRestartStudioRuntime()}
            onOpenSettings={() => openSettingsPanel()}
          />
        ) : null}

        <ConversationGoalRow
          goal={conversationGoal}
          turnIndex={conversationTurnCount}
          onChange={setConversationGoal}
        />
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
        <ChangedFilesPanel trace={designTrace} onReview={() => chooseRightPane("changes", "Changed files review")} />

        <CreationStrip
          session={session}
          sessionStatus={visibleSessionStatus}
          action={effectiveAction}
          traceModel={traceModel}
          events={events}
          terminalBlocks={terminalBlocks}
          artifacts={[...designArtifacts, ...((traceModel.artifacts ?? []) as DesignSystemArtifact[])]}
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
          onOpenPacket={() => void openActiveReviewPacket()}
        />
        <ApprovalBanner events={events} onResolve={handleResolveApproval} />

        <section
          className="conversation-scroll-region"
          data-auto-scroll-state={userPinnedToBottom ? "pinned" : "paused"}
          data-agent-thinking-state={agentThinkingState}
          data-conversation-scroll="activity-output"
          aria-label="Conversation activity and output"
          onScroll={handleConversationScroll}
          ref={scrollRegionRef}
        >
          <WorkArtifactCards
            events={events}
            packet={activeReviewPacket}
            onAddToChangelog={addWorkArtifactToChangelog}
            onCopy={copyWorkArtifact}
            onOpenPacket={() => void openActiveReviewPacket()}
            onSendToBoard={sendWorkArtifactToBoard}
            onSendToFigma={sendWorkArtifactToFigma}
            onUseAsContext={useWorkArtifactAsContext}
          />

          <ActivityTimeline
            activities={traceModel.activities}
            activeProcesses={traceModel.activeProcesses}
            agentThinkingState={agentThinkingState}
            onStart={() => void run()}
          />

          <section
            className="block-feed"
            data-block-feed="terminal-blocks"
            data-output-renderer="inline"
            data-message-feed="chat-output"
            aria-label="Conversation output"
          >
            {visibleTerminalBlocks.map((block) => (
              <TerminalBlockSurface kind={block.kind} key={block.id}>
                <header>
                  <div>
                    <span>{block.title}</span>
                    <small>{block.meta}</small>
                  </div>
                  <div className="blockActions">
                    {block.timestamp ? <time dateTime={block.timestamp}>{formatTime(block.timestamp)}</time> : null}
                    <IconButton {...workbenchAction("copy")} actionId={`block.copy.${block.id}`} ariaLabel={`Copy ${block.title}`} onClick={() => void copyText(block.messages.join(""))} />
                    <IconButton {...workbenchAction("context")} actionId={`block.context.${block.id}`} ariaLabel={`Use ${block.title} as context`} onClick={() => attachBlock(block)} />
                    <IconButton
                      {...workbenchAction(collapsedBlockIds.has(block.id) ? "expand" : "collapse")}
                      actionId={`block.toggle.${block.id}`}
                      ariaLabel={collapsedBlockIds.has(block.id) ? `Expand ${block.title}` : `Collapse ${block.title}`}
                      onClick={() => toggleBlock(block.id)}
                    />
                  </div>
                </header>
                {!collapsedBlockIds.has(block.id) ? <BlockBody block={block} /> : null}
              </TerminalBlockSurface>
            ))}

            {terminalBlocks.length > 0 && visibleTerminalBlocks.length === 0 ? (
              <div className="empty-state compact-empty-state" data-smart-empty-state="output-filter">
                <button data-action-id="conversation.search.clear" type="button" onClick={() => setChatSearchQuery("")}>Clear</button>
              </div>
            ) : null}
            <div aria-hidden="true" data-latest-anchor ref={bottomAnchorRef} />
          </section>
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
              <small>{trimText(startingPrompt || prompt.trim() || WORKBENCH_COPY.queue.fallbackPrompt, 32)}</small>
            </button>
          ) : null}
          {sessionInventory.slice(0, isStartingSession ? 4 : 5).map((recent) => (
            <button
              className="agent-queue-chip"
              data-agent-queue-chip
              data-status={queueDockStatusLabel(recent.status).toLowerCase()}
              data-action-id={`queue.open.${recent.id}`}
              key={recent.id}
              title={recent.prompt}
              type="button"
              onClick={() => void openSessionSummary(recent)}
            >
              <span aria-hidden="true">{queueDockStatusGlyph(recent.status)}</span>
              <small>{trimText(recent.prompt || recent.action || WORKBENCH_COPY.queue.fallbackPrompt, 32)}</small>
            </button>
          ))}
          {!isStartingSession && sessionInventory.length === 0 ? (
            <IconButton
              {...workbenchAction("newRun")}
              actionId={workbenchAction("newRun").id}
              className="agent-queue-chip empty"
              data={{ "data-agent-queue-chip": true, "data-smart-empty-state": "sessions-new" }}
              onClick={startNewChat}
            />
          ) : null}
        </div>

        <CommandBar data-command-editor="bottom-pinned" data-composer-layout="single-toolbar">
          <ComposerPet state={composerPet} />
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
                {STARTER_PROMPTS.map((starter, index) => (
                  <ActionChip
                    action={{ id: `starter.prompt.${index}`, label: starter.label, shortLabel: starter.shortLabel, ariaLabel: starter.label, title: starter.template, icon: starter.icon }}
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
            <div className="composer-controls" data-composer-controls="readable">
              <label className="icon-button attachment-button" data-action-id="attachment.add" title="Attach context">
                <StudioControlIcon name="attach" />
                <input ref={fileInputRef} type="file" multiple onChange={handleAttachmentPick} />
              </label>
              <label className="composer-select" data-composer-control="mode" title="Mode">
                <StudioControlIcon name="mode" />
                <span className="composer-control-text">{CHAT_MODES.find((mode) => mode.id === chatMode)?.label ?? chatMode}</span>
                <select aria-label="Mode" data-action-id="chat-mode.select" value={chatMode} onChange={(event) => setChatMode(event.target.value as StudioChatMode)}>
                  {CHAT_MODES.map((mode) => (
                    <option key={mode.id} value={mode.id}>{mode.label}</option>
                  ))}
                </select>
              </label>
              <label className="composer-select" data-composer-control="access" title={permissionModePowerDetail(permissionMode)}>
                <StudioControlIcon name="access" />
                <span className="composer-control-text">{PERMISSION_MODES.find((mode) => mode.id === permissionMode)?.label ?? permissionMode}</span>
                <select aria-label="Permission" data-action-id="permission-mode.select" value={permissionMode} onChange={(event) => setPermissionMode(event.target.value as StudioPermissionMode)}>
                  {PERMISSION_MODES.map((mode) => (
                    <option key={mode.id} value={mode.id}>{mode.label}</option>
                  ))}
                </select>
              </label>
              <label className="composer-select" data-composer-control="harness" title="Harness">
                <StudioControlIcon name="harness" />
                <span className="composer-control-text">{currentHarness?.label ?? selectedHarness}</span>
                <select aria-label="Harness" data-action-id="harness.select" value={selectedHarness} onChange={(event) => chooseHarness(event.target.value as HarnessId)}>
                  {visibleHarnesses.map((harness) => (
                    <option key={harness.id} value={harness.id} disabled={!harness.enabled}>
                      {harness.label}{harness.installed ? "" : " (missing)"}
                    </option>
                  ))}
                </select>
              </label>
              {showModelPicker ? (
                <label className="composer-select" data-composer-control="model" title="Model">
                  <StudioControlIcon name="harness" />
                  <span className="composer-control-text">{activeModelRegistry?.models.find((m) => m.id === activeModelId)?.label ?? activeModelId ?? "Default"}</span>
                  <select
                    aria-label="Model"
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
                <label className="composer-select" data-composer-control="effort" title="Reasoning effort">
                  <StudioControlIcon name="plan" />
                  <span className="composer-control-text">{selectedEffort ? selectedEffort[0].toUpperCase() + selectedEffort.slice(1) : "Default"}</span>
                  <select
                    aria-label="Effort"
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
              <label className="composer-select" data-composer-control="action" title="Action">
                <StudioControlIcon name="action" />
                <span className="composer-control-text">{harnessActions.find((action) => action.id === effectiveAction)?.label ?? effectiveAction}</span>
                <select
                  aria-label="Action"
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
                  : runDisabledReason(currentHarness, harnessStatusCopy, prompt, runtimeHealth)}
              >
                {isStartingSession ? <span aria-hidden="true">...</span> : isResumingInterrupted ? <span aria-hidden="true">Resume</span> : canContinueConversation ? <span aria-hidden="true">Continue</span> : null}
              </IconButton>
            </div>
          </div>
          <div className="workspace-status-row" data-workspace-status="local-branch">
            <span title={status?.projectRoot}>{workspaceLabel}</span>
            <span>{currentHarness?.label ?? selectedHarness}</span>
            <span title={currentHarness?.authMessage ?? harnessStatusCopy}>{harnessStatusCopy}</span>
            <button data-workspace-action="new-folder" type="button" onClick={() => void handleCreateWorkspace()}>New folder</button>
            <button data-workspace-action="open-folder" type="button" onClick={() => void handleOpenWorkspace()}>Open folder</button>
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
      <section className="agent-cockpit-pane" data-agent-cockpit="run" data-pane-intent-surface="run">
        <section className="harness-detail-grid" data-harness-readiness="cockpit">
          <article>
            <span>Harness</span>
            <strong>{currentHarness?.label ?? selectedHarness}</strong>
            <small>{currentHarness?.installed ? currentHarness.authStatus : "missing"}</small>
          </article>
          <article>
            <span>Runtime</span>
            <strong>{status?.status ?? "offline"}</strong>
            <small>{status?.projectRoot ?? "offline"}</small>
          </article>
          <article>
            <span>Active run</span>
            <strong>{visibleSessionStatus}</strong>
            <small>{session?.id ?? "none"}</small>
          </article>
          <article>
            <span>Last failure</span>
            <strong>{lastFailure ? formatEventName(lastFailure.type) : "clean"}</strong>
            <small>{lastFailure ? trimText(lastFailure.message, 80) : "clean"}</small>
          </article>
        </section>

        <section className="cockpit-card" data-recent-runs>
          <div className="drawer-section-head">
            <span>Recent sessions</span>
            <small>{visibleRecentSessions.length}</small>
          </div>
          <div className="recent-session-list">
            {visibleRecentSessions.slice(0, 6).map((recent) => (
              <button data-action-id={`session.open.${recent.id}`} key={recent.id} type="button" onClick={() => void openSessionSummary(recent)}>
                <span>{trimText(recent.prompt, 48)}</span>
                <small>{recent.harness} / {recent.status}</small>
              </button>
            ))}
            {visibleRecentSessions.length === 0 ? <span className="empty">No sessions</span> : null}
          </div>
        </section>

        <section className="cockpit-card usage-limits-card" data-usage-limits="run-cockpit" data-usage-limits-card="run-pane">
          <div className="drawer-section-head">
            <span>Usage and limits</span>
            <small>{usageSnapshot ? formatTime(usageSnapshot.generatedAt) : "--"}</small>
            <IconButton
              {...workbenchAction("usageLimits")}
              actionId={workbenchAction("usageLimits").id}
              disabled={usageLoading}
              onClick={() => void openUsageLimits()}
            />
          </div>
          <div className="usage-totals-grid">
            <article>
              <span>Total</span>
              <strong>{usageSnapshot ? formatTokenCount(usageSnapshot.totals.totalTokens) : "--"}</strong>
            </article>
            <article>
              <span>In / out</span>
              <strong>{usageSnapshot ? `${formatTokenCount(usageSnapshot.totals.inputTokens)} / ${formatTokenCount(usageSnapshot.totals.outputTokens)}` : "--"}</strong>
            </article>
            <article>
              <span>Cost</span>
              <strong>{usageSnapshot ? formatCostEstimate(usageSnapshot.totals.estimatedCostUsd) : "--"}</strong>
            </article>
          </div>
          <div className="usage-limit-list">
            {usageLoading ? <span className="empty">Refreshing usage...</span> : null}
            {usageLimitRows(usageSnapshot).map((limit) => (
              <article className={limit.status} key={limit.id}>
                <strong>{limit.label}</strong>
                <span>{limit.message}</span>
              </article>
            ))}
            {!usageLoading && usageLimitRows(usageSnapshot).length === 0 ? <span className="empty">No observed limits. Local budgets are warning-only.</span> : null}
          </div>
        </section>

        <section className="cockpit-card" data-agent-cockpit-card="activity-trace">
          <div className="drawer-section-head">
            <span>Activity trace</span>
            <button data-action-id="runtime.refresh" type="button" onClick={refresh}>Refresh</button>
          </div>
          <ActivityTimeline
            activities={traceModel.activities}
            activeProcesses={traceModel.activeProcesses}
            agentThinkingState={agentThinkingState}
            onCopyPath={(path) => void copyText(path)}
            onStart={() => void run()}
          />
        </section>
      </section>
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
          onViewExamples={() => window.open("https://github.com/sarveshsea/memoire#examples", "_blank")}
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
          onUseSystem={useDesignSystemArtifact}
        />
      );
    }
    if (rightPaneTab === "ia") return renderIAPane();
    if (rightPaneTab === "research-lab" || rightPaneTab === "mirofish-research") return renderScenarioLab();
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
          </div>
          <div className="harness-readiness-row" data-harness-readiness="compact" data-harness-readiness-contract="compact" data-topbar-tags="left-compact" aria-label="Runtime and harness status">
            <span><i className="status-dot" /> Runtime {runtimeHealthLabel(runtimeHealth)}</span>
            <TopbarHarnessChip
              harnesses={harnesses}
              currentHarness={currentHarness}
              selectedHarness={selectedHarness}
              statusCopy={harnessStatusCopy}
              isOpen={harnessPickerOpen}
              onOpenChange={setHarnessPickerOpen}
              onSelect={(id) => { chooseHarness(id); setHarnessPickerOpen(false); }}
              onDiagnose={(id) => { void handleDiagnoseHarness(id); }}
            />
            <span>Run {compactSessionStatusLabel(visibleSessionStatus)}</span>
            <span title={lastFailure?.message ?? "Clean"}>{lastFailure ? "Failure" : "Clean"}</span>
          </div>
          <div className="topbar-actions" data-topbar-actions="right-aligned">
            <button className="topbar-icon-button" aria-label="Command" title="Command" data-action-id="command-palette.open" type="button" onClick={() => openCommandPalette()}>
              <StudioControlIcon name="command" />
            </button>
            <div className="theme-toggle" data-theme-toggle aria-label="Theme">
              <button
                aria-label="Light mode"
                aria-pressed={themeMode === "light"}
                className={themeMode === "light" ? "active" : ""}
                data-action-id="theme.light"
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
            <section className="agent-workbench-shell" data-agent-workbench="design-system">
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
                        {RIGHT_PANE_TABS.filter((tab) => tab.group === group).map((tab) => (
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
                  {paneIntent ? (
                    <div className="agent-pane-intent" data-agent-pane-intent="suggested-switch">
                      <span>Agent Cockpit</span>
                      <strong>{RIGHT_PANE_TABS.find((tab) => tab.id === paneIntent.tab)?.label ?? paneIntent.tab}</strong>
                      <small>{paneIntent.reason} · {Math.round(paneIntent.confidence * 100)}%</small>
                    </div>
                  ) : null}
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
        harnesses={visibleHarnesses}
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
    return { tab: "research-lab", reason: "Simulation action selected", confidence: 0.9 };
  }
  if (action === "research") {
    return { tab: "research-lab", reason: "Research action selected", confidence: 0.84 };
  }
  if (action === "self-design" || action === "design-doc") {
    return { tab: "work-packet", reason: "Design action selected", confidence: 0.82 };
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
  if (/\b(information architecture|ia\b|sitemap|navigation|journey|user flow|screen map|sequenceDiagram)\b/i.test(text)) {
    return { tab: "ia", reason: "IA-ready artifact received", confidence: 0.88, sourceEventId: event.id };
  }
  if (type.startsWith("board_") || type.startsWith("board.") || type.includes("mermaid")) {
    return { tab: "mermaid-board", reason: "Board update received", confidence: 0.9, sourceEventId: event.id };
  }
  if (type.startsWith("simulation_") || type.includes("simulation")) {
    return { tab: "research-lab", reason: "Simulation event received", confidence: 0.88, sourceEventId: event.id };
  }
  if (type.startsWith("research_") || type.includes("research")) {
    return { tab: "research-lab", reason: "Research event received", confidence: 0.82, sourceEventId: event.id };
  }
  if (type.startsWith("figma_") || type.includes("figma")) {
    return { tab: "figma", reason: "Figma bridge event received", confidence: 0.86, sourceEventId: event.id };
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

async function waitForMermaidBoardRuntimeTools(): Promise<{ status: StudioStatus; tools: StudioToolDefinition[] }> {
  for (let attempt = 0; attempt < 14; attempt += 1) {
    try {
      const [nextStatus, nextTools] = await Promise.all([getStatus(), listStudioTools()]);
      if (nextStatus.projectRoot && hasCoreMermaidBoardToolContract(nextTools)) {
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

function mermaidBoardRuntimeRecovery(
  status: StudioStatus | null,
  coreRuntimeReady: boolean,
  pmRuntimeReady: boolean,
  canRestart: boolean,
  boardError?: string | null,
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
      title: "Runtime update required",
      actionLabel: canRestart ? "Restart Studio runtime" : "Runtime update required",
      message: canRestart
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

function normalizeRightPaneTab(tab: RightPaneTab): Exclude<RightPaneTab, "mirofish-research"> {
  return tab === "mirofish-research" ? "research-lab" : tab;
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

function composerPetState(input: {
  prompt: string;
  canRunSession: boolean;
  isStartingSession: boolean;
  isSessionActive: boolean;
  queuedPrompt: string;
  visibleSessionStatus: string;
  lastFailure: StudioEvent | null;
  usageWarning: UsageLimitState | null;
  errorMessage: string | null;
}): ComposerPetState {
  if (input.lastFailure || input.errorMessage) return "error";
  if (input.usageWarning && input.usageWarning.status !== "ok") return "limited";
  if (input.isStartingSession) return "submitting";
  if (input.queuedPrompt.trim()) return "queued";
  if (input.isSessionActive) return "running";
  if (input.prompt.trim()) return input.canRunSession ? "ready" : "typing";
  if (input.visibleSessionStatus === "completed") return "success";
  return "idle";
}

const COMPOSER_PET_FRAMES: Record<ComposerPetState, [string, string, string]> = {
  idle: ["(・ω・)", "(・ᴗ・)", "(・ω・)"],
  typing: ["(・o・)", "(・O・)", "(・o・)"],
  ready: ["(・v・)", "(・ᴗ・)", "(・v・)"],
  submitting: ["(・-・)", "(・o・)", "(・-・)"],
  running: ["(ง・ω・)ง", "(ง・ᴗ・)ง", "(ง・ω・)ง"],
  queued: ["(・…・)", "(・-・)", "(・…・)"],
  success: ["(・ᴗ・)ノ", "(・▽・)ノ", "(・ᴗ・)ノ"],
  error: ["(・!・)", "(；︵；)", "(・!・)"],
  limited: ["(・_・)", "(・o・)!", "(・_・)"],
};

function ComposerPet({ state }: { state: ComposerPetState }) {
  const frames = COMPOSER_PET_FRAMES[state];
  return (
    <div className="composer-pet-strip" data-composer-pet="kaomoji-sprite" data-composer-pet-state={state} aria-hidden="true">
      <span className="composer-pet-track" aria-hidden="true">
        {frames.map((glyph, index) => (
          <span className="composer-pet-sprite" data-composer-pet-glyph={index} key={`${state}-${index}`}>{glyph}</span>
        ))}
      </span>
    </div>
  );
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
  health: "offline" | "starting" | "ready" | "degraded";
  message: string | null;
  canRestart: boolean;
  onRetry: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <section
      className="runtime-recovery-strip"
      data-runtime-recovery={props.health}
      data-runtime-health={props.health}
      aria-label="Runtime recovery"
    >
      <strong>{runtimeHealthLabel(props.health)}</strong>
      <span title={props.message ?? undefined}>{trimText(props.message ?? "Runtime unavailable", 96)}</span>
      <button data-action-id="runtime.retry" type="button" onClick={props.onRetry}>Retry</button>
      <button data-action-id="runtime.restart" type="button" onClick={props.onRestart} disabled={!props.canRestart}>Restart runtime</button>
      <button data-action-id="settings.open.runtime" type="button" onClick={props.onOpenSettings}>Open Settings</button>
    </section>
  );
}

function runtimeHealthLabel(health: "offline" | "starting" | "ready" | "degraded"): string {
  if (health === "ready") return "Ready";
  if (health === "starting") return "Starting";
  if (health === "degraded") return "Degraded";
  return "Offline";
}

function queueDockItemsFromRuntime(metrics: StudioRuntimeMetrics | null | undefined, health: "offline" | "starting" | "ready" | "degraded"): Array<{ id: string; label: string; detail: string; status: "empty" | "queued" | "running" | "blocked" }> {
  if (health !== "ready") return [{ id: "runtime", label: health === "starting" ? "Starting" : health === "degraded" ? "Blocked" : "Offline", detail: "Runtime", status: "blocked" }];
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

function isPrimaryHarness(id: HarnessId): boolean {
  return PRIMARY_HARNESS_IDS.includes(id);
}

function primaryHarnesses(harnesses: Harness[]): Harness[] {
  const byId = new Map(harnesses.map((harness) => [harness.id, harness]));
  return PRIMARY_HARNESS_IDS.map((id) => byId.get(id)).filter((harness): harness is Harness => Boolean(harness));
}

function normalizePrimaryHarness(id: HarnessId, harnesses: Harness[]): HarnessId {
  if (isPrimaryHarness(id) && harnesses.some((harness) => harness.id === id)) return id;
  if (harnesses.some((harness) => harness.id === DEFAULT_PRIMARY_HARNESS_ID)) return DEFAULT_PRIMARY_HARNESS_ID;
  return primaryHarnesses(harnesses)[0]?.id ?? DEFAULT_PRIMARY_HARNESS_ID;
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

function runDisabledReason(harness: Harness | undefined, harnessStatusCopy: string, prompt: string, runtimeHealth: "offline" | "starting" | "ready" | "degraded"): string {
  if (runtimeHealth !== "ready") return `Runtime ${runtimeHealthLabel(runtimeHealth)}`;
  if (!prompt.trim()) return "Add a prompt to run";
  if (!harness) return "Pick a harness to run";
  if (!harness.enabled) return `${harness.label} is disabled`;
  if (!harness.installed) return `${harness.label} is not installed`;
  if (harness.authStatus === "needs_login") return `${harness.label} needs login`;
  if (harness.authStatus === "missing") return `${harness.label} is missing`;
  return harnessStatusCopy;
}

function TopbarHarnessChip(props: {
  harnesses: Harness[];
  currentHarness: Harness | undefined;
  selectedHarness: HarnessId;
  statusCopy: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: HarnessId) => void;
  onDiagnose: (id: HarnessId) => void;
}) {
  const { harnesses, currentHarness, selectedHarness, statusCopy, isOpen, onOpenChange, onSelect, onDiagnose } = props;
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const label = currentHarness?.label ?? selectedHarness;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: globalThis.MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!isOpen) return;
    const idx = harnesses.findIndex((harness) => harness.id === selectedHarness);
    setFocusIndex(idx >= 0 ? idx : 0);
  }, [isOpen, harnesses, selectedHarness]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusIndex((i) => Math.min(harnesses.length - 1, i + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const harness = harnesses[focusIndex];
      if (harness) onSelect(harness.id);
    }
  }

  return (
    <span
      ref={containerRef}
      className="topbar-harness-chip"
      data-topbar-harness-chip={isOpen ? "open" : "closed"}
    >
      <button
        type="button"
        className="topbar-harness-chip-button"
        data-action-id="topbar.harness.open"
        aria-label={`Harness: ${label}, ${statusCopy}. Open picker.`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={`${label} · ${statusCopy} (⌘⇧H)`}
        onClick={() => onOpenChange(!isOpen)}
      >
        <i className="status-dot" data-auth-status={harnessAuthDot(currentHarness)} aria-hidden="true" />
        <strong>{label}</strong>
        <span className="topbar-harness-chip-status">{statusCopy}</span>
        {currentHarness?.installedPacks?.includes("everything-claude-code") ? (
          <span className="topbar-harness-chip-pack" data-installed-pack="everything-claude-code" title="everything-claude-code installed">ECC</span>
        ) : null}
      </button>
      {isOpen ? (
        <div
          className="topbar-harness-popover"
          role="listbox"
          aria-label="Pick a harness"
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          {harnesses.length === 0 ? (
            <div className="topbar-harness-popover-empty">Loading harnesses…</div>
          ) : (
            harnesses.map((harness, index) => {
              const isActive = harness.id === selectedHarness;
              const focused = index === focusIndex;
              return (
                <div
                  key={harness.id}
                  className="topbar-harness-row"
                  data-active={isActive ? "true" : "false"}
                  data-focused={focused ? "true" : "false"}
                  role="option"
                  aria-selected={isActive}
                >
                  <button
                    type="button"
                    className="topbar-harness-row-select"
                    data-action-id={`topbar.harness.select.${harness.id}`}
                    onClick={() => onSelect(harness.id)}
                    onMouseEnter={() => setFocusIndex(index)}
                    disabled={!harness.enabled}
                  >
                    <i className="status-dot" data-auth-status={harnessAuthDot(harness)} aria-hidden="true" />
                    <span className="topbar-harness-row-label">{harness.label}</span>
                    <span className="topbar-harness-row-meta">{harnessReadinessLabel(harness)}</span>
                  </button>
                  <button
                    type="button"
                    className="topbar-harness-row-diagnose"
                    data-action-id={`topbar.harness.diagnose.${harness.id}`}
                    title={`Diagnose ${harness.label}`}
                    aria-label={`Diagnose ${harness.label}`}
                    onClick={() => onDiagnose(harness.id)}
                  >
                    <StudioControlIcon name="details" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </span>
  );
}

function harnessAuthDot(harness: Harness | undefined): "ready" | "warn" | "missing" | "unknown" {
  if (!harness) return "unknown";
  if (!harness.enabled) return "missing";
  if (!harness.installed || harness.authStatus === "missing") return "missing";
  if (harness.authStatus === "needs_login") return "warn";
  if (harness.authStatus === "signed_in" || harness.authStatus === "ready" || harness.authStatus === "not_required") return "ready";
  return "unknown";
}

function ConversationGoalRow(props: {
  goal: string;
  turnIndex: number;
  onChange: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(props.goal);
  useEffect(() => { setDraft(props.goal); }, [props.goal]);
  const summary = props.goal.trim();
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
          onClick={() => props.onChange("")}
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
}) {
  return (
    <span className="harness-chip" data-harness-chip={props.kind} aria-label={`${props.label}: ${props.value}`} title={props.title ?? `${props.label}: ${props.value}`}>
      <StudioControlIcon name={props.icon} />
      <strong>{props.value}</strong>
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
