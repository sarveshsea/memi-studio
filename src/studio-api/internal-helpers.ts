// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Internal runtime helpers shared across studio-api modules. These are NOT
// re-exported by the studio-api barrel and are not part of the public surface;
// they exist only so the domain modules can share fetch, token, and
// normalization plumbing without duplicating it.

import { invoke } from "@tauri-apps/api/core";
import { MEMOIRE_PACKAGE_NAME, MEMOIRE_PACKAGE_URL, MEMOIRE_PACKAGE_VERSION } from "../runtime/package-info";
import type {
  Harness,
  StudioEvent,
  StudioReferenceTraceItem,
  StudioRuntimeStatus,
  StudioStatus,
  StudioTraceSnapshot,
} from "./shared-types";

const runtimeBase = import.meta.env.DEV ? "" : import.meta.env.VITE_MEMOIRE_STUDIO_RUNTIME
  || "http://127.0.0.1:8765";
let runtimeApiToken: string | null | undefined;

// runtimeApiToken is module-private mutable state. Imported bindings are
// read-only, so modules that need to reset/replace the token (core-runtime's
// restart/open/create workspace flows) go through this setter.
export function setRuntimeApiToken(value: string | null | undefined): void {
  runtimeApiToken = value;
}

export function hasTauri(): boolean {
  return "__TAURI_INTERNALS__" in window && !window.location.protocol.startsWith("http");
}

async function getRuntimeApiToken(): Promise<string | null> {
  if (runtimeApiToken !== undefined) return runtimeApiToken;
  if (!hasTauri()) {
    runtimeApiToken = null;
    return runtimeApiToken;
  }
  const status = await invoke<StudioRuntimeStatus>("studio_runtime_status").catch(() => null);
  runtimeApiToken = status?.apiToken ?? null;
  return runtimeApiToken;
}

export async function fetchRuntimeStatusWithoutToken(): Promise<StudioStatus | null> {
  try {
    const response = await fetch(`${runtimeBase}/api/status`);
    if (!response.ok) return null;
    return response.json() as Promise<StudioStatus>;
  } catch {
    return null;
  }
}

export function normalizeStudioEvent(event: StudioEvent): StudioEvent {
  if (event.type !== "reference_trace") return event;
  if (!isPlainRecord(event.data) || !Array.isArray(event.data.references)) return event;
  return {
    ...event,
    data: {
      ...event.data,
      references: event.data.references.map(normalizeReferenceTraceItem),
    },
  };
}

export function normalizeStudioTraceSnapshot(trace: StudioTraceSnapshot): StudioTraceSnapshot {
  return {
    ...trace,
    references: trace.references.map((reference) => normalizeReferenceTraceItem(reference) as StudioReferenceTraceItem),
  };
}

function normalizeReferenceTraceItem(value: unknown): unknown {
  if (!isPlainRecord(value)) return value;
  const packageName = stringField(value, "packageName");
  const packageVersion = stringField(value, "packageVersion");
  const label = stringField(value, "label") ?? "";
  const id = stringField(value, "id") ?? "";
  const kind = stringField(value, "kind");
  const legacyPackageName = packageName === "@sarveshsea/memoire" || label.includes("@sarveshsea/memoire");
  const legacyVersion = Boolean(packageVersion?.startsWith("0.") || /@0\.\d+\.\d+/.test(label));
  const memoirePackage = kind === "package"
    && (legacyPackageName || packageName === MEMOIRE_PACKAGE_NAME || id === `package:${MEMOIRE_PACKAGE_NAME}`);
  if (!memoirePackage || (!legacyPackageName && !legacyVersion)) return value;
  return {
    ...value,
    id: `package:${MEMOIRE_PACKAGE_NAME}`,
    label: `${MEMOIRE_PACKAGE_NAME}@${MEMOIRE_PACKAGE_VERSION}`,
    summary: "Current public Mémoire CLI package for Studio harness metadata. Runtime assets are tracked separately by the Studio runtime release tag.",
    packageName: MEMOIRE_PACKAGE_NAME,
    packageVersion: MEMOIRE_PACKAGE_VERSION,
    url: MEMOIRE_PACKAGE_URL,
    sourcePackageName: packageName ?? null,
    sourcePackageVersion: packageVersion ?? null,
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: Record<string, unknown>, key: string): string | null {
  const field = value[key];
  return typeof field === "string" ? field : null;
}

export function normalizeHarnessStatus(harness: Harness): Harness {
  return {
    ...harness,
    authMessage: readableHarnessAuthMessage(harness.authMessage),
  };
}

function readableHarnessAuthMessage(message: string | undefined): string | undefined {
  if (!message) return message;
  const trimmed = message.trim();
  if (!trimmed.startsWith("{")) return message;
  try {
    const parsed = JSON.parse(trimmed) as {
      loggedIn?: boolean;
      authMethod?: string;
      apiProvider?: string;
      subscriptionType?: string;
    };
    if (parsed.loggedIn) {
      const method = parsed.authMethod ? ` via ${parsed.authMethod}` : "";
      const plan = parsed.subscriptionType ? ` (${parsed.subscriptionType})` : "";
      return `Signed in${method}${plan}`;
    }
  } catch {
    return "Signed in";
  }
  return "Ready";
}

export async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  let response = await fetchWithRuntimeToken(path, init);
  if (response.status === 401 && hasTauri()) {
    runtimeApiToken = undefined;
    response = await fetchWithRuntimeToken(path, init);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(payload.error ?? response.statusText);
  }
  return response.json() as Promise<T>;
}

export async function fetchWithRuntimeToken(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const apiToken = await getRuntimeApiToken();
  if (apiToken) headers.set("x-memoire-studio-token", apiToken);
  return fetch(`${runtimeBase}${path}`, { ...init, headers });
}

/**
 * Build an SSE URL with the runtime API token attached as a query param.
 * The browser EventSource API cannot attach custom headers, so the runtime
 * accepts `_token=<token>` on safe-method GETs only. The token is the
 * per-launch random value generated by the Tauri shell — never long-lived.
 */
export function buildSseUrl(path: string): string {
  const token = runtimeApiToken;
  if (!token) return `${runtimeBase}${path}`;
  const separator = path.includes("?") ? "&" : "?";
  return `${runtimeBase}${path}${separator}_token=${encodeURIComponent(token)}`;
}
