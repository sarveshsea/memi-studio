// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { execFileSync } from "node:child_process";

const DEFAULT_BASE = process.env.MEMI_STUDIO_RUNTIME_BASE ?? "http://127.0.0.1:8765";
const DEFAULT_TIMEOUT_MS = 30_000;

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  args.set(key, value);
}

const base = String(args.get("base") ?? DEFAULT_BASE).replace(/\/$/, "");
const json = args.has("json");
const timeoutMs = Number(args.get("timeout-ms") ?? DEFAULT_TIMEOUT_MS);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${base}${path}`, { ...options, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${text}`);
    const contentType = response.headers.get("content-type") ?? "";
    return contentType.includes("application/json") && text ? JSON.parse(text) : text;
  } finally {
    clearTimeout(timer);
  }
}

function post(path, body) {
  return request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patch(path, body) {
  return request(path, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function gitTrackedStatus() {
  try {
    return execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function toolInputResearch() {
  return {
    personas: [{
      name: "Product designer",
      role: "Product designer",
      goals: ["Review agent work without reading raw logs"],
      painPoints: ["Agent tools hide evidence and design-system impact"],
      behaviors: ["Checks artifacts, board state, and source links before accepting work"],
      source: "studio-e2e-surface-smoke",
      evidenceFindingIds: ["finding-agent-transparency"],
    }],
    findings: [{
      id: "finding-agent-transparency",
      statement: "Designers need compact receipts, editable design memory, and local FigJam source before trusting agent output.",
      category: "agentic-interface",
      confidence: "high",
      themeIds: [],
      evidenceObservationIds: [],
      evidenceSourceIds: [],
      sourceTypeCount: 1,
      method: "qualitative",
      caveats: [],
      tags: ["studio", "agent", "figjam"],
      entities: [],
      signalTags: [],
      createdAt: "2026-05-26T00:00:00.000Z",
    }],
    themes: [],
    opportunities: [],
    risks: [],
    contradictions: [],
    quantitativeMetrics: [],
    sources: [],
    observations: [],
    evidenceLinks: [],
    highlights: [],
    codebook: [],
    reports: [],
    version: 2,
    quality: {
      overallScore: 82,
      sampleSize: 1,
      completenessScore: 86,
      sourceDiversityScore: 55,
      triangulationScore: 66,
      structureScore: 88,
      notes: [],
      generatedAt: "2026-05-26T00:00:00.000Z",
    },
    methods: {
      analysisMode: "decision-grade",
      quantitativeApproach: "",
      qualitativeApproach: "Focused product-design acceptance scenario",
      limitations: ["Single local proof scenario; no external FigJam write"],
    },
  };
}

async function callTool(toolId, cwd, input) {
  const payload = await post("/api/tools/call", { toolId, cwd, input });
  const call = payload.call;
  assert(call?.status === "completed", `${toolId} did not complete: ${call?.status ?? "missing"} ${call?.error ?? ""}`);
  const stored = await request(`/api/tools/calls/${encodeURIComponent(call.id)}`);
  assert(stored.call?.id === call.id, `${toolId} call was not persisted for inspection`);
  return call;
}

async function main() {
  const beforeStatus = gitTrackedStatus();
  const status = await request("/api/status");
  assert(status.status === "running", `Studio runtime is ${status.status}, expected running`);
  const projectRoot = status.projectRoot;
  assert(typeof projectRoot === "string" && projectRoot.length > 0, "Studio status did not include projectRoot");

  const harnesses = await request("/api/harnesses?refresh=1");
  const byHarness = new Map((harnesses.harnesses ?? []).map((harness) => [harness.id, harness]));
  for (const id of ["codex", "claude-code"]) {
    const harness = byHarness.get(id);
    assert(harness?.enabled && harness?.installed, `${id} is not enabled and installed`);
    assert(["ready", "signed_in", "not_required"].includes(harness.authStatus ?? "ready"), `${id} auth is ${harness.authStatus}`);
    assert(harness.visibility === "primary", `${id} must remain primary`);
  }
  assert(byHarness.get("opencode")?.visibility === "advanced", "OpenCode should remain an advanced integration until installed/configured");

  const usage = await request("/api/usage");
  assert(usage.usage && Array.isArray(usage.usage.sessions), "/api/usage did not return a sessions array");
  const changelogBefore = await request("/api/design-changelog");
  assert(Array.isArray(changelogBefore.entries), "/api/design-changelog did not return entries");
  const compatibility = await request("/api/compatibility");
  assert(compatibility.compatibility, "/api/compatibility did not return a compatibility snapshot");
  const browserStatus = await request("/api/browser/status");
  assert(typeof browserStatus.message === "string", "/api/browser/status did not return status copy");
  const computerStatus = await request("/api/computer/status");
  assert(typeof computerStatus.message === "string", "/api/computer/status did not return status copy");

  const tools = await request("/api/tools");
  const toolIds = new Set((tools.tools ?? []).map((tool) => tool.id));
  const requiredTools = [
    "research.design_package",
    "mermaid_jam.export",
    "board.create",
    "board.add_node",
    "board.export_mermaid_jam",
    "board.sync_figjam",
  ];
  for (const id of requiredTools) assert(toolIds.has(id), `missing Studio tool ${id}`);

  const runId = Date.now().toString(36);
  const sessionId = `studio-surface-${runId}`;
  const boardId = `studio-surface-board-${runId}`;
  const research = toolInputResearch();

  const artifactCapture = await post("/api/artifacts/capture", {
    session: {
      id: sessionId,
      harness: "codex",
      cwd: projectRoot,
      prompt: "Verify editable design-system memory for the Studio E2E surface smoke.",
      status: "completed",
    },
    events: [{
      id: `${sessionId}-artifact`,
      sessionId,
      type: "design_system_artifact",
      timestamp: new Date().toISOString(),
      message: "Design System Review\n- Brand: Mémoire Studio uses a compact steel workbench for product designers.\n- Type: Inter/SF UI stack with small workbench labels.\n- Components: Composer, run spine, inspector, artifacts, and board receipts stay inspectable.\n- Accessibility: Icon buttons require labels and focus state.\n- Handoff: Verify OK, Fix, and Use as context remain available.",
      data: { harness: "codex", cwd: projectRoot },
    }],
  });
  const artifact = artifactCapture.artifact;
  assert(artifact?.id && artifact.sections?.length > 0, "artifact capture did not return editable sections");
  const reviewed = await patch(`/api/artifacts/${encodeURIComponent(artifact.id)}/sections/${encodeURIComponent(artifact.sections[0].id)}/review`, {
    reviewState: "looks_good",
    comment: "Surface smoke verified editable review state.",
  });
  assert(reviewed.artifact?.sections?.[0]?.reviewState === "looks_good", "artifact review state did not persist");
  const artifacts = await request("/api/artifacts");
  assert((artifacts.artifacts ?? []).some((item) => item.id === artifact.id), "captured artifact was not listed");

  const capturedChangelog = await post("/api/design-changelog/capture", {
    session: { id: sessionId, harness: "claude-code", cwd: projectRoot, prompt: "Verify Studio surface smoke changelog capture.", status: "completed" },
    events: [{
      id: `${sessionId}-change`,
      sessionId,
      type: "design_decision",
      timestamp: new Date().toISOString(),
      message: "Design decision: keep FigJam sync local-source only unless an explicit external write is approved.",
      data: { files: [], tags: ["studio", "figjam"] },
    }],
  });
  assert(capturedChangelog.captured === true && capturedChangelog.entry?.id, "design changelog capture did not return a captured entry");
  const changelogAfter = await request("/api/design-changelog");
  assert((changelogAfter.entries ?? []).some((entry) => entry.id === capturedChangelog.entry.id), "captured design changelog entry was not listed");

  const designPackage = await callTool("research.design_package", projectRoot, {
    intent: "Make Studio transparent for product designers without visual clutter.",
    hypothesis: "Receipts plus contextual design memory increase trust in agent work.",
    research,
  });
  assert(designPackage.data?.package?.specs?.pages?.length > 0, "research.design_package did not return page specs");
  assert(designPackage.data?.package?.mermaidArtifacts?.length > 0, "research.design_package did not return Mermaid artifacts");

  const mermaidExport = await callTool("mermaid_jam.export", projectRoot, { source: "research", research });
  assert((mermaidExport.data?.exports ?? []).some((item) => String(item.outputPath ?? "").includes(".memoire/mermaid-jam")), "mermaid_jam.export did not write local source artifacts");

  const boardCreate = await callTool("board.create", projectRoot, {
    id: boardId,
    prompt: "Create a product-design board for agent transparency, design memory, and FigJam export readiness.",
  });
  assert(boardCreate.data?.board?.id === boardId, "board.create did not return the requested board");
  await callTool("board.add_node", projectRoot, {
    boardId,
    kind: "risk",
    laneId: "risks",
    title: "External sync risk",
    body: "FigJam/Figma writes must stay explicit so local proof does not mutate a design file.",
  });
  const boardExport = await callTool("board.export_mermaid_jam", projectRoot, { boardId });
  assert((boardExport.data?.exports ?? []).some((item) => String(item.outputPath ?? "").includes(".memoire/mermaid-jam/boards")), "board.export_mermaid_jam did not write local board source");
  const figjamSync = await callTool("board.sync_figjam", projectRoot, { boardId });
  assert(figjamSync.data?.sync?.status === "fallback", "board.sync_figjam should report local-source fallback only");
  assert(figjamSync.data?.sync?.createdNodeCount === 0, "board.sync_figjam must not create external FigJam nodes in this smoke");

  const designTrace = await request("/api/design-system/trace");
  assert(designTrace.trace, "/api/design-system/trace did not return trace data");

  const afterStatus = gitTrackedStatus();
  assert(beforeStatus === afterStatus, `tracked git status changed during surface smoke\nbefore: ${beforeStatus}\nafter: ${afterStatus}`);

  const result = {
    runtime: base,
    projectRoot,
    harnesses: {
      codex: byHarness.get("codex")?.authStatus,
      claudeCode: byHarness.get("claude-code")?.authStatus,
      opencode: byHarness.get("opencode")?.visibility,
    },
    usageSessions: usage.usage.sessions.length,
    artifactId: artifact.id,
    changelogEntryId: capturedChangelog.entry.id,
    tools: {
      designPackage: designPackage.id,
      mermaidExport: mermaidExport.id,
      boardCreate: boardCreate.id,
      boardExport: boardExport.id,
      figjamSync: figjamSync.id,
    },
    externalFigJamWrites: figjamSync.data.sync.createdNodeCount,
    trackedStatusUnchanged: true,
  };
  if (json) console.log(JSON.stringify(result, null, 2));
  else console.log(`Studio E2E surfaces passed: ${artifact.id}, ${boardId}, no external FigJam writes.`);
}

main().catch((error) => {
  if (json) console.error(JSON.stringify({ error: error.message }, null, 2));
  else console.error(error.message);
  process.exit(1);
});
