# Mémoire Studio

> Native macOS agent shell for Codex, Claude Code, OpenCode, Hermes, OpenClaw, Ollama, Gemini, and Mémoire-native runs — with Figma bridge, Mermaid Board, project memory, scenario lab, and a filterable artifact panel.

[![License: FSL-1.1-ALv2](https://img.shields.io/badge/license-FSL--1.1--ALv2-blue.svg)](./LICENSE)
[![Future License: Apache-2.0](https://img.shields.io/badge/future_license-Apache--2.0-green.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![macOS 11.0+](https://img.shields.io/badge/macOS-11.0%2B-lightgrey.svg)](#install)

Mémoire Studio is the desktop counterpart to the Mémoire engine ([github.com/sarveshsea/memi](https://github.com/sarveshsea/memi)). The engine ships as the `@memi-design/cli` npm package and an MCP server. This repo ships as a signed, notarized macOS DMG.

## Status

This repository is the **home** for the Mémoire Studio Tauri application. The macOS shell lives here; the npm engine, MCP server, harness runtime, and packaged sidecar assets live in `sarveshsea/memi`.

Track engine release progress in the [memi changelog](https://github.com/sarveshsea/memi/blob/main/CHANGELOG.md).

## Install

DMG releases are published from this repository's GitHub Releases.

Install the latest release:

```bash
brew install --cask sarveshsea/memi/memi-studio
```

Direct DMG downloads are attached to [memi-studio releases](https://github.com/sarveshsea/memi-studio/releases/latest).

## What Mémoire Studio is

- **Multi-harness agent shell** — one interface across 8 coding agents (Codex, Claude Code, OpenCode, Hermes, OpenClaw, Ollama, Gemini, Mémoire-native).
- **Figma bridge** — live design-system pull, screenshot capture, token sync, component library extraction.
- **Mermaid Board** — visual product workspace with node-link planning and FigJam handoff.
- **Project memory** — indexed knowledge corpus per workspace; sessions accumulate research evidence.
- **Scenario Lab** — product simulation with model swarms (20–60 agent cohorts, deterministic fallback when offline).
- **Filterable artifact panel** — diffs, screenshots, recordings, walkthroughs, plans, transcripts, all in one pane.
- **Browser-driving agent** — Playwright-backed self-healing loop for verification of UI work.
- **Cloud delegation** — fire-and-forget background tasks (coming in 0.18.x).

## Architecture

Mémoire Studio is a Tauri 2 application:

- **Rust shell** (`src-tauri/`) — webview host, Tauri commands, secure subprocess management.
- **React/TypeScript frontend** (`src/`) — workbench UI, composer, manager view, surfaces.
- **Node.js sidecar** (`memi-studio-runtime`, fetched from engine releases) — harness drivers, MCP server, Figma bridge, project memory, all behind a local-loopback HTTP/WebSocket API on `127.0.0.1:8765`.

The sidecar is built and signed in the [Mémoire engine repo](https://github.com/sarveshsea/memi) and downloaded by this repo's CI at the version pinned in `package.json`.

## License

**Functional Source License, Version 1.1, with an Apache License 2.0 future license (FSL-1.1-ALv2).**

Mémoire Studio is source-available today for any [Permitted Purpose](./LICENSE#permitted-purpose) — internal use, non-commercial education, non-commercial research, and professional services on behalf of licensees. **Competing commercial use is not permitted.**

On **2028-05-09** — the second anniversary of first publication — Mémoire Studio automatically becomes available under the Apache License, Version 2.0.

See [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE) for full terms.

## Contributing

By submitting a contribution, you agree that your contribution is licensed under the same terms as this repository (FSL-1.1-ALv2 with Apache-2.0 future license) and that you have the right to grant such a license. We use the Developer Certificate of Origin — sign your commits with `git commit -s`.

A `CONTRIBUTING.md` with the full guidelines lands alongside the application carve-out.

## Related projects

- [`sarveshsea/memi`](https://github.com/sarveshsea/memi) — Mémoire engine, CLI, and MCP server (MIT)
- [`sarveshsea/mermaid-jam`](https://github.com/sarveshsea/mermaid-jam) — Local-only FigJam plugin for Mermaid diagrams
- [`sarveshsea/memoire-community-notes`](https://github.com/sarveshsea/memoire-community-notes) — Community Mémoire Notes marketplace

---

Copyright 2026 Humyn LLC.
