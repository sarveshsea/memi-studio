// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Project sidebar: workspace + session navigation tree.

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
import { compactStatusLabel } from "./shared";
export function ProjectSidebar(props: {
  sessions: SessionSummary[];
  currentSessionId: string | null;
  currentWorkspace: string | null;
  recentWorkspaces: StudioRecentWorkspace[];
  collapsed: boolean;
  expandedProjectIds: string[];
  onToggleCollapsed: () => void;
  onToggleProject: (projectId: string) => void;
  onOpenSession: (session: SessionSummary) => void;
  onOpenWorkspace: (path?: string) => void | Promise<void>;
  onCreateWorkspace: () => void | Promise<void>;
  onOpenSettings: () => void;
  onNewChat: () => void;
  onOpenCommand: () => void;
  onOpenPlugins: () => void;
  onOpenChangelog: () => void;
  onOpenAutomations: () => void;
  onOpenFigma: () => void | Promise<void>;
}) {
  const navigationSessions = sidebarNavigationSessions(props.sessions, props.currentSessionId);
  const projects = groupSessionsByProject(navigationSessions);
  const activeWorkspaceProject = currentWorkspaceProject(props.currentWorkspace, navigationSessions);
  const expanded = new Set(props.expandedProjectIds);
  const hasNavigationContext = projects.length > 0 || Boolean(activeWorkspaceProject) || props.recentWorkspaces.length > 0;
  return (
    <aside
      className="project-sidebar"
      data-project-sidebar="codex-style"
      data-sidebar-collapsed={String(props.collapsed)}
      data-sidebar-readable-collapsed={String(props.collapsed)}
      aria-label="Projects"
    >
      <div className="project-sidebar-main">
        <div className="project-sidebar-top">
          <button
            data-action-id="sidebar.collapse"
            data-icon-tooltip={props.collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
            onClick={props.onToggleCollapsed}
            aria-label={props.collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={props.collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <SidebarIcon name={props.collapsed ? "panel-open" : "panel-close"} />
            <span>Collapse</span>
          </button>
        </div>
        {hasNavigationContext ? (
          <div className="project-sidebar-action-group" data-sidebar-section="page-actions">
            <div className="project-sidebar-section-title">
              <span>Actions</span>
            </div>
            <nav className="project-sidebar-actions" aria-label="Studio actions">
              <button data-action-id="workspace.new-folder.sidebar" data-workspace-action="new-folder" type="button" onClick={() => void props.onCreateWorkspace()} title="New folder">
                <SidebarIcon name="new-chat" />
                <span>New folder</span>
              </button>
              <button data-action-id="workspace.open-folder.sidebar" data-workspace-action="open-folder" type="button" onClick={() => void props.onOpenWorkspace()} title="Open folder">
                <SidebarIcon name="folder-open" />
                <span>Open folder</span>
              </button>
              <button data-action-id="sidebar.new-chat" type="button" onClick={props.onNewChat} title="New chat">
                <SidebarIcon name="new-chat" />
                <span>New chat</span>
              </button>
            </nav>
          </div>
        ) : null}
        <div className="project-sidebar-folders" data-sidebar-section="project-navigation" data-project-folder-list="true">
          <div className="project-sidebar-section-label">
            <span>Projects</span>
          </div>
          {activeWorkspaceProject ? (
            <section className="project-folder" data-current-workspace-project="true" data-project-folder={activeWorkspaceProject.id}>
              <button
                className="project-folder-row"
                data-action-id={`workspace.current.${activeWorkspaceProject.id}`}
                data-active="true"
                data-current-workspace-row="true"
                type="button"
                onClick={() => void props.onOpenWorkspace(activeWorkspaceProject.path)}
                title={activeWorkspaceProject.path}
              >
                <SidebarIcon name="folder-open" />
                <span>{activeWorkspaceProject.label}</span>
                <small>Current</small>
              </button>
            </section>
          ) : null}
          {projects.map((project) => {
            const isExpanded = expanded.has(project.id) || project.sessions.some((session) => session.id === props.currentSessionId);
            const navItems = project.sessions.map(projectSessionNavItem);
            const primaryNavItems = navItems.filter((item) => !item.isVerification);
            const verificationNavItems = navItems.filter((item) => item.isVerification);
            const visiblePrimaryItems = primaryNavItems.slice(0, 8);
            const visibleVerificationItems = visibleSessionNavItems(verificationNavItems, props.currentSessionId, 4);
            const currentSessionIsVerification = verificationNavItems.some((item) => item.session.id === props.currentSessionId);
            return (
              <section className="project-folder" key={project.id} data-project-folder={project.id}>
                <button
                  className="project-folder-row"
                  data-action-id={`project.toggle.${project.id}`}
                  data-project-folder-row="true"
                  data-active={String(project.sessions.some((session) => session.id === props.currentSessionId))}
                  type="button"
                  onClick={() => props.onToggleProject(project.id)}
                  title={project.path}
                >
                  <SidebarIcon name={isExpanded ? "folder-open" : "folder"} />
                  <span>{project.label}</span>
                  {primaryNavItems.length ? <small>{primaryNavItems.length}</small> : null}
                  <SidebarIcon name={isExpanded ? "chevron-down" : "chevron-right"} />
                </button>
                {isExpanded ? (
                  <div className="project-session-list">
                    {visiblePrimaryItems.map((item) => (
                      <button
                        className={item.session.id === props.currentSessionId ? "active" : ""}
                        data-action-id={`session.switch.${item.session.id}`}
                        data-project-session-row="true"
                        key={item.session.id}
                        type="button"
                        onClick={() => props.onOpenSession(item.session)}
                        title={item.titleDetail}
                      >
                        <i className="project-session-status" data-status={item.session.status} aria-hidden="true" />
                        <span className="project-session-copy">
                          <span>{item.title}</span>
                          <small>{item.meta}</small>
                        </span>
                      </button>
                    ))}
                    {verificationNavItems.length ? (
                      <details className="project-session-archive" open={currentSessionIsVerification}>
                        <summary title={`${verificationNavItems.length} verification check${verificationNavItems.length === 1 ? "" : "s"}`}>
                          <span>Checks</span>
                        </summary>
                        <div className="project-session-archive-list">
                          {visibleVerificationItems.map((item) => (
                            <button
                              className={item.session.id === props.currentSessionId ? "active" : ""}
                              data-action-id={`session.switch.${item.session.id}`}
                              data-project-session-row="verification"
                              key={item.session.id}
                              type="button"
                              onClick={() => props.onOpenSession(item.session)}
                              title={item.titleDetail}
                            >
                              <i className="project-session-status" data-status={item.session.status} aria-hidden="true" />
                              <span className="project-session-copy">
                                <span>{item.title}</span>
                                <small>{item.meta}</small>
                              </span>
                            </button>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
          {projects.length === 0 && !activeWorkspaceProject ? (
            <div className="project-sidebar-empty" data-project-sessions-empty="quiet">
              <span>No projects yet.</span>
              <small>Open a folder to start.</small>
              <button className="sidebar-empty-primary" data-action-id="workspace.open-folder.empty" type="button" onClick={() => void props.onOpenWorkspace()} title="Open folder">
                <SidebarIcon name="folder-open" />
                <span>Open folder</span>
              </button>
            </div>
          ) : null}
        </div>
        <div className="project-sidebar-folders" data-recent-workspaces="app-level" data-sidebar-section="recent-workspaces">
          <div className="project-sidebar-section-label">
            <span>Recent folders</span>
          </div>
          {props.recentWorkspaces.slice(0, 8).map((workspace) => (
            <button
              className="project-folder-row"
              data-action-id={`workspace.recent.${workspace.path}`}
              data-active={String(workspace.path === props.currentWorkspace)}
              key={workspace.path}
              title={workspace.path}
              type="button"
              onClick={() => void props.onOpenWorkspace(workspace.path)}
            >
              <SidebarIcon name="folder" />
              <span>{workspace.name}</span>
              <small>{workspace.source}</small>
            </button>
          ))}
          {props.recentWorkspaces.length === 0 ? <span className="empty">No recent folders.</span> : null}
        </div>
      </div>
      <div className="project-sidebar-footer" data-sidebar-settings="bottom-pinned">
        <button data-action-id="settings.open.sidebar" type="button" onClick={props.onOpenSettings} title="Settings">
          <SidebarIcon name="settings" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

export interface ProjectSessionNavItem {
  session: SessionSummary;
  title: string;
  titleDetail: string;
  meta: string;
  isVerification: boolean;
}

export function projectSessionNavItem(session: SessionSummary): ProjectSessionNavItem {
  const action = readableSessionAction(session.action);
  const isVerification = isVerificationRunText(`${session.prompt} ${session.conversationId ?? ""}`);
  const title = isVerification
    ? compactRunLabel(session.prompt.trim() || action, session.harness, 54)
    : trimText(session.prompt.trim() || "Untitled run", 54);
  const titleDetail = isVerification
    ? compactRunSummary(session.prompt, session.harness, 96) ?? title
    : session.prompt;
  return {
    session,
    title,
    titleDetail,
    meta: isVerification ? compactStatusLabel(session.status) : `${action} / ${session.status}`,
    isVerification,
  };
}

function visibleSessionNavItems(items: ProjectSessionNavItem[], currentSessionId: string | null, limit: number): ProjectSessionNavItem[] {
  const visible = items.slice(0, limit);
  if (!currentSessionId || visible.some((item) => item.session.id === currentSessionId)) return visible;
  const current = items.find((item) => item.session.id === currentSessionId);
  if (!current) return visible;
  return [current, ...items.filter((item) => item.session.id !== currentSessionId).slice(0, Math.max(0, limit - 1))];
}

function sessionHarnessLabel(harness: SessionSummary["harness"]): string {
  if (harness === "codex") return "Codex";
  if (harness === "claude-code") return "Claude";
  if (harness === "ollama") return "Ollama";
  if (harness === "opencode") return "OpenCode";
  return String(harness);
}

function readableSessionAction(action: SessionSummary["action"]): string {
  if (!action) return "run";
  return action.replace(/-/g, " ");
}
