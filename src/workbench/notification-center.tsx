// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Notification center: a transient toast stack for "toast"-severity
// failures (started from an explicit user action) plus a persisted,
// dismissible list behind a bell button — including "background"-severity
// entries from retry loops that would otherwise fail silently. No prior
// public surface to preserve; this is new in 2.4 Phase A.

import { useEffect, useState } from "react";
import { dismissNotification, useNotifications, type StudioNotification } from "../notification-center";
import type { StudioErrorKind } from "../studio-api/errors";
import { StudioControlIcon } from "./icons";

const KIND_LABEL: Record<StudioErrorKind, string> = {
  "runtime-offline": "Runtime offline",
  "auth-required": "Needs login",
  "workspace-missing": "Workspace missing",
  "bridge-timeout": "Bridge timeout",
  "engine-error": "Error",
};

const TOAST_AUTO_DISMISS_MS = 6000;
const MAX_VISIBLE_TOASTS = 3;

function NotificationRow(props: { notification: StudioNotification; onDismiss: () => void }) {
  const { notification } = props;
  return (
    <div className="notification-row" data-notification-kind={notification.kind} data-notification-severity={notification.severity}>
      <StudioControlIcon name="warning" />
      <div className="notification-row-body">
        <strong>{KIND_LABEL[notification.kind]}</strong>
        <span title={notification.message}>{notification.message}</span>
      </div>
      <button
        aria-label="Dismiss"
        className="notification-row-dismiss"
        data-action-id={`notification.dismiss.${notification.id}`}
        onClick={props.onDismiss}
        type="button"
      >
        &times;
      </button>
    </div>
  );
}

export function NotificationCenter() {
  const notifications = useNotifications();
  const [open, setOpen] = useState(false);
  const [dismissedToastIds, setDismissedToastIds] = useState<Set<string>>(new Set());

  const toasts = notifications
    .filter((notification) => notification.severity === "toast" && !dismissedToastIds.has(notification.id))
    .slice(-MAX_VISIBLE_TOASTS);

  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setDismissedToastIds((current) => new Set(current).add(toast.id));
      }, TOAST_AUTO_DISMISS_MS),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toasts.map((toast) => toast.id).join(",")]);

  return (
    <>
      <div className="notification-toast-stack" data-notification-toast-stack aria-live="polite">
        {toasts.map((toast) => (
          <NotificationRow
            key={toast.id}
            notification={toast}
            onDismiss={() => setDismissedToastIds((current) => new Set(current).add(toast.id))}
          />
        ))}
      </div>
      <div className="notification-center" data-notification-center={open ? "open" : "closed"}>
        <button
          aria-label={`Notifications${notifications.length ? ` (${notifications.length})` : ""}`}
          className="topbar-icon-button"
          data-action-id="notifications.toggle"
          data-icon-tooltip="Notifications"
          title="Notifications"
          type="button"
          onClick={() => setOpen((current) => !current)}
        >
          <StudioControlIcon name="warning" />
          {notifications.length > 0 ? <span className="notification-center-badge">{notifications.length}</span> : null}
        </button>
        {open ? (
          <div className="notification-center-panel" data-notification-center-panel role="dialog" aria-label="Notifications">
            {notifications.length === 0 ? (
              <p className="notification-center-empty">No notifications.</p>
            ) : (
              [...notifications].reverse().map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onDismiss={() => dismissNotification(notification.id)}
                />
              ))
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
