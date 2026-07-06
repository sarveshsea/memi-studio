// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Workspace identity state: the current StudioStatus (project root, config,
// harnesses, runtime, security, metrics — the root data model refresh()
// re-fetches wholesale), workspace permissions, and recent workspaces.
// Part of the App.tsx decomposition (2.4 Phase B).
//
// Deliberately does NOT include handleOpenWorkspace/handleCreateWorkspace/
// changeWorkspace or refresh() itself: those orchestrate across many other
// domains (resetWorkspaceScopedState alone touches 12 pieces of state in
// session/memory/context/knowledge/mermaid-board) and stay in App.tsx.
// refresh() calls the setters this hook returns directly, the same
// composition pattern already used by useRuntimeLifecycle.

import { useState } from "react";
import type {
  StudioRecentWorkspace,
  StudioStatus,
  StudioWorkspacePermissions,
} from "../studio-api";

export function useWorkspaceState() {
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [recentWorkspaces, setRecentWorkspaces] = useState<StudioRecentWorkspace[]>([]);
  const [workspacePermissions, setWorkspacePermissions] = useState<StudioWorkspacePermissions | null>(null);
  const hasWorkspace = Boolean((status?.projectRoot ?? workspacePermissions?.currentWorkspace ?? "").trim());

  return {
    status,
    setStatus,
    recentWorkspaces,
    setRecentWorkspaces,
    workspacePermissions,
    setWorkspacePermissions,
    hasWorkspace,
  };
}
