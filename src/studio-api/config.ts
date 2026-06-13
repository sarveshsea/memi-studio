// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { fetchJSON } from "./internal-helpers";
import type { StudioConfig } from "./shared-types";

export async function getConfig(): Promise<StudioConfig> {
  const payload = await fetchJSON<{ config: StudioConfig }>("/api/config");
  return payload.config;
}

export async function saveConfig(config: StudioConfig): Promise<StudioConfig> {
  const payload = await fetchJSON<{ config: StudioConfig }>("/api/config", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(config),
  });
  return payload.config;
}
