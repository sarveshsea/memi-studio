// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_INFO_TS = join(ROOT, "src", "runtime", "package-info.ts");
const DEFAULT_BASE = process.env.MEMI_STUDIO_RUNTIME_BASE ?? "http://127.0.0.1:8765";
const DEFAULT_HARNESSES = ["codex", "claude-code"];
const DEFAULT_TIMEOUT_MS = 240_000;
const HARNESS_READY_STATUSES = new Set(["ready", "signed_in", "not_required"]);
const PUBLIC_PACKAGE = readPublicPackageInfo();

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  args.set(key, value);
}

const base = String(args.get("base") ?? DEFAULT_BASE).replace(/\/$/, "");
const harnesses = String(args.get("harnesses") ?? args.get("harness") ?? DEFAULT_HARNESSES.join(","))
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const timeoutMs = Number(args.get("timeout-ms") ?? DEFAULT_TIMEOUT_MS);
const json = args.has("json");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}) {
  const url = `${base}${path}`;
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${text}`);
    return text ? JSON.parse(text) : null;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const hint = path === "/api/status"
      ? "Start Mémoire Studio or pass --base=http://127.0.0.1:<port> for a running Studio runtime."
      : "Confirm the Studio runtime stayed running while the live-agent smoke was executing.";
    throw new Error(`${options.method ?? "GET"} ${url} failed: ${detail}. ${hint}`);
  }
}

async function post(path, body) {
  return request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function harnessReady(harness) {
  return Boolean(
    harness
    && harness.enabled
    && harness.installed
    && HARNESS_READY_STATUSES.has(harness.authStatus ?? "ready"),
  );
}

async function waitForHarnessReadiness(ids) {
  const startedAt = Date.now();
  let latest = new Map();
  while (Date.now() - startedAt < Math.min(timeoutMs, 30_000)) {
    const payload = await request("/api/harnesses?refresh=1");
    latest = new Map((payload.harnesses ?? []).map((harness) => [harness.id, harness]));
    if (ids.every((id) => harnessReady(latest.get(id)))) return latest;
    await sleep(750);
  }
  const details = ids.map((id) => {
    const harness = latest.get(id);
    return `${id} enabled=${harness?.enabled} installed=${harness?.installed} auth=${harness?.authStatus ?? "missing"} message=${harness?.authMessage ?? ""}`;
  }).join("; ");
  throw new Error(`Harnesses are not ready: ${details}`);
}

function markerTextFromEvents(events) {
  return events
    .filter((event) => {
      if (event.type === "chat_message") return event.data?.role && event.data.role !== "user";
      return [
        "session_result",
        "assistant_message",
        "agent_message",
        "stdout",
        "stderr",
        "terminal_output",
        "tool_call",
        "design_decision",
        "acceptance_statement",
        "artifact",
        "design_system_artifact",
      ].includes(event.type);
    })
    .map((event) => `${event.message ?? ""}\n${JSON.stringify(event.data ?? {})}`)
    .join("\n");
}

function publicPackageReference(events) {
  for (const event of events) {
    if (event.type !== "reference_trace") continue;
    const references = Array.isArray(event.data?.references) ? event.data.references : [];
    const reference = references.find((item) => item?.kind === "package" && isMemoirePackageReference(item));
    if (reference) return normalizePackageReference(reference);
  }
  return null;
}

function readPublicPackageInfo() {
  const source = readFileSync(PACKAGE_INFO_TS, "utf8");
  return {
    name: exportedConst(source, "MEMOIRE_PACKAGE_NAME"),
    version: exportedConst(source, "MEMOIRE_PACKAGE_VERSION"),
    url: exportedConst(source, "MEMOIRE_PACKAGE_URL"),
  };
}

function exportedConst(source, name) {
  const match = source.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*["']([^"']+)["']`));
  if (!match) throw new Error(`src/runtime/package-info.ts: missing ${name}`);
  return match[1];
}

function isMemoirePackageReference(reference) {
  const label = String(reference.label ?? "");
  return reference.packageName === PUBLIC_PACKAGE.name
    || reference.packageName === "@sarveshsea/memoire"
    || label.includes(PUBLIC_PACKAGE.name)
    || label.includes("@sarveshsea/memoire");
}

function normalizePackageReference(reference) {
  const label = String(reference.label ?? "");
  const version = typeof reference.packageVersion === "string" ? reference.packageVersion : "";
  const isLegacy = reference.packageName === "@sarveshsea/memoire" || version.startsWith("0.") || /@0\.\d+\.\d+/.test(label);
  if (!isLegacy) return reference;
  return {
    ...reference,
    id: `package:${PUBLIC_PACKAGE.name}`,
    label: `${PUBLIC_PACKAGE.name}@${PUBLIC_PACKAGE.version}`,
    packageName: PUBLIC_PACKAGE.name,
    packageVersion: PUBLIC_PACKAGE.version,
    url: PUBLIC_PACKAGE.url,
    sourcePackageName: reference.packageName ?? null,
    sourcePackageVersion: reference.packageVersion ?? null,
  };
}

async function waitForSession(id, marker) {
  const startedAt = Date.now();
  let latest = null;
  while (Date.now() - startedAt < timeoutMs) {
    latest = await request(`/api/sessions/${encodeURIComponent(id)}/events?limit=300`);
    const status = latest.session?.status;
    if (["completed", "failed", "cancelled", "interrupted"].includes(status)) return latest;
    const text = markerTextFromEvents(latest.events ?? []);
    if (text.includes(marker) && status === "completed") return latest;
    await sleep(1_000);
  }
  throw new Error(`Timed out waiting for ${id} to emit ${marker}`);
}

async function runHarnessSmoke(status, harness) {
  const marker = `MEMI_${harness.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_LIVE_OK_${Date.now()}`;
  const created = await post("/api/sessions", {
    harness,
    cwd: status.projectRoot,
    prompt: `Live Studio agent smoke. Do not edit files. Reply with exactly ${marker}, then stop.`,
    action: "raw",
    chatMode: "terminal",
    permissionMode: "plan",
  });
  const session = created.session;
  if (!session?.id) throw new Error(`${harness}: runtime did not return a session id`);

  const eventPayload = await waitForSession(session.id, marker);
  const events = eventPayload.events ?? [];
  const outputText = markerTextFromEvents(events);
  const tracePayload = await request(`/api/sessions/${encodeURIComponent(session.id)}/trace`);
  const listed = await request("/api/sessions");
  const reference = publicPackageReference(events);

  if (eventPayload.session?.status !== "completed") throw new Error(`${harness}: session ended as ${eventPayload.session?.status}`);
  if (!outputText.includes(marker)) throw new Error(`${harness}: marker was not emitted by assistant output`);
  if (!listed.sessions?.some((item) => item.id === session.id)) throw new Error(`${harness}: /api/sessions did not hydrate ${session.id}`);
  if (tracePayload.session?.id !== session.id || !tracePayload.trace) throw new Error(`${harness}: /trace did not hydrate ${session.id}`);
  if (!reference) throw new Error(`${harness}: reference_trace did not include ${PUBLIC_PACKAGE.name}`);
  if (reference.packageName !== PUBLIC_PACKAGE.name || reference.packageVersion !== PUBLIC_PACKAGE.version) {
    throw new Error(`${harness}: stale package reference ${reference.packageName}@${reference.packageVersion}`);
  }

  return {
    harness,
    marker,
    sessionId: session.id,
    status: eventPayload.session.status,
    eventCount: events.length,
    traceReferences: tracePayload.trace.references?.length ?? 0,
    packageReference: `${reference.packageName}@${reference.packageVersion}`,
    sourcePackageReference: reference.sourcePackageVersion ? `${reference.sourcePackageName ?? "unknown"}@${reference.sourcePackageVersion}` : null,
  };
}

async function main() {
  const status = await request("/api/status");
  if (status.status !== "running") throw new Error(`Studio runtime is ${status.status}, expected running`);
  const byId = await waitForHarnessReadiness(harnesses);
  const missing = harnesses.filter((id) => !harnessReady(byId.get(id)));
  if (missing.length) {
    const details = missing.map((id) => {
      const harness = byId.get(id);
      return `${id} enabled=${harness?.enabled} installed=${harness?.installed} auth=${harness?.authStatus ?? "missing"}`;
    }).join("; ");
    throw new Error(`Harnesses are not ready: ${details}`);
  }

  const results = [];
  for (const harness of harnesses) results.push(await runHarnessSmoke(status, harness));
  if (json) console.log(JSON.stringify({ runtime: base, projectRoot: status.projectRoot, results }, null, 2));
  else {
    for (const result of results) {
      console.log(`${result.harness}: ${result.status} ${result.sessionId} ${result.packageReference} ${result.marker}`);
    }
  }
}

main().catch((error) => {
  if (json) console.error(JSON.stringify({ error: error.message }, null, 2));
  else console.error(error.message);
  process.exit(1);
});
