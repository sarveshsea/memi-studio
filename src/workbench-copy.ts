// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import type {
  MermaidBoardAgentSurface,
  MermaidBoardAgentSurfaceAction,
  MermaidBoardAgentSurfaceLane,
  MermaidBoardAgentSurfaceNodeDefault,
  MermaidBoardBrief,
  MermaidBoardFigJamSyncStatus,
  StudioAction,
  StudioChatMode,
  StudioPermissionMode,
} from "./studio-api";

export type WorkbenchIconName =
  | "attach"
  | "mode"
  | "access"
  | "plan"
  | "harness"
  | "codex"
  | "claude"
  | "ollama"
  | "action"
  | "command"
  | "details"
  | "light"
  | "dark"
  | "settings"
  | "refresh"
  | "search"
  | "pin"
  | "branch"
  | "copy"
  | "context"
  | "collapse"
  | "expand"
  | "figma"
  | "memory"
  | "open"
  | "close"
  | "save"
  | "run"
  | "stop"
  | "latest"
  | "workspace"
  | "packet"
  | "changes"
  | "system"
  | "ia"
  | "research"
  | "board"
  | "changelog"
  | "automation"
  | "trash"
  | "edit"
  | "history"
  | "download"
  | "export"
  | "review"
  | "check"
  | "warning"
  | "pause"
  | "play"
  | "palette"
  | "sync"
  | "filter"
  | "receipt";

export interface WorkbenchActionCopy {
  id: string;
  label: string;
  shortLabel?: string;
  ariaLabel: string;
  title?: string;
  icon: WorkbenchIconName;
  iconOnly?: boolean;
}

export interface WorkbenchStarterPrompt {
  label: string;
  shortLabel: string;
  template: string;
  action: StudioAction;
  chatMode: StudioChatMode;
  permissionMode: StudioPermissionMode;
  icon: WorkbenchIconName;
}

export interface WorkbenchModePreset {
  id: "plan" | "research" | "build" | "review" | "ship";
  label: string;
  shortLabel: string;
  action: StudioAction;
  chatMode: StudioChatMode;
  permissionMode: StudioPermissionMode;
  icon: WorkbenchIconName;
  iconOnly?: boolean;
}

export const WORKBENCH_ACTIONS = {
  attach: { id: "attachment.add", label: "Attach", ariaLabel: "Attach context", title: "Attach context", icon: "attach", iconOnly: true },
  planToggle: { id: "codex.plan-mode.toggle", label: "Plan", ariaLabel: "Toggle plan mode", title: "Plan mode", icon: "plan", iconOnly: true },
  run: { id: "session.run", label: "Run", ariaLabel: "Run session", title: "Run", icon: "run", iconOnly: true },
  continue: { id: "session.continue", label: "Continue", ariaLabel: "Continue conversation", title: "Continue conversation", icon: "run", iconOnly: true },
  stop: { id: "session.cancel", label: "Stop", ariaLabel: "Stop session", title: "Stop", icon: "stop", iconOnly: true },
  latest: { id: "conversation.scroll-latest", label: "Latest", ariaLabel: "Scroll to latest output", title: "Latest output", icon: "latest", iconOnly: true },
  changeWorkspace: { id: "workspace.change", label: "Open folder", ariaLabel: "Open folder", title: "Open folder", icon: "workspace", iconOnly: true },
  clearSearch: { id: "conversation.search.clear", label: "Clear", ariaLabel: "Clear search", title: "Clear search", icon: "close", iconOnly: true },
  newRun: { id: "queue.new-run", label: "New run", ariaLabel: "New run", title: "New run", icon: "run", iconOnly: true },
  copy: { id: "copy", label: "Copy", ariaLabel: "Copy", title: "Copy", icon: "copy", iconOnly: true },
  context: { id: "context", label: "Context", ariaLabel: "Use as context", title: "Context", icon: "context", iconOnly: true },
  collapse: { id: "collapse", label: "Collapse", ariaLabel: "Collapse", title: "Collapse", icon: "collapse", iconOnly: true },
  expand: { id: "expand", label: "Expand", ariaLabel: "Expand", title: "Expand", icon: "expand", iconOnly: true },
  open: { id: "open", label: "Open", ariaLabel: "Open", title: "Open", icon: "open", iconOnly: true },
  close: { id: "close", label: "Close", ariaLabel: "Close", title: "Close", icon: "close", iconOnly: true },
  save: { id: "save", label: "Save", ariaLabel: "Save", title: "Save", icon: "save", iconOnly: true },
  refresh: { id: "refresh", label: "Refresh", ariaLabel: "Refresh", title: "Refresh", icon: "refresh", iconOnly: true },
  settings: { id: "settings.open", label: "Settings", ariaLabel: "Open settings", title: "Settings", icon: "settings", iconOnly: true },
  review: { id: "review", label: "Review", ariaLabel: "Review", title: "Review", icon: "review", iconOnly: true },
  receipt: { id: "artifact.verification", label: "Receipt", ariaLabel: "Artifact verification", title: "Artifact verification", icon: "receipt", iconOnly: true },
  board: { id: "board", label: "Board", ariaLabel: "Send to board", title: "Send to board", icon: "board", iconOnly: true },
  figma: { id: "figma", label: "Figma", ariaLabel: "Send to Figma", title: "Send to Figma", icon: "figma", iconOnly: true },
  changelog: { id: "changelog", label: "Changelog", ariaLabel: "Add to changelog", title: "Add to changelog", icon: "changelog", iconOnly: true },
  sync: { id: "sync", label: "Sync", ariaLabel: "Sync", title: "Sync", icon: "sync", iconOnly: true },
  export: { id: "export", label: "Export", ariaLabel: "Export", title: "Export", icon: "export", iconOnly: true },
  delete: { id: "delete", label: "Delete", ariaLabel: "Delete", title: "Delete", icon: "trash", iconOnly: true },
  edit: { id: "edit", label: "Edit", ariaLabel: "Edit", title: "Edit", icon: "edit", iconOnly: true },
  history: { id: "history", label: "History", ariaLabel: "Run history", title: "Run history", icon: "history", iconOnly: true },
  pause: { id: "pause", label: "Pause", ariaLabel: "Pause", title: "Pause", icon: "pause", iconOnly: true },
  play: { id: "play", label: "Resume", ariaLabel: "Resume", title: "Resume", icon: "play", iconOnly: true },
  command: { id: "command-palette.open", label: "Palette", ariaLabel: "Open command palette", title: "Command palette", icon: "palette", iconOnly: true },
  usageLimits: { id: "usage.limits.open", label: "Usage", ariaLabel: "Open usage limits", title: "Usage limits", icon: "warning", iconOnly: true },
} satisfies Record<string, WorkbenchActionCopy>;

export const WORKBENCH_COPY = {
  starterPrompts: [
    {
      label: "Critique screen",
      shortLabel: "Critique",
      template: "Critique the current screen for hierarchy, spacing, accessibility, copy, empty/loading/error states, and design-system drift. Return prioritized fixes and verification steps.",
      action: "audit",
      chatMode: "review",
      permissionMode: "plan",
      icon: "review",
    },
    {
      label: "Map journey",
      shortLabel: "Journey",
      template: "Map the target user journey for this product surface, identify friction and decision points, compare proven patterns, and produce evidence-backed next moves.",
      action: "browser-audit",
      chatMode: "research",
      permissionMode: "plan",
      icon: "research",
    },
    {
      label: "Fix layout",
      shortLabel: "Fix",
      template: "Fix the highest-impact layout and readability issues in the current Studio surface, then verify with tests and a browser check.",
      action: "fix",
      chatMode: "build",
      permissionMode: "guarded",
      icon: "changes",
    },
    {
      label: "Extract tokens",
      shortLabel: "Tokens",
      template: "Extract color, type, spacing, radius, state, and component patterns from the current workspace, then report gaps and suggested token names.",
      action: "design-doc",
      chatMode: "research",
      permissionMode: "plan",
      icon: "system",
    },
    {
      label: "Write spec",
      shortLabel: "Spec",
      template: "Write a designer-engineer implementation spec for the selected UI change, including behavior, states, accessibility, tests, and acceptance criteria.",
      action: "design-doc",
      chatMode: "ideate",
      permissionMode: "plan",
      icon: "packet",
    },
    {
      label: "Handoff review",
      shortLabel: "Handoff",
      template: "Review the current diff and artifacts for visual regressions, UX risks, handoff blockers, test gaps, and release checks.",
      action: "audit",
      chatMode: "review",
      permissionMode: "plan",
      icon: "review",
    },
  ] satisfies WorkbenchStarterPrompt[],
  modePresets: [
    { id: "plan", label: "Plan", shortLabel: "Plan", permissionMode: "plan", chatMode: "ideate", action: "research", icon: "plan", iconOnly: true },
    { id: "research", label: "Research", shortLabel: "Research", permissionMode: "plan", chatMode: "research", action: "browser-audit", icon: "research", iconOnly: true },
    { id: "build", label: "Build", shortLabel: "Build", permissionMode: "guarded", chatMode: "build", action: "app-build", icon: "run", iconOnly: true },
    { id: "review", label: "Review", shortLabel: "Review", permissionMode: "plan", chatMode: "review", action: "audit", icon: "review", iconOnly: true },
    { id: "ship", label: "Ship", shortLabel: "Ship", permissionMode: "guarded", chatMode: "review", action: "handoff", icon: "export", iconOnly: true },
  ] satisfies WorkbenchModePreset[],
  actions: [
    { id: "compose", label: "Compose" },
    { id: "design-doc", label: "Doc" },
    { id: "audit", label: "Audit" },
    { id: "references", label: "Refs" },
    { id: "video", label: "Video" },
    { id: "raw", label: "Raw" },
    { id: "app-build", label: "Build" },
    { id: "self-design", label: "Design" },
    { id: "research", label: "Research" },
    { id: "simulate", label: "Simulate" },
    { id: "fix", label: "Fix" },
    { id: "browser-audit", label: "Browser" },
    { id: "handoff", label: "Handoff" },
  ] satisfies Array<{ id: StudioAction; label: string }>,
  chatModes: [
    { id: "ideate", label: "Ideate" },
    { id: "research", label: "Research" },
    { id: "build", label: "Build" },
    { id: "terminal", label: "Terminal" },
    { id: "review", label: "Review" },
  ] satisfies Array<{ id: StudioChatMode; label: string }>,
  permissionModes: [
    { id: "plan", label: "Plan" },
    { id: "guarded", label: "Auto Edit" },
    { id: "full_access", label: "Auto" },
  ] satisfies Array<{ id: StudioPermissionMode; label: string }>,
  rightPaneTabs: [
    { id: "run", label: "Inspector", shortLabel: "Inspect", group: "primary", icon: "details", iconOnly: false },
    { id: "work-packet", label: "Work Packet", shortLabel: "Packet", group: "primary", icon: "packet", iconOnly: true },
    { id: "changes", label: "Changes", shortLabel: "Changes", group: "primary", icon: "changes", iconOnly: true },
    { id: "design-system", label: "Design System", shortLabel: "System", group: "primary", icon: "system", iconOnly: false },
    { id: "ia", label: "IA", shortLabel: "IA", group: "primary", icon: "ia", iconOnly: false },
    { id: "research-lab", label: "Research Lab", shortLabel: "Research", group: "primary", icon: "research", iconOnly: false },
    { id: "mermaid-board", label: "PM Board", shortLabel: "Board", group: "primary", icon: "board", iconOnly: true },
    { id: "design-changelog", label: "Changelog", shortLabel: "Changelog", group: "utility", icon: "changelog", iconOnly: true },
    { id: "figma", label: "Figma", shortLabel: "Figma", group: "utility", icon: "figma", iconOnly: true },
    { id: "memory", label: "Memory", shortLabel: "Memory", group: "utility", icon: "memory", iconOnly: true },
  ] as const,
  actionRegistry: [
    { id: "theme.light", label: "Light", kind: "local", surface: "topbar" },
    { id: "theme.dark", label: "Dark", kind: "local", surface: "topbar" },
    { id: "settings.open", label: "Settings", kind: "local", surface: "settings" },
    { id: "command-palette.open", label: "Palette", kind: "local", surface: "command" },
    { id: "input-mode.agent", label: "Agent", kind: "local", surface: "command" },
    { id: "input-mode.terminal", label: "Terminal", kind: "local", surface: "command" },
    { id: "input-mode.auto", label: "Auto", kind: "local", surface: "command" },
    { id: "conversation.scroll-latest", label: "Latest", kind: "local", surface: "command" },
    { id: "session.run", label: "Run", kind: "runtime", surface: "command" },
    { id: "session.cancel", label: "Stop", kind: "runtime", surface: "command" },
    { id: "session.open", label: "Open", kind: "runtime", surface: "cockpit" },
    { id: "runtime.refresh", label: "Refresh", kind: "runtime", surface: "topbar" },
    { id: "memory.refresh", label: "Memory", kind: "runtime", surface: "context" },
    { id: "context.open", label: "Context", kind: "runtime", surface: "context" },
    { id: "knowledge.refresh", label: "Knowledge", kind: "runtime", surface: "context" },
    { id: "knowledge.open", label: "Open", kind: "runtime", surface: "context" },
    { id: "changelog.open.sidebar", label: "Changelog", kind: "local", surface: "changelog" },
    { id: "design-changelog.new", label: "New", kind: "runtime", surface: "changelog" },
    { id: "design-changelog.export", label: "Export", kind: "runtime", surface: "changelog" },
    { id: "right-pane.tab.run", label: "Inspector", kind: "local", surface: "cockpit" },
    { id: "right-pane.tab.work-packet", label: "Packet", kind: "local", surface: "cockpit" },
    { id: "right-pane.tab.changes", label: "Changes", kind: "local", surface: "cockpit" },
    { id: "right-pane.tab.design-system", label: "System", kind: "local", surface: "cockpit" },
    { id: "right-pane.tab.ia", label: "IA", kind: "local", surface: "board" },
    { id: "right-pane.tab.research-lab", label: "Research", kind: "local", surface: "cockpit" },
    { id: "right-pane.tab.mermaid-board", label: "Board", kind: "local", surface: "board" },
    { id: "right-pane.tab.design-changelog", label: "Changelog", kind: "local", surface: "changelog" },
    { id: "right-pane.tab.figma", label: "Figma", kind: "local", surface: "figma" },
    { id: "right-pane.tab.memory", label: "Memory", kind: "local", surface: "context" },
    { id: "board.create", label: "Board", kind: "runtime", surface: "board" },
    { id: "board.apply_template", label: "Brief", kind: "runtime", surface: "board" },
    { id: "board.add_node", label: "Node", kind: "runtime", surface: "board" },
    { id: "board.export_mermaid_jam", label: "Export", kind: "runtime", surface: "board" },
    { id: "board.sync_figjam", label: "FigJam", kind: "runtime", surface: "board" },
    { id: "figma.connect", label: "Start", kind: "runtime", surface: "figma" },
    { id: "figma.disconnect", label: "Stop", kind: "runtime", surface: "figma" },
    { id: "figma.open", label: "Open Figma", kind: "runtime", surface: "figma" },
    { id: "figma.action", label: "Figma", kind: "runtime", surface: "figma" },
    { id: "computer.status", label: "Computer", kind: "runtime", surface: "computer" },
    { id: "computer.action", label: "Run", kind: "runtime", surface: "computer" },
  ] as const,
  mermaidRuntime: {
    unavailable: "Studio runtime is offline or does not expose the core board tools. Restart Mémoire Studio runtime and refresh this board.",
    pmRuntimeStale: "Runtime update required for FigJam sync. Core board tools are available, but this runtime is missing the Product Brainstorm Brief and FigJam sync tools.",
  },
  artifactPrompts: {
    context: (title: string, body: string) => `Use this work artifact as context:\n${title}\n${body}`,
    changelog: (title: string, body: string) => `Capture this design decision in the changelog:\n${title}\n${body}`,
    board: (title: string, body: string) => `Add this artifact to the Product Brainstorm Board with evidence and next steps:\n${title}\n${body}`,
    figma: (title: string, body: string) => `Prepare this artifact for Figma/FigJam sync:\n${title}\n${body}`,
  },
  outputTabs: [
    { id: "screens", label: "Screens" },
    { id: "components", label: "Components" },
    { id: "tokens", label: "Tokens" },
    { id: "specs", label: "Specs" },
    { id: "audit", label: "Audit" },
    { id: "references", label: "References" },
    { id: "handoff", label: "Handoff" },
  ] as const,
  referenceTraceGroups: [
    { id: "package", label: "Package" },
    { id: "spec", label: "Specs" },
    { id: "knowledge", label: "Knowledge" },
    { id: "figma", label: "Figma" },
    { id: "file", label: "Files" },
    { id: "artifact", label: "Artifacts" },
    { id: "model", label: "Model" },
  ] as const,
  memoryFilters: {
    all: "All",
    page: "Pages",
    component: "Components",
    token: "Tokens",
    reference: "References",
    markdown: "Markdown",
    yaml: "YAML",
  },
  sidebar: {
    projectsLabel: "Projects",
    settingsAction: WORKBENCH_ACTIONS.settings,
    newSessionAction: WORKBENCH_ACTIONS.newRun,
  },
  queue: {
    queuedLabel: "Queued",
    fallbackPrompt: "Run",
    newRunLabel: "New run",
  },
  composer: {
    promptAriaLabel: "Prompt",
    modePresetsLabel: "Mode presets",
    launcherLabel: "Agent run launcher",
    controlsLabel: "Composer controls",
    modeTitle: "Mode",
    accessTitle: "Access",
    harnessTitle: "Harness",
    actionTitle: "Action",
  },
  boardFallback: {
    lanes: [
      { id: "problem", label: "Problem", intent: "User pain", emptyCopy: "Add problem." },
      { id: "users", label: "Users", intent: "Audience", emptyCopy: "Add users." },
      { id: "journey", label: "Journey", intent: "Flow", emptyCopy: "Map flow." },
      { id: "opportunities", label: "Options", intent: "Bets", emptyCopy: "Add options." },
      { id: "decisions", label: "Decisions", intent: "Direction", emptyCopy: "Add decisions." },
      { id: "risks", label: "Risks", intent: "Unknowns", emptyCopy: "Add risks." },
      { id: "metrics", label: "Metrics", intent: "Success", emptyCopy: "Add metrics." },
      { id: "next-steps", label: "Next", intent: "Follow-up", emptyCopy: "Add next move." },
    ] satisfies MermaidBoardAgentSurfaceLane[],
    actions: [
      { id: "board.apply_template", label: "Brief", requires: "pm" },
      { id: "board.add_node.mermaid", label: "Journey", requires: "core", nodeKind: "mermaid" },
      { id: "board.add_node.spec", label: "Options", requires: "core", nodeKind: "spec" },
      { id: "board.add_node.risk", label: "Risks", requires: "core", nodeKind: "risk" },
      { id: "board.add_node.metric", label: "Metrics", requires: "core", nodeKind: "metric" },
      { id: "board.add_node.comment", label: "Decision", requires: "core", nodeKind: "comment" },
      { id: "board.layout", label: "Organize", requires: "core" },
      { id: "board.sync_figjam", label: "FigJam", requires: "pm" },
    ] satisfies MermaidBoardAgentSurfaceAction[],
    syncStates: {
      not_sent: { label: "Not sent", detail: "Export or sync when ready." },
      idle: { label: "Not sent", detail: "Export or sync when ready." },
      synced: { label: "Synced", detail: "FigJam is current." },
      fallback: { label: "Ready", detail: "Mermaid Jam source is ready." },
      failed: { label: "Failed", detail: "Local source was still written." },
      unavailable: { label: "Offline", detail: "Bridge unavailable." },
    } satisfies MermaidBoardAgentSurface["sync"]["states"],
    surface: {
      title: "PM Board",
      eyebrow: "PM Board",
      startSummary: "Start",
      briefLabel: "Brief",
      cardsLabel: "cards",
      linksLabel: "links",
      emptyTitle: "Start",
      emptyBody: "Create a board.",
      emptyActionLabel: "Create",
      offlineTitle: "Offline",
      sketchTitle: "Sketch",
      sketchBody: "Local source.",
      inspectorEmpty: "Select card.",
      whyTitle: "Why",
      authorshipTitle: "Author",
      agentAuthored: "Agent",
      humanAuthored: "Human",
      evidenceTitle: "Evidence",
      noEvidence: "No evidence.",
      mermaidSourceTitle: "Source",
      decisionPrefix: "Decision",
      openDecision: "open",
      openState: "open",
      evidenceRefsLabel: "refs",
      separator: "/",
      syncTitle: "FigJam",
      exportActionLabel: "Export",
      staleDetail: "Update runtime for FigJam sync.",
    },
    promptChips: [
      { id: "journey", label: "Journey", prompt: "Map the target user's journey and add evidence-backed decision cards." },
      { id: "options", label: "Options", prompt: "Turn the current research into product options and tradeoffs." },
      { id: "risks", label: "Risks", prompt: "Identify risks, unknowns, mitigations, and evidence gaps." },
      { id: "metrics", label: "Metrics", prompt: "Define success metrics and guardrails for this decision." },
    ],
    nodeDefaults: (brief: MermaidBoardBrief): MermaidBoardAgentSurfaceNodeDefault[] => [
      {
        kind: "mermaid",
        laneId: "journey",
        title: "Journey map",
        body: "Agent-authored journey source.",
        mermaidSource: "flowchart TD\n  Problem[Product question] --> User[Target user]\n  User --> Moment[Friction]\n  Moment --> Option[Option]\n  Option --> Decision[Decision]",
        priority: "medium",
      },
      { kind: "spec", laneId: "opportunities", title: "Product option", body: brief.problem, priority: "high", decisionStatus: "recommended" },
      { kind: "risk", laneId: "risks", title: "Launch risk", body: brief.problem, priority: "medium" },
      { kind: "metric", laneId: "metrics", title: "Metric", body: brief.outcome, priority: "high" },
      { kind: "comment", laneId: "decisions", title: "Decision", body: brief.problem, priority: "high", decisionStatus: "open" },
    ],
    brief: (): MermaidBoardBrief => ({
      problem: "What user problem are we solving?",
      targetUser: "PMs, designers, and agents.",
      outcome: "Reviewed direction.",
      constraints: ["Explicit FigJam writes", "Local artifacts", "Evidence links"],
    }),
  },
} as const;

export function workbenchAction(id: keyof typeof WORKBENCH_ACTIONS): WorkbenchActionCopy {
  return WORKBENCH_ACTIONS[id];
}

export type WorkbenchBoardFallback = typeof WORKBENCH_COPY.boardFallback;
export type WorkbenchBoardSyncState = MermaidBoardFigJamSyncStatus | "not_sent";
