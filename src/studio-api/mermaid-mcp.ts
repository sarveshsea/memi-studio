// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { fetchJSON } from "./internal-helpers";

export async function openMermaidJamIntegration(target: "community" | "repository" | "local-manifest" = "community"): Promise<unknown> {
  return fetchJSON("/api/integrations/mermaid-jam/open", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target }),
  });
}
