// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Re-export barrel for the Studio workbench components.
//
// The implementation now lives in ./workbench/*. This file preserves the exact
// public surface so the import sites (App.tsx, ia-surface) keep importing from
// "./workbench-components" unchanged. Each module imports only from leaf modules
// (shared, icons) and studio-api, so there are no import cycles.

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

// Runtime status chip (2.4 Phase A) — no prior public surface to preserve.
export { RuntimeStatusChip } from "./workbench/runtime-status-chip";
export type { RuntimeStatusChipHealth } from "./workbench/runtime-status-chip";

// First-run welcome surface (2.4 Phase A) — no prior public surface to preserve.
export { WelcomeSurface } from "./workbench/welcome-surface";

// Re-export the work packet pane so the public surface is unchanged.
export { WorkPacketPane } from "./workbench/work-packet";

// Re-export the project sidebar so the public surface is unchanged.
export { ProjectSidebar } from "./workbench/sidebar";

// Re-export the workbench panels so the public surface is unchanged.
export {
  ActivityTimeline,
  AgentLogsPanel,
  AttachmentShelf,
  ChangedFilesPanel,
  ChatQualityLayer,
  ContextRail,
  CreationStrip,
  InputModeSwitcher,
  KnowledgeReader,
  MemoryTable,
  OutputTabs,
  ReferenceTracePanel,
  TracePanel,
  TraceTaskRow,
  WorkArtifactCards,
} from "./workbench/panels";
