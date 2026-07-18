// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  args.set(key, value);
}

const runtimeBinary = resolve(String(args.get("runtime-binary") ?? ""));
const packageRoot = resolve(String(args.get("package-root") ?? ""));
const json = args.has("json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    timeout: 60_000,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function runRuntime(cwd, runtimeArgs) {
  const output = run(runtimeBinary, runtimeArgs, {
    cwd,
    env: { ...process.env, MEMOIRE_PACKAGE_ROOT: packageRoot },
  });
  return JSON.parse(output);
}

async function main() {
  assert(existsSync(runtimeBinary), `Missing packaged Studio runtime: ${runtimeBinary}`);
  assert(existsSync(packageRoot), `Missing packaged Studio resources: ${packageRoot}`);

  const fixture = await mkdtemp(join(tmpdir(), "memi-studio-ios-smoke-"));
  try {
    const brief = runRuntime(fixture, [
      "ios", "brief", "--platform", "ios", "--intent", "Build an accessible SwiftUI settings screen", "--detail", "compact", "--json",
    ]);
    assert(brief.action === "prepare_apple_design_brief", "Packaged runtime did not expose the Apple design brief");
    assert(brief.skillTriggers.includes("swiftui-design-engineering"), "Apple brief omitted SwiftUI design engineering");

    const scaffoldArgs = [
      "ios", "scaffold", "SettingsScreen", "--kind", "screen", "--module", "MemiStudioFixture",
      "--deployment-target", "17.0", "--output-root", "Sources", "--tests-root", "Tests", "--json",
    ];
    const dryRun = runRuntime(fixture, scaffoldArgs);
    assert(dryRun.status === "planned" && dryRun.dryRun === true, "SwiftUI scaffold must default to dry-run");
    assert(!existsSync(join(fixture, "Sources")), "Dry-run unexpectedly wrote Swift source files");

    const written = runRuntime(fixture, [...scaffoldArgs.slice(0, -1), "--write", "--json"]);
    assert(written.status === "written" && written.files.length === 4, "Approved SwiftUI scaffold did not write its full file plan");
    for (const file of written.files) assert(existsSync(join(fixture, file.path)), `Missing generated file ${file.path}`);

    const sdk = run("xcrun", ["--sdk", "iphonesimulator", "--show-sdk-path"]);
    const sourceFiles = written.files
      .filter((file) => file.role === "model" || file.role === "view")
      .map((file) => join(fixture, file.path));
    run("xcrun", [
      "swiftc", "-typecheck", "-parse-as-library", "-module-name", "MemiStudioFixture",
      "-sdk", sdk, "-target", "arm64-apple-ios17.0-simulator", ...sourceFiles,
    ], { cwd: fixture });

    const packageInfo = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    const summary = {
      packageVersion: packageInfo.version,
      briefSkills: brief.skillTriggers,
      generatedFiles: written.files.map((file) => file.path),
      swiftTypecheck: "passed",
    };
    if (json) console.log(JSON.stringify(summary, null, 2));
    else console.log(`studio-ios-runtime-smoke: ${summary.generatedFiles.length} files, Swift typecheck passed`);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (json) console.error(JSON.stringify({ error: message }, null, 2));
  else console.error(message);
  process.exitCode = 1;
});
