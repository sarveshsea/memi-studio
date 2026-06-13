// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Icon glyph atoms for the Studio workbench: the memoire-line icon pack, logo
// marks, and the icon-bearing button atoms (IconButton, ActionChip). Leaf
// module - depends only on React and the workbench-copy icon-name types.

import { type ReactNode } from "react";
import { type WorkbenchActionCopy, type WorkbenchIconName } from "../workbench-copy";

export function MemoireLogoMark() {
  return (
    <svg className="memoire-logo-mark" viewBox="0 0 512 512" width="24" height="24" aria-hidden="true">
      <defs>
        <path
          id="memoire-studio-heart"
          d="M0,80 C -28,64 -95,30 -95,-15 C -95,-52 -68,-78 -36,-78 C -16,-78 -2,-66 0,-45 C 2,-66 16,-78 36,-78 C 68,-78 95,-52 95,-15 C 95,30 28,64 0,80 Z"
        />
        <mask id="memoire-studio-clover-mask" maskUnits="userSpaceOnUse">
          <rect width="512" height="512" fill="var(--svg-mask-off)" />
          <g fill="var(--svg-mask-on)">
            <use href="#memoire-studio-heart" transform="translate(256 256) rotate(0) translate(0 -97)" />
            <use href="#memoire-studio-heart" transform="translate(256 256) rotate(90) translate(0 -97)" />
            <use href="#memoire-studio-heart" transform="translate(256 256) rotate(180) translate(0 -97)" />
            <use href="#memoire-studio-heart" transform="translate(256 256) rotate(270) translate(0 -97)" />
          </g>
          <g fill="var(--svg-mask-off)">
            <rect x="252.5" y="106" width="7" height="142" rx="3.5" transform="rotate(0 256 256)" />
            <rect x="252.5" y="106" width="7" height="142" rx="3.5" transform="rotate(90 256 256)" />
            <rect x="252.5" y="106" width="7" height="142" rx="3.5" transform="rotate(180 256 256)" />
            <rect x="252.5" y="106" width="7" height="142" rx="3.5" transform="rotate(270 256 256)" />
            <rect x="253" y="46" width="6" height="190" rx="3" transform="rotate(45 256 256)" />
            <rect x="253" y="46" width="6" height="190" rx="3" transform="rotate(135 256 256)" />
            <rect x="253" y="46" width="6" height="190" rx="3" transform="rotate(225 256 256)" />
            <rect x="253" y="46" width="6" height="190" rx="3" transform="rotate(315 256 256)" />
          </g>
        </mask>
      </defs>
      <rect width="512" height="512" fill="currentColor" mask="url(#memoire-studio-clover-mask)" />
    </svg>
  );
}

export function FigmaLogoMark() {
  return (
    <svg className="figma-logo-mark" data-figma-logo viewBox="0 0 38 56" width="18" height="24" aria-hidden="true">
      <circle className="figma-logo-red" cx="14" cy="10" r="8" />
      <circle className="figma-logo-coral" cx="24" cy="10" r="8" />
      <circle className="figma-logo-purple" cx="14" cy="28" r="8" />
      <circle className="figma-logo-blue" cx="24" cy="28" r="8" />
      <circle className="figma-logo-green" cx="14" cy="46" r="8" />
    </svg>
  );
}

export function StudioLineIcon({ children }: { children: ReactNode }) {
  return (
    <svg className="sidebar-icon" data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export type StudioControlIconName = WorkbenchIconName;
// Core icon subset: "refresh" | "search" | "pin" | "branch" | "copy" | "context" | "collapse" | "expand" | "figma" | "memory"

export function StudioControlIcon({ name }: { name: StudioControlIconName }) {
  const className = "control-icon";
  if (name === "attach") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" /></svg>;
  if (name === "mode") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M7 12h10M10 17h4" /></svg>;
  if (name === "access") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 11V8a5 5 0 0 1 10 0v3" /><rect x="5" y="11" width="14" height="9" rx="2" /></svg>;
  if (name === "plan") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 4h9l3 3v13H6V4Z" /><path d="M9 11h6M9 15h4" /></svg>;
  if (name === "harness") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 4h8l2 4v7a6 6 0 0 1-12 0V8l2-4Z" /><path d="M9 12h6M10 16h4" /></svg>;
  if (name === "codex") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="5" width="16" height="14" rx="3" /><path d="m8 9 3 3-3 3M13 15h3" /></svg>;
  if (name === "claude") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v16M4 12h16M6.5 6.5l11 11M17.5 6.5l-11 11" /><circle cx="12" cy="12" r="2" /></svg>;
  if (name === "ollama") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 11a5 5 0 0 1 10 0v5a5 5 0 0 1-10 0v-5Z" /><path d="M9 11V8M15 11V8M10 15h4M11 18h2" /></svg>;
  if (name === "opencode") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="5" width="14" height="14" rx="2" /><path d="m10 9-3 3 3 3M14 9l3 3-3 3M13 8l-2 8" /></svg>;
  if (name === "refresh") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M18 10a6 6 0 0 0-10-4L4 10M6 14a6 6 0 0 0 10 4l4-4" /></svg>;
  if (name === "search") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></svg>;
  if (name === "pin") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 4h8l-1 7 4 4v2H5v-2l4-4-1-7Z" /><path d="M12 17v4" /></svg>;
  if (name === "branch") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="7" cy="6" r="2" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /><path d="M7 8v8M9 6h3a5 5 0 0 1 5 5v5" /></svg>;
  if (name === "copy") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M5 15V5h10" /></svg>;
  if (name === "context") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 5h12v14H6V5Z" /><path d="M9 9h6M9 13h6M9 17h3" /></svg>;
  if (name === "figma") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="6" r="3" /><circle cx="15" cy="6" r="3" /><circle cx="9" cy="12" r="3" /><circle cx="15" cy="12" r="3" /><circle cx="9" cy="18" r="3" /></svg>;
  if (name === "memory") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 5h10l2 2v12H6V5Z" /><path d="M9 10h6M9 14h6M9 18h4" /></svg>;
  if (name === "collapse") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m8 14 4-4 4 4" /><path d="M5 19h14" /></svg>;
  if (name === "expand") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m8 10 4 4 4-4" /><path d="M5 5h14" /></svg>;
  if (name === "command") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="5" width="16" height="14" rx="3" /><path d="m9 9 3 3-3 3M14 15h2" /></svg>;
  if (name === "details") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" /><path d="M12 11v5M12 8h.01" /></svg>;
  if (name === "light") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>;
  if (name === "dark") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 15.5A7 7 0 0 1 8.5 6a7.5 7.5 0 1 0 9.5 9.5Z" /></svg>;
  if (name === "settings") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.3 3a8 8 0 0 0-1.7 1L5.1 6l-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .3 0 .7.1 1l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1l.3 3h5l.3-3a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" /></svg>;
  if (name === "run" || name === "play") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7-11-7Z" /></svg>;
  if (name === "stop") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="7" y="7" width="10" height="10" rx="1" /></svg>;
  if (name === "pause") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5v14M15 5v14" /></svg>;
  if (name === "latest") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v13" /><path d="m7 12 5 5 5-5" /><path d="M5 20h14" /></svg>;
  if (name === "workspace") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 7h7l2 2h9v9H3V7Z" /><path d="m8 13 2 2 4-5" /></svg>;
  if (name === "packet") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 4h9l3 3v13H6V4Z" /><path d="M9 9h4M9 13h6M9 17h6" /></svg>;
  if (name === "changes") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5v14M17 5v14" /><path d="M10 8h7M10 12h4M10 16h7" /></svg>;
  if (name === "system") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="5" width="6" height="6" rx="1" /><rect x="13" y="5" width="6" height="6" rx="1" /><rect x="5" y="13" width="6" height="6" rx="1" /><rect x="13" y="13" width="6" height="6" rx="1" /></svg>;
  if (name === "ia") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5h6v4H5V5ZM13 5h6v4h-6V5ZM5 15h6v4H5v-4ZM13 15h6v4h-6v-4Z" /><path d="M8 9v3h8V9M8 12v3M16 12v3" /></svg>;
  if (name === "research") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="5" /><path d="m14 14 5 5" /><path d="M8 10h4M10 8v4" /></svg>;
  if (name === "board") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h3v3H8zM13 9h3v3h-3zM8 14h8" /></svg>;
  if (name === "changelog") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4h10v16H7V4Z" /><path d="M10 8h4M10 12h4M10 16h3" /></svg>;
  if (name === "automation" || name === "history") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></svg>;
  if (name === "trash") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 7h14M9 7V5h6v2M8 10v9M12 10v9M16 10v9" /></svg>;
  if (name === "edit") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 18l1-4 9-9 4 4-9 9-4 1Z" /><path d="m14 6 4 4" /></svg>;
  if (name === "download") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v10" /><path d="m8 10 4 4 4-4" /><path d="M5 19h14" /></svg>;
  if (name === "export") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 16V4" /><path d="m8 8 4-4 4 4" /><path d="M5 12v7h14v-7" /></svg>;
  if (name === "review" || name === "check") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" /><path d="m8 12 3 3 5-6" /></svg>;
  if (name === "warning") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4 3 20h18L12 4Z" /><path d="M12 9v5M12 17h.01" /></svg>;
  if (name === "open") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 6h10v10" /><path d="m18 6-9 9" /><path d="M6 10v8h8" /></svg>;
  if (name === "close") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 7l10 10M17 7 7 17" /></svg>;
  if (name === "save") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 4h12l2 2v14H5V4Z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></svg>;
  if (name === "palette") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="5" width="16" height="14" rx="3" /><path d="m9 9 3 3-3 3M14 15h2" /></svg>;
  if (name === "sync") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M18 10a6 6 0 0 0-10-4M6 14a6 6 0 0 0 10 4" /></svg>;
  if (name === "filter") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
  if (name === "receipt") return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4h10v16l-2-1-2 1-2-1-2 1-2-1V4Z" /><path d="M10 8h4M10 12h4M10 16h3" /></svg>;
  return <svg className={className} data-icon-pack="memoire-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16" /><path d="m15 9 3 3-3 3" /></svg>;
}

export function IconButton(props: {
  actionId: string;
  ariaLabel: string;
  title?: string;
  icon: StudioControlIconName;
  className?: string;
  disabled?: boolean;
  pressed?: boolean;
  children?: ReactNode;
  data?: Record<string, string | number | boolean | undefined>;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}) {
  const tooltip = props.title ?? props.ariaLabel;
  return (
    <button
      aria-label={props.ariaLabel}
      aria-pressed={props.pressed}
      className={["icon-button", props.className].filter(Boolean).join(" ")}
      data-action-id={props.actionId}
      data-icon-tooltip={tooltip}
      disabled={props.disabled}
      title={tooltip}
      type={props.type ?? "button"}
      onClick={props.onClick}
      {...props.data}
    >
      <StudioControlIcon name={props.icon} />
      {props.children}
    </button>
  );
}

export function ActionChip(props: {
  action: WorkbenchActionCopy | { id: string; label: string; shortLabel?: string; icon: StudioControlIconName; ariaLabel?: string; title?: string; iconOnly?: boolean };
  active?: boolean;
  className?: string;
  disabled?: boolean;
  pressed?: boolean;
  data?: Record<string, string>;
  onClick?: () => void;
}) {
  const action = props.action;
  const label = action.shortLabel ?? action.label;
  const ariaLabel = action.ariaLabel ?? action.label;
  const tooltip = action.title ?? action.label;
  const content = action.iconOnly ? null : <span>{label}</span>;
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={props.pressed ?? props.active}
      className={["action-chip", props.active ? "active" : "", props.className].filter(Boolean).join(" ")}
      data-action-id={action.id}
      data-icon-tooltip={action.iconOnly ? tooltip : undefined}
      disabled={props.disabled}
      title={tooltip}
      type="button"
      onClick={props.onClick}
      {...props.data}
    >
      <StudioControlIcon name={action.icon} />
      {content}
    </button>
  );
}

export function SidebarIcon({ name }: { name: "new-chat" | "search" | "plugins" | "changelog" | "figma" | "clock" | "folder" | "folder-open" | "chevron-right" | "chevron-down" | "settings" | "panel-open" | "panel-close" }) {
  if (name === "new-chat") return <StudioLineIcon><path d="M12 5v14M5 12h14" /></StudioLineIcon>;
  if (name === "search") return <StudioLineIcon><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></StudioLineIcon>;
  if (name === "plugins") return <StudioLineIcon><path d="M8 4h8v5h4v8h-5v3H7v-5H4V7h4V4Z" /></StudioLineIcon>;
  if (name === "changelog") return <StudioLineIcon><path d="M7 4h10v16H7V4Z" /><path d="M10 8h4M10 12h4M10 16h3" /></StudioLineIcon>;
  if (name === "figma") return <StudioLineIcon><circle cx="9" cy="6" r="3" /><circle cx="15" cy="6" r="3" /><circle cx="9" cy="12" r="3" /><circle cx="15" cy="12" r="3" /><circle cx="9" cy="18" r="3" /></StudioLineIcon>;
  if (name === "clock") return <StudioLineIcon><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></StudioLineIcon>;
  if (name === "folder") return <StudioLineIcon><path d="M3 7h7l2 2h9v9H3V7Z" /></StudioLineIcon>;
  if (name === "folder-open") return <StudioLineIcon><path d="M3 8h7l2 2h9l-2 8H3V8Z" /><path d="M3 8v10" /></StudioLineIcon>;
  if (name === "chevron-right") return <StudioLineIcon><path d="m9 6 6 6-6 6" /></StudioLineIcon>;
  if (name === "chevron-down") return <StudioLineIcon><path d="m6 9 6 6 6-6" /></StudioLineIcon>;
  if (name === "settings") return <StudioLineIcon><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.3 3a8 8 0 0 0-1.7 1L5.1 6l-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .3 0 .7.1 1l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1l.3 3h5l.3-3a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" /></StudioLineIcon>;
  if (name === "panel-open") return <StudioLineIcon><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M9 5v14M14 9l3 3-3 3" /></StudioLineIcon>;
  return <StudioLineIcon><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M9 5v14M17 9l-3 3 3 3" /></StudioLineIcon>;
}
