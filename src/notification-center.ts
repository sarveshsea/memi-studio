// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Module-level notification store — no new state-management dependency.
// Any of App.tsx's many catch sites can call notify(); useNotifications()
// (built on React 19's native useSyncExternalStore) lets the notification
// center component subscribe without prop-drilling a giant callback through
// the render tree. "background" severity lands in the persisted list only
// (preserves today's non-intrusive retry-loop behavior, just made
// debuggable); "toast" also surfaces a transient, auto-dismissing banner
// for failures that started from an explicit user action.

import { useSyncExternalStore } from "react";
import type { StudioError } from "./studio-api/errors";

export type NotificationSeverity = "toast" | "background";

export interface StudioNotification extends StudioError {
  id: string;
  severity: NotificationSeverity;
}

const MAX_NOTIFICATIONS = 100;

let notifications: StudioNotification[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function notify(error: StudioError, options: { severity?: NotificationSeverity } = {}): string {
  const id = `notification-${(nextId += 1)}`;
  notifications = [...notifications, { ...error, id, severity: options.severity ?? "toast" }].slice(-MAX_NOTIFICATIONS);
  emit();
  return id;
}

export function dismissNotification(id: string): void {
  notifications = notifications.filter((notification) => notification.id !== id);
  emit();
}

export function clearNotifications(): void {
  notifications = [];
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StudioNotification[] {
  return notifications;
}

export function useNotifications(): StudioNotification[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
