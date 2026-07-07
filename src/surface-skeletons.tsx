// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Loading skeletons used as Suspense fallbacks for the lazily-loaded right-pane
// surfaces (mermaid board, information architecture). They mirror each surface's
// grid layout so the pane does not jump when the real surface resolves. Pure
// structural placeholders with no text content, and the shimmer respects
// prefers-reduced-motion (see .surface-skeleton in styles.css).

const SKELETON_ROW_KEYS = ["head", "brief", "toolbar"] as const;

export function MermaidBoardSurfaceSkeleton() {
  return (
    <section
      className="surface-skeleton"
      data-skeleton="mermaid-board"
      data-mermaid-board="pm-brainstorm-loading"
      aria-busy="true"
    >
      {SKELETON_ROW_KEYS.map((key) => (
        <div key={key} className={`skeleton-block ${key === "head" ? "skeleton-row" : "skeleton-bar"}`} aria-hidden="true" />
      ))}
      <div className="skeleton-block skeleton-canvas" aria-hidden="true" />
    </section>
  );
}

export function IASurfaceSkeleton() {
  return (
    <section
      className="surface-skeleton"
      data-skeleton="ia"
      data-information-architecture="mermaid-jam"
      aria-busy="true"
    >
      {SKELETON_ROW_KEYS.map((key) => (
        <div key={key} className={`skeleton-block ${key === "head" ? "skeleton-row" : "skeleton-bar"}`} aria-hidden="true" />
      ))}
      <div className="skeleton-block skeleton-canvas" aria-hidden="true" />
    </section>
  );
}
