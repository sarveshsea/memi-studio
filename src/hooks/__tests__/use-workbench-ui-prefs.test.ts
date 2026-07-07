// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { act, renderHook } from "@testing-library/react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CHAT_RAIL_WIDTH_PERCENT,
  MAX_CHAT_RAIL_WIDTH_PERCENT,
  MIN_CHAT_RAIL_WIDTH_PERCENT,
  clampNumber,
  useWorkbenchUiPrefs,
} from "../use-workbench-ui-prefs";

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function makeKeyEvent(key: string): ReactKeyboardEvent<HTMLDivElement> {
  return { key, preventDefault: vi.fn() } as unknown as ReactKeyboardEvent<HTMLDivElement>;
}

beforeEach(() => {
  window.localStorage.clear();
  stubMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("clampNumber", () => {
  it("clamps below the minimum up to the minimum", () => {
    expect(clampNumber(10, 36, 68)).toBe(36);
  });
  it("clamps above the maximum down to the maximum", () => {
    expect(clampNumber(100, 36, 68)).toBe(68);
  });
  it("passes through values already in range", () => {
    expect(clampNumber(50, 36, 68)).toBe(50);
  });
});

describe("useWorkbenchUiPrefs — projectSidebarCollapsed", () => {
  it("defaults to false when no stored preference and the narrow-viewport media query does not match", () => {
    const { result } = renderHook(() => useWorkbenchUiPrefs());
    expect(result.current.projectSidebarCollapsed).toBe(false);
  });

  it("defaults to true when the narrow-viewport media query matches and nothing is stored", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useWorkbenchUiPrefs());
    expect(result.current.projectSidebarCollapsed).toBe(true);
  });

  it("a stored preference overrides the media-query default", () => {
    stubMatchMedia(true);
    window.localStorage.setItem("memoire.studio.projectSidebarCollapsed", JSON.stringify(false));
    const { result } = renderHook(() => useWorkbenchUiPrefs());
    expect(result.current.projectSidebarCollapsed).toBe(false);
  });

  it("toggling persists to localStorage, and a fresh hook instance picks up the persisted value", () => {
    const { result, unmount } = renderHook(() => useWorkbenchUiPrefs());
    expect(result.current.projectSidebarCollapsed).toBe(false);
    act(() => {
      result.current.setProjectSidebarCollapsed(true);
    });
    expect(result.current.projectSidebarCollapsed).toBe(true);
    expect(window.localStorage.getItem("memoire.studio.projectSidebarCollapsed")).toBe("true");
    unmount();

    const { result: second } = renderHook(() => useWorkbenchUiPrefs());
    expect(second.current.projectSidebarCollapsed).toBe(true);
  });
});

describe("useWorkbenchUiPrefs — expandedProjectIds / toggleProjectFolder", () => {
  it("starts empty with nothing stored", () => {
    const { result } = renderHook(() => useWorkbenchUiPrefs());
    expect(result.current.expandedProjectIds).toEqual([]);
  });

  it("toggleProjectFolder adds an id, prepending it, and persists", () => {
    const { result } = renderHook(() => useWorkbenchUiPrefs());
    act(() => {
      result.current.toggleProjectFolder("project-123");
    });
    expect(result.current.expandedProjectIds).toEqual(["project-123"]);
    expect(JSON.parse(window.localStorage.getItem("memoire.studio.expandedProjectIds") ?? "[]")).toEqual(["project-123"]);
  });

  it("toggleProjectFolder removes an id already present", () => {
    const { result } = renderHook(() => useWorkbenchUiPrefs());
    act(() => {
      result.current.toggleProjectFolder("project-123");
      result.current.toggleProjectFolder("project-456");
    });
    expect(result.current.expandedProjectIds).toEqual(["project-456", "project-123"]);
    act(() => {
      result.current.toggleProjectFolder("project-123");
    });
    expect(result.current.expandedProjectIds).toEqual(["project-456"]);
  });
});

describe("useWorkbenchUiPrefs — chatRailWidthPercent", () => {
  it("defaults to DEFAULT_CHAT_RAIL_WIDTH_PERCENT with nothing stored", () => {
    const { result } = renderHook(() => useWorkbenchUiPrefs());
    expect(result.current.chatRailWidthPercent).toBe(DEFAULT_CHAT_RAIL_WIDTH_PERCENT);
  });

  it("clamps an out-of-range stored value on read", () => {
    window.localStorage.setItem("memoire.studio.chatRailWidthPercent", JSON.stringify(999));
    const { result } = renderHook(() => useWorkbenchUiPrefs());
    expect(result.current.chatRailWidthPercent).toBe(MAX_CHAT_RAIL_WIDTH_PERCENT);
  });

  it("falls back to the default for a corrupt stored value", () => {
    window.localStorage.setItem("memoire.studio.chatRailWidthPercent", "not json");
    const { result } = renderHook(() => useWorkbenchUiPrefs());
    expect(result.current.chatRailWidthPercent).toBe(DEFAULT_CHAT_RAIL_WIDTH_PERCENT);
  });

  describe("handleChatRailResizeKey", () => {
    it("ArrowRight increases width by 2, clamped to the max", () => {
      const { result } = renderHook(() => useWorkbenchUiPrefs());
      act(() => {
        result.current.setChatRailWidthPercent(MAX_CHAT_RAIL_WIDTH_PERCENT - 1);
      });
      act(() => {
        result.current.handleChatRailResizeKey(makeKeyEvent("ArrowRight"));
      });
      expect(result.current.chatRailWidthPercent).toBe(MAX_CHAT_RAIL_WIDTH_PERCENT);
    });

    it("ArrowLeft decreases width by 2, clamped to the min", () => {
      const { result } = renderHook(() => useWorkbenchUiPrefs());
      act(() => {
        result.current.setChatRailWidthPercent(MIN_CHAT_RAIL_WIDTH_PERCENT + 1);
      });
      act(() => {
        result.current.handleChatRailResizeKey(makeKeyEvent("ArrowLeft"));
      });
      expect(result.current.chatRailWidthPercent).toBe(MIN_CHAT_RAIL_WIDTH_PERCENT);
    });

    it("Home jumps to the minimum, End jumps to the maximum", () => {
      const { result } = renderHook(() => useWorkbenchUiPrefs());
      act(() => {
        result.current.handleChatRailResizeKey(makeKeyEvent("Home"));
      });
      expect(result.current.chatRailWidthPercent).toBe(MIN_CHAT_RAIL_WIDTH_PERCENT);
      act(() => {
        result.current.handleChatRailResizeKey(makeKeyEvent("End"));
      });
      expect(result.current.chatRailWidthPercent).toBe(MAX_CHAT_RAIL_WIDTH_PERCENT);
    });

    it("Enter resets to the default width", () => {
      const { result } = renderHook(() => useWorkbenchUiPrefs());
      act(() => {
        result.current.handleChatRailResizeKey(makeKeyEvent("End"));
      });
      expect(result.current.chatRailWidthPercent).toBe(MAX_CHAT_RAIL_WIDTH_PERCENT);
      act(() => {
        result.current.handleChatRailResizeKey(makeKeyEvent("Enter"));
      });
      expect(result.current.chatRailWidthPercent).toBe(DEFAULT_CHAT_RAIL_WIDTH_PERCENT);
    });

    it("ignores unrelated keys", () => {
      const { result } = renderHook(() => useWorkbenchUiPrefs());
      act(() => {
        result.current.handleChatRailResizeKey(makeKeyEvent("Tab"));
      });
      expect(result.current.chatRailWidthPercent).toBe(DEFAULT_CHAT_RAIL_WIDTH_PERCENT);
    });
  });
});

describe("useWorkbenchUiPrefs — chatMemoryPins", () => {
  it("starts empty with nothing stored", () => {
    const { result } = renderHook(() => useWorkbenchUiPrefs());
    expect(result.current.chatMemoryPins).toEqual([]);
  });

  it("caps to 6 entries read from storage", () => {
    window.localStorage.setItem("memoire.studio.chatMemoryPins", JSON.stringify(["a", "b", "c", "d", "e", "f", "g", "h"]));
    const { result } = renderHook(() => useWorkbenchUiPrefs());
    expect(result.current.chatMemoryPins).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("caps to 6 entries on write, and persists", () => {
    const { result } = renderHook(() => useWorkbenchUiPrefs());
    act(() => {
      result.current.setChatMemoryPins(["a", "b", "c", "d", "e", "f", "g"]);
    });
    expect(JSON.parse(window.localStorage.getItem("memoire.studio.chatMemoryPins") ?? "[]")).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
});
