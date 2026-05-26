// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import {
  mergeDesignArtifacts,
  selectDesignArtifactsForSession,
  selectReviewPacketForSession,
} from "../src/workbench-context.js";
import { composerHarnesses, composerHarnessShortLabel, composerHarnessTier, primaryHarnesses } from "../src/studio-workbench.js";
import type { Harness, HarnessId } from "../src/studio-api.js";

type TestEvent = {
  id: string;
  sessionId: string;
  type: string;
  timestamp: string;
  message: string;
};

type TestPacket = {
  id: string;
  sessionId: string | null;
};

type TestArtifact = {
  id: string;
  sourceSessionId: string | null;
  sourceEventIds: string[];
  sourceRefs: Array<{ eventIds: string[] }>;
  sections: Array<{ eventIds: string[]; sourceRefs: Array<{ eventIds: string[] }> }>;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function harness(id: HarnessId, label: string = id): Harness {
  return {
    id,
    label,
    kind: "external-cli",
    provider: id,
    command: id,
    description: label,
    enabled: true,
    enabledByDefault: true,
    installed: true,
    capabilities: ["raw"],
    commandTemplates: { raw: [id] },
    envPolicy: "provider",
    workspacePolicy: "workspace-required",
    supportsStreaming: true,
    supportsCancel: true,
    outputParser: "stdio",
  } as Harness;
}

const timestamp = "2026-05-26T00:00:00.000Z";

function event(id: string, sessionId: string): TestEvent {
  return {
    id,
    sessionId,
    type: "artifact",
    timestamp,
    message: `event ${id}`,
  };
}

function packet(id: string, sessionId: string | null): TestPacket {
  return {
    id,
    sessionId,
  };
}

function artifact(input: {
  id: string;
  sourceSessionId: string | null;
  sourceEventIds?: string[];
}): TestArtifact {
  return {
    id: input.id,
    sourceSessionId: input.sourceSessionId,
    sourceEventIds: input.sourceEventIds ?? [],
    sourceRefs: [],
    sections: [],
  };
}

const sessionAEvent = event("event-a", "session-a");
const sessionBEvent = event("event-b", "session-b");
const sessionAArtifact = artifact({ id: "artifact-a", sourceSessionId: "session-a", sourceEventIds: ["event-a"] });
const sessionBArtifact = artifact({ id: "artifact-b", sourceSessionId: "session-b", sourceEventIds: ["event-b"] });
const eventScopedArtifact = artifact({ id: "artifact-event", sourceSessionId: null, sourceEventIds: ["event-a"] });

assert(
  selectReviewPacketForSession([packet("packet-b", "session-b"), packet("packet-a", "session-a")], "session-a")?.id === "packet-a",
  "selects the packet owned by the active session",
);

assert(
  selectReviewPacketForSession([packet("packet-b", "session-b"), packet("packet-null", null)], "session-a") === null,
  "does not fall back to an unrelated stored packet",
);

assert(
  mergeDesignArtifacts([sessionAArtifact], [sessionAArtifact, sessionBArtifact]).map((item) => item.id).join(",") === "artifact-a,artifact-b",
  "dedupes design artifacts while preserving first-seen order",
);

const sessionArtifacts = selectDesignArtifactsForSession({
  storedArtifacts: [sessionBArtifact, eventScopedArtifact],
  traceArtifacts: [sessionAArtifact],
  sessionId: "session-a",
  events: [sessionAEvent],
});

assert(
  sessionArtifacts.map((item) => item.id).join(",") === "artifact-a,artifact-event",
  "includes only active-session artifacts and event-scoped artifacts",
);

const allHarnesses = [
  harness("hermes"),
  harness("opencode", "OpenCode"),
  harness("claude-code", "Claude Code"),
  harness("ollama", "Ollama"),
  harness("codex", "Codex"),
];

assert(
  primaryHarnesses(allHarnesses).map((item) => item.id).join(",") === "codex,claude-code",
  "keeps Codex and Claude as the only primary workbench harnesses",
);

assert(
  composerHarnesses(allHarnesses).map((item) => item.id).join(",") === "codex,claude-code,ollama,opencode",
  "shows Codex, Claude, Ollama, and OpenCode in the compact composer switcher",
);

assert(
  allHarnesses.map((item) => `${item.id}:${composerHarnessTier(item.id)}`).join(",") === "hermes:advanced,opencode:advanced,claude-code:primary,ollama:local,codex:primary",
  "classifies composer harnesses into primary, local, and advanced tiers",
);

assert(
  composerHarnessShortLabel("codex") === "CX"
    && composerHarnessShortLabel("claude-code") === "CL"
    && composerHarnessShortLabel("ollama") === "OL"
    && composerHarnessShortLabel("opencode") === "OC",
  "keeps provider affordances compact for icon-first switching",
);
