// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// First-run welcome surface — replaces the "dead workbench, disabled run
// button, no explanation" experience shown before a workspace is open.
// Recent-workspace row conventions (data-action-id, title, name/source)
// mirror ProjectSidebar's existing recent-folders list for consistency.

import type { StudioRecentWorkspace } from "../studio-api";

export interface WelcomeSurfaceProps {
  recentWorkspaces: StudioRecentWorkspace[];
  onOpenFolder: () => void;
  onOpenRecent: (path: string) => void;
  onCreateWorkspace: () => void;
}

export function WelcomeSurface(props: WelcomeSurfaceProps) {
  const recent = props.recentWorkspaces.slice(0, 8);
  return (
    <section className="welcome-surface" data-welcome-surface="first-run" aria-label="Get started">
      <div className="welcome-surface-hero">
        <h2>Open a project to get started</h2>
        <p>memi audits, understands, and helps you change a real shadcn/Tailwind product. Point it at a project folder to begin.</p>
        <div className="welcome-surface-actions">
          <button data-action-id="welcome.open-folder" type="button" className="primary" onClick={props.onOpenFolder}>
            Open folder
          </button>
          <button data-action-id="welcome.create-workspace" type="button" onClick={props.onCreateWorkspace}>
            Create workspace
          </button>
        </div>
      </div>
      {recent.length > 0 ? (
        <div className="welcome-surface-recent" data-recent-workspaces="welcome-surface">
          <div className="welcome-surface-recent-label">
            <span>Recent folders</span>
          </div>
          {recent.map((workspace) => (
            <button
              className="welcome-surface-recent-row"
              data-action-id={`welcome.recent.${workspace.path}`}
              key={workspace.path}
              title={workspace.path}
              type="button"
              onClick={() => props.onOpenRecent(workspace.path)}
            >
              <span>{workspace.name}</span>
              <small>{workspace.source}</small>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
