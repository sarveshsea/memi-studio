// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_LIVE_TIMEOUT_MS = 240_000;

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  args.set(key, value);
}

const requestedPort = Number(args.get("port") ?? "0");
const timeoutMs = Number(args.get("timeout-ms") ?? DEFAULT_TIMEOUT_MS);
const liveTimeoutMs = Number(args.get("live-timeout-ms") ?? DEFAULT_LIVE_TIMEOUT_MS);
const requestTimeoutMs = Number(args.get("request-timeout-ms") ?? 30_000);
const harnesses = args.get("harnesses") ?? args.get("harness");
const json = args.has("json");
const skipSurfaces = args.has("skip-surfaces");
const skipIosRuntime = args.has("skip-ios-runtime");
const skipLiveAgents = args.has("skip-live-agents");
const runtimeBinary = resolve(ROOT, String(args.get("runtime-binary") ?? defaultRuntimeBinary()));
const packageRoot = resolve(ROOT, String(args.get("package-root") ?? "src-tauri/resources/memoire-runtime"));

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function defaultRuntimeBinary() {
  const archToken = process.arch === "arm64" ? "aarch64" : process.arch === "x64" ? "x86_64" : process.arch;
  const candidates = [
    `src-tauri/binaries/memi-studio-runtime-${archToken}-apple-darwin`,
    "src-tauri/target/release/memi-studio-runtime",
    "src-tauri/target/debug/memi-studio-runtime",
  ];
  const candidate = candidates.find((item) => existsSync(join(ROOT, item)));
  return candidate ?? candidates[0];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

async function request(base, path, requestTimeout = requestTimeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeout);
  try {
    const response = await fetch(`${base}${path}`, { signal: controller.signal });
    const text = await response.text();
    if (!response.ok) throw new Error(`${response.status} ${text}`);
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForRuntime(base) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const status = await request(base, "/api/status", Math.min(requestTimeoutMs, 5_000));
      if (status?.status === "running") return status;
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError ?? "no response");
  throw new Error(`Timed out waiting for Studio runtime at ${base}: ${detail}`);
}

function spawnRuntime(port) {
  const env = {
    ...process.env,
    MEMOIRE_PACKAGE_ROOT: packageRoot,
  };
  const child = spawn(runtimeBinary, ["studio", "serve", "--port", String(port), "--json"], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = [];
  child.stdout.on("data", (chunk) => output.push(chunk.toString()));
  child.stderr.on("data", (chunk) => output.push(chunk.toString()));
  child.on("exit", (code, signal) => {
    if (code === 0 || signal) return;
    output.push(`runtime exited code=${code}`);
  });
  return { child, output };
}

function stopRuntime(child) {
  return new Promise((resolveStop) => {
    if (child.exitCode !== null || child.signalCode) {
      resolveStop();
      return;
    }
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolveStop();
    });
    child.kill("SIGTERM");
  });
}

function runNodeScript(script, scriptArgs) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [join(ROOT, "scripts", script), ...scriptArgs], {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (!json) process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (!json) process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun({ script, stdout, stderr });
        return;
      }
      reject(new Error(`${script} exited ${code}\n${stderr || stdout}`));
    });
  });
}

function parseJsonResult(result) {
  const text = result.stdout.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  assert(existsSync(runtimeBinary), `Missing runtime binary at ${runtimeBinary}. Run npm run fetch:runtime first.`);
  assert(existsSync(packageRoot), `Missing runtime package root at ${packageRoot}. Run npm run fetch:runtime first.`);

  const port = requestedPort > 0 ? requestedPort : await freePort();
  const base = `http://127.0.0.1:${port}`;
  const runtime = spawnRuntime(port);
  let runtimeStatus = null;
  const results = {};
  try {
    runtimeStatus = await waitForRuntime(base);
    if (!skipIosRuntime) {
      const iosRuntime = await runNodeScript("studio-ios-runtime-smoke.mjs", [
        `--runtime-binary=${runtimeBinary}`,
        `--package-root=${packageRoot}`,
        "--json",
      ]);
      results.iosRuntime = parseJsonResult(iosRuntime);
    }
    if (!skipSurfaces) {
      const surface = await runNodeScript("studio-e2e-surface-smoke.mjs", [`--base=${base}`, "--json"]);
      results.surfaces = parseJsonResult(surface);
    }
    if (!skipLiveAgents) {
      const liveAgents = await runNodeScript("studio-live-agent-smoke.mjs", [
        `--base=${base}`,
        "--json",
        `--timeout-ms=${liveTimeoutMs}`,
        `--request-timeout-ms=${requestTimeoutMs}`,
        ...(harnesses ? [`--harnesses=${harnesses}`] : []),
      ]);
      results.liveAgents = parseJsonResult(liveAgents);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const runtimeOutput = runtime.output.join("").trim();
    if (json) {
      console.error(JSON.stringify({ error: detail, runtime: base, runtimeOutput }, null, 2));
    } else {
      console.error(detail);
      if (runtimeOutput) console.error(runtimeOutput);
    }
    process.exitCode = 1;
  } finally {
    await stopRuntime(runtime.child);
  }

  if (process.exitCode) return;
  const summary = {
    runtime: base,
    projectRoot: runtimeStatus?.projectRoot,
    surfaces: results.surfaces
      ? {
          artifactId: results.surfaces.artifactId,
          changelogEntryId: results.surfaces.changelogEntryId,
          externalFigJamWrites: results.surfaces.externalFigJamWrites,
          trackedStatusUnchanged: results.surfaces.trackedStatusUnchanged,
        }
      : null,
    iosRuntime: results.iosRuntime
      ? {
          packageVersion: results.iosRuntime.packageVersion,
          generatedFiles: results.iosRuntime.generatedFiles,
          swiftTypecheck: results.iosRuntime.swiftTypecheck,
        }
      : null,
    liveAgents: results.liveAgents?.results?.map((item) => ({
      harness: item.harness,
      marker: item.marker,
      sessionId: item.sessionId,
      status: item.status,
      packageReference: item.packageReference,
    })) ?? null,
  };
  if (json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(`Studio live E2E passed at ${base}`);
    for (const item of summary.liveAgents ?? []) {
      console.log(`${item.harness}: ${item.status} ${item.sessionId} ${item.packageReference} ${item.marker}`);
    }
  }
}

main().catch((error) => {
  const detail = error instanceof Error ? error.message : String(error);
  if (json) console.error(JSON.stringify({ error: detail }, null, 2));
  else console.error(detail);
  process.exit(1);
});
