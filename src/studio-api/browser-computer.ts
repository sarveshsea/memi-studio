// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { fetchJSON } from "./internal-helpers";
import type {
  StudioBrowserSession,
  StudioBrowserStatus,
  StudioComputerAction,
  StudioComputerActionResult,
  StudioComputerStatus,
} from "./shared-types";

export async function getBrowserStatus(): Promise<StudioBrowserStatus> {
  return fetchJSON<StudioBrowserStatus>("/api/browser/status");
}

export async function getComputerStatus(): Promise<StudioComputerStatus> {
  return fetchJSON<StudioComputerStatus>("/api/computer/status");
}

export async function openComputerTarget(input: { target: "app" | "url" | "file" | "figma" | "browser"; value: string; approved?: boolean }): Promise<StudioComputerActionResult> {
  const payload = await fetchJSON<{ result: StudioComputerActionResult }>("/api/computer/open", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return payload.result;
}

export async function callComputerAction(input: { action: StudioComputerAction; value?: string; app?: string; url?: string; path?: string; approved?: boolean; sessionId?: string | null }): Promise<StudioComputerActionResult> {
  const payload = await fetchJSON<{ result: StudioComputerActionResult }>("/api/computer/action", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return payload.result;
}

export async function createBrowserSession(url?: string): Promise<StudioBrowserSession> {
  const payload = await fetchJSON<{ session: StudioBrowserSession }>("/api/browser/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return payload.session;
}
