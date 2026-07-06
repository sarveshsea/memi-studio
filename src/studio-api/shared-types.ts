// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Shared type declarations for the Studio runtime API surface.
// Types only: no runtime code, so every other studio-api module can import
// from here without creating a dependency cycle.

export type HarnessId =
  | "memoire"
  | "claude-code"
  | "codex"
  | "opencode"
  | "gemini"
  | "ollama"
  | "hermes"
  | "shell";
export type StudioAction =
  | "compose"
  | "design-doc"
  | "audit"
  | "references"
  | "video"
  | "raw"
  | "app-build"
  | "self-design"
  | "research"
  | "simulate"
  | "fix"
  | "browser-audit"
  | "handoff";
export type StudioSessionMode = "delegate" | "brokered";
export type StudioInputMode = "agent" | "terminal" | "auto";
export type StudioChatMode = "ideate" | "research" | "build" | "terminal" | "review";
export type StudioPermissionMode = "plan" | "guarded" | "full_access";
export type StudioCodexReasoningEffort = "low" | "medium" | "high" | "xhigh";
export type StudioCodexApprovalPolicy = "untrusted" | "on-request" | "never";
export type StudioAutonomyLevel = "supervised" | "ask-before-tools" | "autonomous";
export type StudioPermissionPolicy = "allow" | "approval" | "block";
export type StudioHarnessVisibility = "primary" | "advanced";
export type StudioComputerPermissionState = "unknown" | "granted" | "denied" | "not_applicable";
export type StudioMacOSPermissionKey = "accessibility" | "screenRecording" | "automation" | "fileAccess";
export type StudioSetupStatus = "ready" | "needs_action" | "optional" | "blocked";
export type StudioSetupPermissionKind = "cli" | "provider" | "figma" | "macos" | "workspace" | "download" | "none";
export type StudioHarnessSetupActionKind = "copy_command" | "open_url" | "agent_kit" | "refresh" | "enable_harness";
export type AgentInstallTarget = "hermes" | "openclaw" | "claude-code" | "cursor" | "codex" | "opencode";
export type AgentInstallTargetInput = AgentInstallTarget | "all";
export type AgentKitKind = "skill" | "mcp-config";
export interface Harness {
  id: HarnessId;
  label: string;
  kind: string;
  provider: string;
  description: string;
  command: string;
  enabled: boolean;
  visibility?: StudioHarnessVisibility;
  installed: boolean;
  resolvedPath?: string | null;
  authStatus?: "missing" | "needs_login" | "signed_in" | "ready" | "not_required";
  authMessage?: string;
  supportsCancel: boolean;
  outputParser: string;
  capabilities?: StudioAction[];
  defaultModel?: string | null;
  installedPacks?: string[];
}

export interface StudioHarnessSetupAction {
  id: string;
  label: string;
  kind: StudioHarnessSetupActionKind;
  required: boolean;
  description: string;
  command?: string | null;
  url?: string | null;
  setupStepId?: string | null;
  agentKitTarget?: AgentInstallTargetInput | null;
}

export interface StudioHarnessSetupPlan {
  harnessId: HarnessId;
  label: string;
  status: StudioSetupStatus;
  summary: string;
  generatedAt: string;
  installed: boolean;
  enabled: boolean;
  authStatus: Harness["authStatus"];
  authMessage: string;
  resolvedPath: string | null;
  docsUrl: string | null;
  actions: StudioHarnessSetupAction[];
  requiredActionIds: string[];
}

export interface StudioHarnessDiagnostic {
  harnessId: HarnessId;
  label: string;
  status: StudioSetupStatus;
  message: string;
  checkedAt: string;
  setupPlan: StudioHarnessSetupPlan;
}

export interface StudioProviderConfig {
  anthropic?: { enabled: boolean; envKey: "ANTHROPIC_API_KEY" };
  openai?: { enabled: boolean; envKey: "OPENAI_API_KEY" };
  openaiCompatible?: { enabled: boolean; baseUrl: string | null; envKey: string | null };
  ollama?: { enabled: boolean; baseUrl: string; defaultModel: string };
}

export type StudioUsageProviderId = "anthropic" | "openai" | "openai-compatible" | "google" | "local" | "memoire" | "shell";

export interface StudioUsageBudget {
  dailyTokenLimit?: number | null;
  dailyCostLimitUsd?: number | null;
  warningThreshold?: number | null;
}

export interface StudioUsageBudgetConfig {
  warningThreshold: number;
  providers: Partial<Record<StudioUsageProviderId, StudioUsageBudget>>;
  harnesses: Partial<Record<HarnessId, StudioUsageBudget>>;
}

export interface StudioCodexConfig {
  model: string;
  reasoningEffort: StudioCodexReasoningEffort;
  approvalPolicy: StudioCodexApprovalPolicy;
  webSearch: boolean;
  skipGitRepoCheck: boolean;
  includeMemoireCommands: boolean;
  includeCodexCommands: boolean;
  planModeDefault: boolean;
}

export type StudioAutomationKind = "cron" | "heartbeat";
export type StudioAutomationStatus = "ACTIVE" | "PAUSED";
export type StudioAutomationMutationPolicy = "review" | "allow_writes" | "read_only";
export type StudioRightPaneTab = "run" | "changes" | "design-system" | "ia" | "research-lab" | "mermaid-board" | "design-changelog" | "figma" | "memory";

export interface StudioPaneIntent {
  tab: StudioRightPaneTab;
  reason: string;
  confidence: number;
  sourceEventId?: string;
  highlightIds?: string[];
}

export interface StudioAutomationDefinition {
  schemaVersion: 1;
  id: string;
  kind: StudioAutomationKind;
  name: string;
  prompt: string;
  status: StudioAutomationStatus;
  rrule: string;
  timezone: string;
  harness: HarnessId;
  action: StudioAction;
  chatMode: StudioChatMode;
  permissionMode: StudioPermissionMode;
  mutationPolicy: StudioAutomationMutationPolicy;
  codex?: Partial<StudioCodexConfig>;
  cwd: string;
  templateId?: string;
  sourceSessionId?: string | null;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export interface StudioAutomationTemplate {
  id: string;
  name: string;
  description: string;
  kind: StudioAutomationKind;
  rrule: string;
  harness: HarnessId;
  action: StudioAction;
  chatMode: StudioChatMode;
  permissionMode: StudioPermissionMode;
  mutationPolicy: StudioAutomationMutationPolicy;
  prompt: string;
}

export interface StudioAutomationRun {
  id: string;
  automationId: string;
  sessionId: string | null;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface StudioAutomationSchedulerStatus {
  label: string;
  installed: boolean;
  plistPath: string;
  projectRoot: string;
  runtimeBinary: string;
  intervalSeconds: number;
  logPath: string;
  message: string;
}

export interface StudioConfig {
  schemaVersion?: 1;
  configLoadError?: string | null;
  workspaceRoots: string[];
  defaultHarness: HarnessId;
  defaultModel?: string | null;
  providers?: StudioProviderConfig;
  usageBudgets?: StudioUsageBudgetConfig;
  codex?: StudioCodexConfig;
  harnesses?: Array<Harness & { enabledByDefault?: boolean; installProbe?: string[]; capabilities?: StudioAction[]; visibility?: StudioHarnessVisibility }>;
  ui?: {
    theme: "light" | "dark" | "system";
    inputMode: StudioInputMode;
    commandPaletteEnabled: boolean;
    toolbeltLayout: "compact" | "expanded";
  };
  agentProfiles?: Array<{
    id: string;
    name: string;
    defaultHarness: HarnessId;
    defaultAction: StudioAction;
    model: string | null;
    autonomy: StudioAutonomyLevel;
  }>;
  permissions?: {
    workspaceWrite: StudioPermissionPolicy;
    shell: StudioPermissionPolicy;
    computer: StudioPermissionPolicy;
    figma: StudioPermissionPolicy;
    allowlist: string[];
    denylist: string[];
  };
  computer?: {
    enabled: boolean;
    allowedApps: string[];
    requireApproval: boolean;
    permissions: {
      accessibility: StudioComputerPermissionState;
      screenRecording: StudioComputerPermissionState;
      automation: StudioComputerPermissionState;
      fileAccess: StudioComputerPermissionState;
    };
  };
  setup?: {
    wizardVersion: 1;
    completedAt: string | null;
    dismissedAt: string | null;
    lastCheckedAt: string | null;
    downloadReadyAcknowledged: boolean;
  };
  enabledTools?: {
    shell: boolean;
    browser: boolean;
    figma: boolean;
    mcp: boolean;
  };
  figma?: {
    autoStartBridge: boolean;
    preferredPort: number | null;
    portRange: [number, number];
    lastFileKey: string | null;
    lastConnectedAt: string | null;
  };
}

export interface StudioUsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  estimatedCostUsd: number;
}

export interface StudioUsageSession {
  id: string;
  harness: HarnessId;
  provider: StudioUsageProviderId;
  status: SessionSummary["status"];
  startedAt: string;
  completedAt: string | null;
  totals: StudioUsageTotals;
}

export interface StudioRateLimitState {
  id: string;
  provider: StudioUsageProviderId;
  harness?: HarnessId | null;
  status: "ok" | "warning" | "limited" | "unknown";
  source: "observed" | "budget" | "inferred" | "unknown";
  sourceConfidence: "high" | "medium" | "low";
  message: string;
  remainingTokens?: number | null;
  resetAt?: string | null;
  retryAfterSeconds?: number | null;
  budget?: StudioUsageBudget | null;
}

export interface StudioUsageSnapshot {
  generatedAt: string;
  sessions: StudioUsageSession[];
  totals: StudioUsageTotals;
  byHarness: Partial<Record<HarnessId, StudioUsageTotals>>;
  byProvider: Partial<Record<StudioUsageProviderId, StudioUsageTotals>>;
  rateLimits: StudioRateLimitState[];
  budgets: StudioUsageBudgetConfig;
}

export interface AgentKitPlan {
  target: AgentInstallTarget;
  kind: AgentKitKind;
  source: string;
  destination: string;
  wouldWrite: boolean;
  exists: boolean;
  overwritten: boolean;
  note: string;
}

export interface AgentSuiteManifestPlan {
  destination: string;
  wouldWrite: boolean;
  exists: boolean;
  overwritten: boolean;
  note: string;
}

export interface AgentKitPlansPayload {
  targets: AgentInstallTarget[];
  projectRoot: string;
  suiteManifest?: AgentSuiteManifestPlan;
  plans: AgentKitPlan[];
}

export interface AgentKitInstallResult {
  action: "install";
  status: "planned" | "completed";
  target: AgentInstallTargetInput;
  dryRun: boolean;
  force: boolean;
  suiteManifest?: AgentSuiteManifestPlan;
  plans: AgentKitPlan[];
}

export interface StudioStatus {
  status: string;
  projectRoot: string;
  config: StudioConfig;
  harnesses?: Harness[];
  runtime?: StudioRuntimeStatus | null;
  security?: {
    authRequired: boolean;
    allowedOriginMode: "local-allowlist";
    maxRequestBodyBytes: number;
  };
  metrics?: StudioRuntimeMetrics;
}

export interface StudioRuntimeMetrics {
  uptimeMs: number;
  indexedSessions: number;
  activeProcesses: number;
  activeStreams: number;
  activeRuns: number;
  activeReadRuns: number;
  queuedRuns: number;
  workspaceLocks: number;
  maxParallelReadRuns: number;
  eventBufferSize: number;
  harnessProbeCacheAgeMs: number;
  enabledHarnesses: number;
  catalogCacheAgeMs?: number;
  downloads?: {
    total: number;
    active: number;
    queued: number;
  };
}

export interface StudioRuntimeStatus {
  status: "running" | "starting" | "stopping" | "stopped" | "error";
  port: number;
  url: string;
  pid?: number | null;
  workspaceRoot: string;
  apiToken?: string | null;
  packageRoot?: string | null;
  runtimeBinary?: string | null;
  runtimeSource?: string | null;
  runtimeCacheRoot?: string | null;
  supervisorPhase?: string | null;
  startupStartedAt?: string | null;
  startupMs?: number | null;
  cachePrepareMs?: number | null;
  error?: string | null;
}

/**
 * Pushed by the Rust supervisor (`studio-runtime-state` Tauri event) on every
 * runtime lifecycle transition — spawn, ready, timeout, exit, restart
 * decision. `event` mirrors the Rust-side lifecycle log event name (e.g.
 * "runtime.spawned", "runtime.ready", "runtime.exit"); `payload` carries the
 * same fields already written to the durable lifecycle log.
 */
export interface StudioRuntimeLifecycleEvent {
  event: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface DesktopAppConfig {
  schemaVersion: 1;
  workspaceRoot: string;
  recentWorkspaces?: StudioRecentWorkspace[];
}

export interface StudioRecentWorkspace {
  path: string;
  name: string;
  openedAt: string;
  source: "open" | "create" | "runtime" | "cli";
}

export interface StudioWorkspacePermissions {
  homeRoot: string;
  currentWorkspace: string;
  homeWideAccess: boolean;
  workspaceRoots: string[];
  denylist: string[];
  allowlist: string[];
}

export interface StudioWorkspaceResult {
  workspace: StudioRecentWorkspace;
  recent: StudioRecentWorkspace[];
  permissions: StudioWorkspacePermissions;
  restartRequired?: boolean;
  currentProjectRoot?: string;
  config?: DesktopAppConfig | null;
  runtime?: StudioRuntimeStatus | null;
}

export interface StudioDesignSystemTraceFile {
  path: string;
  status: string;
  insertions: number;
  deletions: number;
  kind: "component" | "style" | "token" | "spec" | "figma" | "config" | "research" | "other";
  designSystem: boolean;
}

export interface StudioDesignSystemTrace {
  generatedAt: string;
  projectRoot: string;
  status: "clean" | "changed" | "unavailable";
  filesChanged: number;
  insertions: number;
  deletions: number;
  reviewLabel: string;
  files: StudioDesignSystemTraceFile[];
  designSystemFiles: StudioDesignSystemTraceFile[];
  error: string | null;
}

export type DesignChangelogEntryStatus = "active" | "archived";
export type DesignChangelogAuthor = "agent" | "human" | "runtime";

export interface DesignChangelogFileRef {
  path: string;
  status: string;
  insertions: number;
  deletions: number;
  kind: StudioDesignSystemTraceFile["kind"];
  designSystem: boolean;
}

export interface DesignChangelogEntry {
  schemaVersion: 1;
  id: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  status: DesignChangelogEntryStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  authoredBy: DesignChangelogAuthor;
  harness: HarnessId | string | null;
  action: StudioAction | string | null;
  sessionId: string | null;
  eventIds: string[];
  fileRefs: DesignChangelogFileRef[];
  captureWarnings: string[];
}

export type DesignChangelogCreateInput = Partial<Omit<DesignChangelogEntry, "schemaVersion" | "id" | "createdAt" | "updatedAt" | "status">> & {
  id?: string;
  status?: DesignChangelogEntryStatus;
};
export type DesignChangelogPatchInput = Partial<Omit<DesignChangelogEntry, "schemaVersion" | "id" | "createdAt">>;

export interface DesignChangelogCaptureResult {
  entry: DesignChangelogEntry | null;
  captured: boolean;
  warnings: string[];
}

export type StudioWorkArtifactKind = "decision" | "visual" | "spec" | "risk" | "evidence";
export type StudioWorkArtifactStatus = "draft" | "ready" | "needs_review" | "archived";
export type StudioReviewPacketState = "draft" | "ready" | "reviewed" | "archived";

export interface StudioWorkArtifactFileRef {
  path: string;
  status: string;
  insertions: number;
  deletions: number;
  kind: StudioDesignSystemTraceFile["kind"];
}

export interface StudioWorkArtifact {
  id: string;
  kind: StudioWorkArtifactKind;
  title: string;
  summary: string;
  body: string;
  status: StudioWorkArtifactStatus;
  confidence: number | null;
  eventIds: string[];
  fileRefs: StudioWorkArtifactFileRef[];
  artifactPath: string | null;
  visualPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudioReviewPacket {
  schemaVersion: 1;
  id: string;
  sessionId: string | null;
  title: string;
  objective: string;
  artifacts: StudioWorkArtifact[];
  decisions: StudioWorkArtifact[];
  evidence: StudioWorkArtifact[];
  risks: StudioWorkArtifact[];
  acceptanceCriteria: string[];
  nextMoves: string[];
  reviewState: StudioReviewPacketState;
  captureWarnings: string[];
  createdAt: string;
  updatedAt: string;
}

export type StudioReviewPacketPatch = Partial<Omit<StudioReviewPacket, "schemaVersion" | "id" | "sessionId" | "createdAt">>;

export interface StudioReviewPacketCaptureResult {
  packet: StudioReviewPacket | null;
  captured: boolean;
  warnings: string[];
}

export type MermaidBoardNodeKind = "mermaid" | "sticky" | "evidence" | "persona" | "risk" | "metric" | "spec" | "comment";
export type MermaidBoardAuthor = "human" | "agent";
export type MermaidBoardMode = "pm-brainstorm" | "ia" | "sandbox";
export type MermaidBoardLaneId =
  | "problem"
  | "users"
  | "journey"
  | "opportunities"
  | "decisions"
  | "risks"
  | "metrics"
  | "next-steps"
  | "sitemap"
  | "navigation"
  | "journeys"
  | "screens"
  | "evidence";
export type MermaidBoardDecisionStatus = "open" | "recommended" | "decided" | "blocked";
export type MermaidBoardFigJamSyncStatus = "idle" | "synced" | "fallback" | "unavailable" | "failed";

export interface MermaidBoardPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MermaidBoardNode {
  id: string;
  kind: MermaidBoardNodeKind;
  title: string;
  body: string;
  mermaidSource?: string;
  researchBacking: string[];
  sourceEventIds: string[];
  author: MermaidBoardAuthor;
  laneId?: MermaidBoardLaneId | string;
  priority?: "low" | "medium" | "high";
  confidence?: number;
  decisionStatus?: MermaidBoardDecisionStatus;
  position: MermaidBoardPosition;
  createdAt: string;
  updatedAt: string;
}

export interface MermaidBoardEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  sourceEventIds: string[];
  author: MermaidBoardAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface MermaidBoardFrame {
  id: string;
  title: string;
  nodeIds: string[];
  laneId?: MermaidBoardLaneId | string;
  position: MermaidBoardPosition;
}

export interface MermaidBoardBrief {
  problem: string;
  targetUser: string;
  outcome: string;
  constraints: string[];
  prompt?: string;
}

export interface MermaidBoardFigJamSyncResult {
  status: MermaidBoardFigJamSyncStatus;
  message: string;
  syncedAt: string;
  integration: string;
  outputPaths: string[];
  createdNodeCount: number;
  artifactPath: string | null;
  diagnostics: string[];
  fallbackReason?: string;
}

export interface MermaidBoardAgentSurfaceAction {
  id: string;
  label: string;
  requires: "core" | "pm";
  nodeKind?: MermaidBoardNodeKind;
}

export interface MermaidBoardAgentSurfacePrompt {
  id: string;
  label: string;
  prompt: string;
}

export interface MermaidBoardAgentSurfaceLane {
  id: MermaidBoardLaneId | string;
  label: string;
  intent: string;
  emptyCopy: string;
}

export interface MermaidBoardAgentSurfaceNodeDefault {
  kind: MermaidBoardNodeKind;
  laneId: MermaidBoardLaneId | string;
  title: string;
  body: string;
  mermaidSource?: string;
  priority?: "low" | "medium" | "high";
  decisionStatus?: MermaidBoardDecisionStatus;
}

export interface MermaidBoardAgentSurfaceSyncState {
  label: string;
  detail: string;
}

export interface MermaidBoardAgentSurface {
  ariaLabel: string;
  eyebrow: string;
  fallbackTitle: string;
  startSummary: string;
  briefLabel: string;
  cardsLabel: string;
  linksLabel: string;
  actions: MermaidBoardAgentSurfaceAction[];
  promptChips: MermaidBoardAgentSurfacePrompt[];
  lanes: MermaidBoardAgentSurfaceLane[];
  nodeDefaults: MermaidBoardAgentSurfaceNodeDefault[];
  empty: {
    title: string;
    body: string;
    actionLabel: string;
    offlineTitle: string;
  };
  sketch: {
    title: string;
    body: string;
  };
  inspector: {
    empty: string;
    whyTitle: string;
    authorshipTitle: string;
    agentAuthored: string;
    humanAuthored: string;
    evidenceTitle: string;
    noEvidence: string;
    mermaidSourceTitle: string;
    decisionPrefix: string;
    openDecision: string;
  };
  nodeMeta: {
    openState: string;
    linksLabel: string;
    evidenceRefsLabel: string;
    separator: string;
  };
  sync: {
    title: string;
    exportActionLabel: string;
    staleDetail: string;
    states: Record<MermaidBoardFigJamSyncStatus | "not_sent", MermaidBoardAgentSurfaceSyncState>;
  };
}

export interface MermaidBoard {
  schemaVersion: 1;
  id: string;
  title: string;
  description: string;
  mode?: MermaidBoardMode;
  templateId?: string;
  brief?: MermaidBoardBrief;
  agentSurface?: MermaidBoardAgentSurface;
  lastFigJamSync?: MermaidBoardFigJamSyncResult | null;
  nodes: MermaidBoardNode[];
  edges: MermaidBoardEdge[];
  frames: MermaidBoardFrame[];
  createdAt: string;
  updatedAt: string;
}

export interface MermaidBoardExport {
  id: string;
  title: string;
  format: "mermaid" | "markdown" | "json";
  kind: "board-source" | "board-summary" | "board-json" | "figjam-sync";
  source: string;
  outputPath: string;
  integration: string;
  nextSteps: string[];
}

export interface SessionSummary {
  id: string;
  conversationId?: string;
  turnIndex?: number;
  goal?: string;
  model?: string | null;
  effort?: StudioEffort;
  harness: HarnessId;
  action?: string;
  cwd: string;
  prompt: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted";
  mode?: StudioSessionMode;
  chatMode?: StudioChatMode;
  permissionMode?: StudioPermissionMode;
  attachments?: StudioAttachment[];
  startedAt: string;
  completedAt: string | null;
  exitCode: number | null;
  eventCount: number;
  source?: "live" | "persisted";
}

export type StudioAttachmentKind = "image" | "file" | "text";
export type StudioAttachmentSource = "file" | "paste" | "drop" | "material";

export interface StudioAttachment {
  id: string;
  kind: StudioAttachmentKind;
  name: string;
  mimeType: string;
  size: number;
  source: StudioAttachmentSource;
  path?: string;
  text?: string;
  previewUrl?: string;
  sessionId?: string | null;
  createdAt: string;
}

export interface StudioAttachmentCaptureRequest {
  sessionId?: string | null;
  kind: StudioAttachmentKind;
  name: string;
  mimeType: string;
  source: StudioAttachmentSource;
  text?: string;
  dataUrl?: string;
}

export interface StudioEvent {
  id: string;
  sessionId: string;
  type: string;
  timestamp: string;
  message: string;
  data?: unknown;
}

export interface StudioToolDefinition {
  id: string;
  label: string;
  category: "workspace" | "shell" | "git" | "browser" | "figma" | "mcp" | "knowledge" | "research" | "simulation" | "board";
  description: string;
  requiresApproval: boolean;
  enabled: boolean;
}

export interface StudioToolCallRequest {
  id?: string;
  toolId: string;
  input?: Record<string, unknown>;
  cwd?: string;
  sessionId?: string | null;
  approved?: boolean;
}

export interface StudioToolCallResult {
  id: string;
  toolId: string;
  status: "completed" | "failed" | "approval_required";
  startedAt: string;
  completedAt: string;
  input: Record<string, unknown>;
  data?: unknown;
  error?: string;
  artifactPath?: string | null;
}

export interface StudioBrowserStatus {
  enabled: boolean;
  installed: boolean;
  activeSessions: number;
  message: string;
}

export interface StudioBrowserSession {
  id: string;
  url: string;
  status: "active" | "closed";
  createdAt: string;
  updatedAt: string;
  artifactDir: string;
}

export interface StudioComputerStatus {
  enabled: boolean;
  platform: string;
  available: boolean;
  mode: "full-access-native" | "guarded-native" | "limited-web";
  permissions: {
    accessibility: StudioComputerPermissionState;
    screenRecording: StudioComputerPermissionState;
    automation: StudioComputerPermissionState;
    fileAccess: StudioComputerPermissionState;
  };
  allowedApps: string[];
  message: string;
}

export type StudioComputerAction =
  | "openApp"
  | "openUrl"
  | "revealPath"
  | "focusApp"
  | "openFigma"
  | "openBrowser"
  | "captureScreen";

export interface StudioComputerActionResult {
  action: StudioComputerAction;
  status: "completed" | "approval_required" | "failed" | "unavailable";
  completedAt: string;
  requiresApproval: boolean;
  executed: boolean;
  message: string;
  artifactPath: string | null;
  result?: unknown;
}

export interface StudioCompatibilitySnapshot {
  schemaVersion: 1;
  generatedAt: string;
  runtime: "local";
  harnesses: Array<{
    id: HarnessId;
    label: string;
    provider: string;
    installed: boolean;
    enabled: boolean;
    visibility?: StudioHarnessVisibility;
    authStatus: Harness["authStatus"];
    authMessage: string;
    supportedActions: StudioAction[];
    outputParser: string;
    supportsCancel: boolean;
    supportsStreaming: boolean;
    modes: StudioSessionMode[];
    requiredSetup: string[];
    setupStatus: StudioSetupStatus;
    setupAction: string;
    setupCommand: string | null;
    canAutoOpen: boolean;
    permissionKind: StudioSetupPermissionKind;
    resolvedPath: string | null;
    setupPlan: StudioHarnessSetupPlan;
  }>;
  tools: {
    browser: StudioCompatibilityTool;
    figma: StudioCompatibilityTool;
    computer: StudioCompatibilityTool;
    mcp: StudioCompatibilityTool;
    shell: StudioCompatibilityTool;
  };
  providers: StudioProviderConfig;
}

export interface StudioCompatibilityTool {
  enabled: boolean;
  available: boolean;
  state: string;
  message: string;
  setupStatus: StudioSetupStatus;
  setupAction: string;
  setupCommand: string | null;
  canAutoOpen: boolean;
  permissionKind: StudioSetupPermissionKind;
  actions?: StudioCompatibilityToolAction[];
}

export interface StudioCompatibilityToolAction {
  id: string;
  label: string;
  kind: "open_url" | "refresh";
  required: boolean;
  description: string;
  permissionKind: StudioSetupPermissionKind;
  permission?: StudioMacOSPermissionKey | null;
  url?: string | null;
  status?: StudioComputerPermissionState | null;
}

export interface StudioTracePhase {
  id: "research" | "analyze" | "ideate" | "design" | "spec" | "handoff";
  label: string;
  status: "queued" | "running" | "completed" | "failed";
  evidenceIds: string[];
}

export interface StudioTraceTask {
  id: string;
  label: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  evidenceIds: string[];
}

export type StudioReferenceTraceKind =
  | "package"
  | "spec"
  | "knowledge"
  | "figma"
  | "file"
  | "artifact"
  | "model";

export interface StudioReferenceTraceItem {
  id: string;
  kind: StudioReferenceTraceKind;
  label: string;
  summary: string;
  sourcePath?: string;
  packageName?: string;
  packageVersion?: string;
  url?: string;
  eventIds: string[];
}

export type StudioTraceOutputKind =
  | "chat"
  | "terminal"
  | "design"
  | "preview"
  | "research"
  | "marketplace"
  | "handoff"
  | "artifact"
  | "auth";

export interface StudioTraceOutput {
  id: string;
  kind: StudioTraceOutputKind;
  title: string;
  summary: string;
  sourcePath?: string;
  artifactPath?: string;
  url?: string;
  eventIds: string[];
}

export interface StudioTraceToolRun {
  id: string;
  tool: string;
  status: "queued" | "running" | "completed" | "failed" | "approval_required";
  summary: string;
  eventIds: string[];
}

export interface StudioTraceCitation {
  id: string;
  label: string;
  url?: string;
  sourcePath?: string;
  eventIds: string[];
}

export interface StudioTraceResearchEvidence {
  id: string;
  label: string;
  method: "qualitative" | "quantitative" | "mixed" | "netnography" | "desk";
  summary: string;
  sourcePath?: string;
  url?: string;
  tags: string[];
  eventIds: string[];
}

export type StudioActivityKind =
  | "thinking"
  | "reading_file"
  | "searching"
  | "listing"
  | "running_command"
  | "writing_file"
  | "using_tool"
  | "browser_action"
  | "figma_action"
  | "mcp_call"
  | "computer_action"
  | "terminal_group";

export interface StudioActivityItem {
  id: string;
  kind: StudioActivityKind;
  status: "running" | "completed" | "failed";
  label: string;
  summary: string;
  targetPath?: string;
  command?: string;
  sourceEventIds: string[];
  startedAt: string;
  completedAt?: string;
  outputPreview?: string;
}

export interface StudioActiveProcess {
  id: string;
  sessionId?: string;
  command: string;
  cwd?: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  outputPreview: string;
  sourceEventIds: string[];
}

export interface StudioTraceSnapshot {
  sessionId: string | null;
  source: "live" | "persisted" | "empty";
  generatedAt: string;
  phases: StudioTracePhase[];
  tasks: StudioTraceTask[];
  evidenceCount: number;
  activePhaseId: StudioTracePhase["id"] | null;
  eventIds: string[];
  references: StudioReferenceTraceItem[];
  outputs: StudioTraceOutput[];
  toolRuns: StudioTraceToolRun[];
  citations: StudioTraceCitation[];
  researchEvidence: StudioTraceResearchEvidence[];
  artifacts: DesignSystemArtifact[];
  activities: StudioActivityItem[];
  activeProcesses: StudioActiveProcess[];
}

export type DesignSystemArtifactReviewState = "unreviewed" | "looks_good" | "needs_work";
export type DesignSystemArtifactSectionKind =
  | "brand"
  | "type"
  | "colors"
  | "spacing"
  | "components"
  | "screens"
  | "accessibility"
  | "drift"
  | "handoff";

export interface DesignSystemArtifactSourceRef {
  id: string;
  label: string;
  sourcePath?: string;
  url?: string;
  line?: number;
  eventIds: string[];
}

export interface DesignSystemArtifactPreview {
  kind: "summary" | "tokens" | "typography" | "buttons" | "brand" | "spacing" | "components";
  items: Array<{ label: string; value: string; detail?: string }>;
}

export interface DesignSystemResolvedAsset {
  id: string;
  kind: "brand" | "logo" | "image" | "icon";
  label: string;
  sourcePath: string;
  previewUrl?: string;
  mimeType?: string;
  sectionId?: string;
}

export interface DesignSystemResolvedToken {
  id: string;
  kind: "color" | "typography" | "spacing" | "radius" | "shadow" | "component";
  name: string;
  value: string;
  sourcePath?: string;
  line?: number;
  sectionId?: string;
}

export interface DesignSystemArtifactSection {
  id: string;
  kind: DesignSystemArtifactSectionKind;
  title: string;
  summary: string;
  content: string;
  reviewState: DesignSystemArtifactReviewState;
  comments: string[];
  sourceRefs: DesignSystemArtifactSourceRef[];
  preview: DesignSystemArtifactPreview;
  eventIds: string[];
}

export type AgenticDesignSystemRoleId =
  | "harness_status"
  | "message_composer"
  | "tool_trace"
  | "artifact_review"
  | "memory_context"
  | "permission_control";
export type AgenticAtomicLevel = "atom" | "molecule" | "organism" | "template" | "page";
export type AgenticSurface = "topbar" | "composer" | "output" | "canvas" | "drawer";

export interface AgenticDesignSystemRole {
  id: AgenticDesignSystemRoleId;
  label: string;
  atomicLevel: AgenticAtomicLevel;
  surface: AgenticSurface;
  purpose: string;
  requiredSignals: string[];
  commandIds: string[];
  fallbackState: string;
}

export interface AgenticOpenSourceReference {
  name: string;
  url: string;
  license: string;
  category: string;
  mappedRoles: AgenticDesignSystemRoleId[];
}

export interface AgenticInteractionPattern {
  id: string;
  label: string;
  source: string;
  appliesTo: AgenticDesignSystemRoleId[];
  requiredSignals: string[];
}

export interface AgenticDesignSystemContract {
  contractVersion: 1;
  source: {
    name: string;
    url: string;
    figmaPreviewUrl: string;
    access: "public-preview";
    downloaded: false;
  };
  roles: AgenticDesignSystemRole[];
  outputSections: string[];
  agentRules: string[];
  openSourceReferences?: AgenticOpenSourceReference[];
  interactionPatterns?: AgenticInteractionPattern[];
}

export interface DesignSystemArtifact {
  schemaVersion: 1;
  id: string;
  title: string;
  status: "draft" | "review" | "published";
  sourceWorkspace: string | null;
  createdByHarness: string;
  sourceSessionId: string | null;
  sourceEventIds: string[];
  sourceRefs: DesignSystemArtifactSourceRef[];
  sections: DesignSystemArtifactSection[];
  agentic?: AgenticDesignSystemContract;
  assets?: DesignSystemResolvedAsset[];
  tokens?: DesignSystemResolvedToken[];
  resolvedAt?: string | null;
  resolverDiagnostics?: string[];
  rawContent: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectMemoryKind = "home" | "research" | "spec" | "system" | "monitor" | "changelog";
export type StudioKnowledgeKind =
  | "markdown"
  | "yaml"
  | "json"
  | "spec"
  | "note"
  | "research"
  | "design-reference"
  | "agent-capture"
  | "artifact";

export interface MarketplaceNote {
  id: string;
  name: string;
  title: string;
  category: string;
  description: string;
  source: "built-in-note" | "legacy-skill" | "workspace-skill" | "installed-note" | "remote-catalog" | "community-catalog" | "local-fork";
  sourcePath: string;
  sourceUrl: string | null;
  packageName: string | null;
  version: string;
  installed: boolean;
  builtIn: boolean;
  installable: boolean;
  tags: string[];
  sourceUrls?: string[];
  lastResearchedAt?: string | null;
  freshnessDays?: number | null;
  sourceRepo?: string | null;
  reviewStatus?: "draft" | "submitted" | "approved" | "rejected" | null;
  forkOf?: {
    name: string;
    version: string;
    sourceRepo?: string | null;
    sourcePath?: string | null;
  } | null;
  isForkable?: boolean;
  contributionUrl?: string | null;
  freshnessStatus?: string;
}

export interface NoteForkSummary {
  name: string;
  path: string;
  reviewStatus: "draft" | "submitted" | "approved" | "rejected";
  forkOf: {
    name: string;
    version: string;
    sourceRepo?: string | null;
    sourcePath?: string | null;
  };
  updatedAt: string;
}

export interface NoteForkFile {
  path: string;
  content: string;
  size: number;
  updatedAt: string;
}

export interface NoteForkValidation {
  ok: boolean;
  noteName: string | null;
  notePath: string;
  issues: Array<{ level: "error" | "warning"; message: string; path?: string }>;
  warnings: Array<{ level: "error" | "warning"; message: string; path?: string }>;
}

export interface NoteForkDiff {
  forkName: string;
  files: Array<{
    path: string;
    status: "added" | "modified" | "removed" | "unchanged";
    original: string | null;
    modified: string | null;
  }>;
}

export interface NoteForkPrHandoff {
  forkName: string;
  sourceRepo: string;
  targetPath: string;
  branchName: string;
  commitMessage: string;
  files: string[];
  commands: string[];
}

export interface StudioDownloadJob {
  id: string;
  type: "note-install";
  status: "queued" | "running" | "completed" | "failed";
  noteName: string | null;
  noteId: string | null;
  source: string | null;
  catalogUrl: string | null;
  progress: number;
  message: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface StudioDownloadEvent {
  id: string;
  jobId: string;
  type: "queued" | "progress" | "completed" | "failed";
  timestamp: string;
  message: string;
  progress: number;
}

export interface MarketplaceNotesPayload {
  notes: MarketplaceNote[];
  summary: {
    total: number;
    builtIn: number;
    installed: number;
    installable: number;
    categories: Record<string, number>;
  };
  remote?: {
    status: "disabled" | "ready" | "error";
    catalogUrl: string | null;
    checkedAt: string | null;
    cacheAgeMs: number;
    error: string | null;
    entries: number;
  };
  community?: {
    status: "disabled" | "ready" | "error";
    catalogUrl: string | null;
    checkedAt: string | null;
    cacheAgeMs: number;
    error: string | null;
    entries: number;
  };
}

export interface ProjectMemoryItem {
  id: string;
  kind: ProjectMemoryKind;
  title: string;
  summary: string;
  status: string;
  tags: string[];
  sourcePath: string;
  createdAt: string;
  updatedAt: string;
  links: Array<{ label: string; href: string }>;
  data: Record<string, unknown>;
}

export interface ProjectMemoryIndex {
  schemaVersion: 1;
  projectRoot: string;
  generatedAt: string;
  counts: Record<ProjectMemoryKind, number>;
  items: ProjectMemoryItem[];
}

export interface StudioKnowledgeItem {
  id: string;
  kind: StudioKnowledgeKind;
  title: string;
  summary: string;
  status: string;
  tags: string[];
  sourcePath: string;
  sourceRoot: string;
  contentType: string;
  content: string;
  excerpt: string;
  createdAt: string;
  updatedAt: string;
  links: Array<{ label: string; href: string }>;
  data: Record<string, unknown>;
  sessionId?: string;
  eventId?: string;
  eventType?: string;
}

export interface StudioKnowledgeIndex {
  schemaVersion: 1;
  projectRoot: string;
  generatedAt: string;
  counts: Record<StudioKnowledgeKind, number>;
  items: StudioKnowledgeItem[];
}

export interface FigmaStatus {
  running: boolean;
  port: number | null;
  bridgeStatus: "stopped" | "running";
  pluginStatus: "disconnected" | "connected";
  clients: Array<{
    id: string;
    file: string;
    fileKey?: string;
    editor: string;
    connectedAt: string;
    lastPing?: string;
  }>;
  connectionState: "connected" | "reconnecting" | "disconnected";
  reconnectAttempts: number;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
}

export type FigmaAction =
  | "inspectSelection"
  | "pullTokens"
  | "pullComponents"
  | "pullStyles"
  | "pullStickies"
  | "pageTree"
  | "widgetSnapshot"
  | "captureScreenshot"
  | "createNode"
  | "updateNode"
  | "deleteNode"
  | "setSelection"
  | "navigateTo"
  | "pushTokens"
  | "fullSync";

export interface FigmaActionRequest {
  action: FigmaAction;
  nodeId?: string;
  nodeIds?: string[];
  type?: string;
  name?: string;
  parentId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  fills?: unknown;
  properties?: Record<string, unknown>;
  expectedVersion?: string;
  tokens?: { name: string; values: Record<string, string | number> }[];
  createMissing?: boolean;
  collectionName?: string;
}

export interface FigmaActionResult {
  action: FigmaAction;
  status: "completed";
  completedAt: string;
  result: unknown;
  artifactPath: string | null;
}

export interface FigmaOpenResult {
  status: "opened";
  target: string;
  openedAt: string;
}

export type StudioEffort = "minimal" | "low" | "medium" | "high" | "xhigh";

export interface HarnessModelDefinition {
  id: string;
  label: string;
  contextWindow: number;
  supportsEffort: boolean;
  supportsThinking: boolean;
  supportsMultimodal?: boolean;
  tier?: "fast" | "balanced" | "deep" | "tiny";
  notes?: string;
}

export interface HarnessModelRegistry {
  harness: HarnessId;
  supportsModelPicker: boolean;
  supportsEffort: boolean;
  defaultModelId: string | null;
  models: HarnessModelDefinition[];
}
