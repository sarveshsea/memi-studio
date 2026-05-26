// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import type { HarnessId, StudioAction, StudioChatMode, StudioPermissionMode } from "./studio-api";

export type SlashCommandPane = "run" | "changes" | "design-system" | "figma" | "memory" | "mermaid-board" | "research-lab";

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  aliases: string[];
  action?: StudioAction;
  chatMode?: StudioChatMode;
  permissionMode?: StudioPermissionMode;
  harness?: HarnessId;
  pane?: SlashCommandPane;
  openUsage?: boolean;
  openHelp?: boolean;
  clear?: boolean;
}

export interface SlashCommandState {
  prompt: string;
}

export interface SlashCommandPatch {
  prompt?: string;
  action?: StudioAction;
  chatMode?: StudioChatMode;
  permissionMode?: StudioPermissionMode;
  harness?: HarnessId;
  pane?: SlashCommandPane;
  openUsage?: boolean;
  openHelp?: boolean;
  clear?: boolean;
  preview: string;
  shouldRun: false;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  command("plan", "Plan", "Stage a read-only planning run.", ["p"], { action: "research", chatMode: "ideate", permissionMode: "plan" }),
  command("build", "Build", "Stage an app build run.", ["b"], { action: "app-build", chatMode: "build", permissionMode: "guarded" }),
  command("review", "Review", "Stage a review/audit run.", ["audit"], { action: "audit", chatMode: "review", permissionMode: "plan" }),
  command("research", "Research", "Stage a research run.", ["r"], { action: "research", chatMode: "research", permissionMode: "plan" }),
  command("simulate", "Simulate", "Stage a Scenario Lab simulation run.", ["sim"], { action: "simulate", chatMode: "research", permissionMode: "plan", pane: "run" }),
  command("browser", "Browser", "Stage a browser audit run.", ["web"], { action: "browser-audit", chatMode: "research", permissionMode: "plan" }),
  command("handoff", "Handoff", "Stage a product handoff run.", ["ship"], { action: "handoff", chatMode: "review", permissionMode: "guarded" }),
  command("codex", "Codex", "Switch composer harness to Codex.", ["cc"], { harness: "codex" }),
  command("claude", "Claude", "Switch composer harness to Claude Code.", ["claude-code"], { harness: "claude-code" }),
  command("ollama", "Ollama", "Switch composer harness to Ollama.", ["local"], { harness: "ollama" }),
  command("opencode", "OpenCode", "Switch composer harness to OpenCode.", ["oc"], { harness: "opencode" }),
  command("system", "System", "Focus the design-system artifact lane.", ["design", "ds"], { pane: "design-system" }),
  command("guarded", "Guarded", "Use guarded workspace-write access.", ["write"], { permissionMode: "guarded" }),
  command("full", "Full", "Use full-access mode.", ["full-access"], { permissionMode: "full_access" }),
  command("figma", "Figma", "Focus the Figma cockpit pane.", ["bridge"], { pane: "figma" }),
  command("board", "Board", "Focus the Mermaid Board pane.", ["mermaid"], { pane: "mermaid-board" }),
  command("lab", "Research Lab", "Focus the research and scenario lab.", ["research-lab", "scenario-lab"], { pane: "research-lab" }),
  command("memory", "Memory", "Focus project memory and knowledge.", ["mem"], { pane: "memory" }),
  command("changes", "Changes", "Focus changed files.", ["diff"], { pane: "changes" }),
  command("limits", "Limits", "Open usage and rate-limit status.", ["usage", "quota"], { pane: "run", openUsage: true }),
  command("help", "Help", "Show slash command help.", ["?"], { openHelp: true }),
  command("clear", "Clear", "Clear the composer.", ["reset"], { clear: true }),
];

export function parseSlashCommandQuery(prompt: string): string | null {
  if (!prompt.startsWith("/")) return null;
  return prompt.slice(1).split(/\s+/)[0]?.toLowerCase() ?? "";
}

export function filterSlashCommands(prompt: string): SlashCommand[] {
  const query = parseSlashCommandQuery(prompt);
  if (query === null) return [];
  return SLASH_COMMANDS
    .filter((command) => command.id.includes(query)
      || command.label.toLowerCase().includes(query)
      || command.aliases.some((alias) => alias.startsWith(query)))
    .slice(0, 8);
}

export function applySlashCommand(command: SlashCommand, state: SlashCommandState): SlashCommandPatch {
  const remainder = command.clear ? "" : state.prompt.replace(/^\/\S+\s*/u, "").trimStart();
  return {
    prompt: remainder,
    action: command.action,
    chatMode: command.chatMode,
    permissionMode: command.permissionMode,
    harness: command.harness,
    pane: command.pane,
    openUsage: command.openUsage,
    openHelp: command.openHelp,
    clear: command.clear,
    preview: slashCommandPreview(command),
    shouldRun: false,
  };
}

export function slashCommandPreview(command: SlashCommand): string {
  return [
    command.harness ? `Harness: ${command.label}` : null,
    command.action ? `Action: ${command.action}` : null,
    command.chatMode ? `Mode: ${command.chatMode}` : null,
    command.permissionMode ? `Access: ${command.permissionMode}` : null,
    command.pane ? `Pane: ${command.pane}` : null,
    command.openUsage ? "Open limits" : null,
    command.openHelp ? "Show help" : null,
    command.clear ? "Clear prompt" : null,
  ].filter(Boolean).join(" / ") || command.description;
}

function command(
  id: string,
  label: string,
  description: string,
  aliases: string[],
  patch: Omit<SlashCommand, "id" | "label" | "description" | "aliases">,
): SlashCommand {
  return { id, label, description, aliases, ...patch };
}
