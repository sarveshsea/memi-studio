// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC
//
// auto-updater.ts — wires the Tauri updater plugin into the app launch path.
//
// On launch:
//   1. Quietly checks the configured endpoint (latest.json on the
//      sarveshsea/memi-studio "latest" release).
//   2. If a new version is available, downloads + verifies the signature
//      against the embedded minisign public key, then prompts the user.
//   3. On accept, applies the update and relaunches.
//
// The user-facing dialog ships with the plugin (set `dialog: true` in
// tauri.conf.json plugins.updater). For a fully custom UX, swap the
// dialog flag to false and render your own modal off the
// onUpdateAvailable callback below.
//
// The check is best-effort: any error is swallowed and surfaced as a
// console warning. Network failures, malformed manifests, signature
// mismatches all degrade gracefully — the user still gets a working app.

import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface AutoUpdateOptions {
  /** Skip the check entirely. Useful for dev builds. */
  readonly skip?: boolean;
  /** Called with the Update once one is detected and accepted. */
  readonly onUpdateAvailable?: (update: Update) => void;
  /** Called when no update is available or the check failed silently. */
  readonly onUpToDate?: () => void;
}

const SKIP_ENV = (() => {
  if (typeof process === "undefined") return false;
  const env = process.env ?? {};
  return env["MEMI_STUDIO_SKIP_UPDATE_CHECK"] === "1"
      || env["NODE_ENV"] === "development";
})();

export async function checkForUpdates(opts: AutoUpdateOptions = {}): Promise<void> {
  if (opts.skip || SKIP_ENV) {
    opts.onUpToDate?.();
    return;
  }

  try {
    const update = await check();
    if (!update) {
      opts.onUpToDate?.();
      return;
    }

    opts.onUpdateAvailable?.(update);

    // The plugin's built-in dialog (configured via plugins.updater.dialog
    // in tauri.conf.json) handles user consent. downloadAndInstall()
    // resolves only after the user accepts. If they decline, the call
    // throws and we swallow it.
    await update.downloadAndInstall();
    await relaunch();
  } catch (error) {
    // Swallow update errors — never break app launch over a failed update check.
    console.warn("[auto-updater] update check failed:", error);
    opts.onUpToDate?.();
  }
}
