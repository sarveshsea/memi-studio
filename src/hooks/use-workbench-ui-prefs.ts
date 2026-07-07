// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Locally-persisted workbench UI preferences: sidebar collapse/expansion,
// chat rail width (drag + keyboard resize), and pinned chat memory. All
// localStorage-only, no backend coupling — part of the App.tsx
// decomposition (2.4 Phase B). Extracted verbatim, no behavior change.

import { useEffect, useState, type KeyboardEvent, type PointerEvent } from "react";

const PROJECT_SIDEBAR_COLLAPSED_KEY = "memoire.studio.projectSidebarCollapsed";
const PROJECT_SIDEBAR_EXPANDED_KEY = "memoire.studio.expandedProjectIds";
const CHAT_RAIL_WIDTH_KEY = "memoire.studio.chatRailWidthPercent";
const CHAT_MEMORY_PINS_KEY = "memoire.studio.chatMemoryPins";

export const DEFAULT_CHAT_RAIL_WIDTH_PERCENT = 48;
export const MIN_CHAT_RAIL_WIDTH_PERCENT = 36;
export const MAX_CHAT_RAIL_WIDTH_PERCENT = 68;

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

export function useWorkbenchUiPrefs() {
  const [projectSidebarCollapsed, setProjectSidebarCollapsed] = useState(() =>
    readBooleanPreference(PROJECT_SIDEBAR_COLLAPSED_KEY, typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches),
  );
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>(() => readStringArrayPreference(PROJECT_SIDEBAR_EXPANDED_KEY));
  const [chatRailWidthPercent, setChatRailWidthPercent] = useState(() =>
    readNumberPreference(CHAT_RAIL_WIDTH_KEY, DEFAULT_CHAT_RAIL_WIDTH_PERCENT, MIN_CHAT_RAIL_WIDTH_PERCENT, MAX_CHAT_RAIL_WIDTH_PERCENT),
  );
  const [chatMemoryPins, setChatMemoryPins] = useState<string[]>(() => readStringArrayPreference(CHAT_MEMORY_PINS_KEY).slice(0, 6));

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

  function toggleProjectFolder(projectId: string) {
    setExpandedProjectIds((current) =>
      current.includes(projectId) ? current.filter((candidate) => candidate !== projectId) : [projectId, ...current],
    );
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

  return {
    projectSidebarCollapsed,
    setProjectSidebarCollapsed,
    expandedProjectIds,
    setExpandedProjectIds,
    toggleProjectFolder,
    chatRailWidthPercent,
    setChatRailWidthPercent,
    handleChatRailPointerDown,
    handleChatRailResizeKey,
    chatMemoryPins,
    setChatMemoryPins,
  };
}
