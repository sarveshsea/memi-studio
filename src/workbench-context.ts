// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

type WorkbenchSourceRef = {
  eventIds?: string[];
};

type WorkbenchArtifactSection = {
  eventIds?: string[];
  sourceRefs?: WorkbenchSourceRef[];
};

type WorkbenchDesignArtifact = {
  id: string;
  sourceSessionId?: string | null;
  sourceEventIds?: string[];
  sourceRefs?: WorkbenchSourceRef[];
  sections?: WorkbenchArtifactSection[];
};

type WorkbenchEvent = {
  id: string;
};

type WorkbenchReviewPacket = {
  sessionId?: string | null;
};

function uniqueArtifacts<T extends { id: string }>(artifacts: T[]): T[] {
  const seen = new Set<string>();
  const nextArtifacts: T[] = [];
  for (const artifact of artifacts) {
    if (seen.has(artifact.id)) continue;
    seen.add(artifact.id);
    nextArtifacts.push(artifact);
  }
  return nextArtifacts;
}

export function mergeDesignArtifacts<T extends { id: string }>(...groups: T[][]): T[] {
  return uniqueArtifacts(groups.flat());
}

export function selectReviewPacketForSession<T extends WorkbenchReviewPacket>(
  reviewPackets: T[],
  sessionId: string | null | undefined,
): T | null {
  if (!sessionId) return null;
  return reviewPackets.find((packet) => packet.sessionId === sessionId) ?? null;
}

export function designArtifactBelongsToSession<T extends WorkbenchDesignArtifact>(
  artifact: T,
  sessionId: string | null | undefined,
  sessionEventIds: ReadonlySet<string>,
): boolean {
  if (!sessionId && sessionEventIds.size === 0) return false;
  if (sessionId && artifact.sourceSessionId === sessionId) return true;

  const matchesSessionRef = (id: string) => {
    return id === sessionId || sessionEventIds.has(id);
  };

  if ((artifact.sourceEventIds ?? []).some(matchesSessionRef)) return true;
  if ((artifact.sourceRefs ?? []).some((ref) => (ref.eventIds ?? []).some(matchesSessionRef))) return true;
  return (artifact.sections ?? []).some((section) =>
    (section.eventIds ?? []).some(matchesSessionRef)
    || (section.sourceRefs ?? []).some((ref) => (ref.eventIds ?? []).some(matchesSessionRef)),
  );
}

export function selectDesignArtifactsForSession<T extends WorkbenchDesignArtifact>(input: {
  storedArtifacts: T[];
  traceArtifacts: T[];
  sessionId: string | null | undefined;
  events: WorkbenchEvent[];
}): T[] {
  const sessionEventIds = new Set(input.events.map((event) => event.id));
  return uniqueArtifacts([
    ...input.traceArtifacts.filter((artifact) =>
      designArtifactBelongsToSession(artifact, input.sessionId, sessionEventIds),
    ),
    ...input.storedArtifacts.filter((artifact) =>
      designArtifactBelongsToSession(artifact, input.sessionId, sessionEventIds),
    ),
  ]);
}
