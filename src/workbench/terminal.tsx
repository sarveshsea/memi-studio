// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Terminal/output block rendering: the command-trace block family and the
// markdown / inline-message formatters, plus the pure block builders. Depends
// only on shared utilities/types, the icon atoms, and studio-api types.

import { type ReactNode } from "react";
import {
  type FigmaAction,
  type FigmaActionRequest,
  type FigmaActionResult,
  type FigmaStatus,
  type Harness,
  type MermaidBoardNode,
  type MarketplaceNotesPayload,
  type NoteForkDiff,
  type NoteForkFile,
  type NoteForkPrHandoff,
  type NoteForkSummary,
  type NoteForkValidation,
  type ProjectMemoryItem,
  type SessionSummary,
  type StudioAction,
  type AgentInstallTargetInput,
  type StudioAutomationDefinition,
  type StudioAutomationMutationPolicy,
  type StudioAutomationRun,
  type StudioAutomationSchedulerStatus,
  type StudioAutomationTemplate,
  type StudioCompatibilitySnapshot,
  type StudioCompatibilityToolAction,
  type StudioConfig,
  type StudioBrowserStatus,
  type StudioComputerStatus,
  type StudioDesignSystemTrace,
  type StudioDesignSystemTraceFile,
  type StudioDownloadJob,
  type DesignChangelogCreateInput,
  type DesignChangelogEntry,
  type DesignChangelogPatchInput,
  type DesignSystemArtifact,
  type DesignSystemArtifactReviewState,
  type DesignSystemArtifactSection,
  type StudioEvent,
  type StudioHarnessSetupAction,
  type StudioHarnessSetupPlan,
  type StudioInputMode,
  type StudioAttachment,
  type StudioActiveProcess,
  type StudioActivityItem,
  type StudioCodexApprovalPolicy,
  type StudioCodexConfig,
  type StudioCodexReasoningEffort,
  type StudioKnowledgeItem,
  type StudioPermissionMode,
  type StudioReferenceTraceItem,
  type StudioRecentWorkspace,
  type StudioReviewPacket,
  type StudioStatus,
  type StudioToolDefinition,
  type StudioWorkArtifact,
  type StudioWorkArtifactKind,
} from "../studio-api";

import { StudioControlIcon } from "./icons";
import {
  type FormattedNode,
  type TerminalBlock,
  type TerminalBlockKind,
  AGENTIC_EVENT_TYPES,
  ARTIFACT_EVENT_TYPES,
  asEventRecord,
  copyText,
  formatDataPreview,
  compactName,
  displaySourceLabel,
  eventLabel,
  firstMeaningfulLine,
  pickEventString,
  stripAnsi,
  trimText,
} from "./shared";

export function BlockBody({ block }: { block: TerminalBlock }) {
  if (block.events.some((event) => event.type === "token_usage")) return <TokenUsageStrip block={block} />;
  if (block.kind === "command_trace") return <CommandTraceBlock block={block} />;
  if (block.kind === "tool_pair") return <ToolPairBlock block={block} />;
  if (block.kind === "session_result" || block.events.some((event) => ["research_note", "design_decision", "artifact", "design_system_artifact", "acceptance_statement"].includes(event.type) || Boolean(asEventRecord(event.data).sectionLabel))) {
    return (
      <div className="result-body" data-structured-result="sectioned">
        <StructuredResultSections block={block} />
        {block.data ? <details className="result-details">
          <summary>Data</summary>
          <pre className="result-pre">{formatDataPreview(block.data)}</pre>
        </details> : null}
      </div>
    );
  }
  return <TuiInlineBlock block={block} />;
}

export function ToolPairBlock({ block }: { block: TerminalBlock }) {
  const callEvent = block.events.find((event) => event.type === "tool_call");
  const resultEvent = block.events.find((event) => event.type === "tool_result");
  const callData = callEvent?.data && typeof callEvent.data === "object" ? (callEvent.data as Record<string, unknown>) : {};
  const inputJson = callData.input ? JSON.stringify(callData.input, null, 2) : "";
  const resultText = resultEvent?.message ?? "";
  return (
    <div className="tool-pair-body" data-tool-pair="input-output">
      {inputJson ? (
        <details className="tool-pair-section" data-tool-pair-section="input" open>
          <summary>Input</summary>
          <pre className="tool-pair-pre">{inputJson}</pre>
        </details>
      ) : null}
      {resultText ? (
        <details className="tool-pair-section" data-tool-pair-section="output" open>
          <summary>Output{resultEvent ? ` · ${trimText(resultText, 60)}` : ""}</summary>
          <pre className="tool-pair-pre">{trimText(resultText, 1600)}</pre>
        </details>
      ) : null}
    </div>
  );
}

export function StructuredResultSections({ block }: { block: TerminalBlock }) {
  const sections = resultSectionsForBlock(block);
  return (
    <div className="structured-result-sections">
      {sections.map((section, index) => (
        <article className="result-section" data-result-section={section.label} key={`${section.label}-${index}`}>
          <strong>{resultSectionTitle(section.label, section.message)}</strong>
          <FormattedMessage text={resultSectionBody(section.label, section.message)} />
        </article>
      ))}
    </div>
  );
}

export function CommandTraceBlock({ block }: { block: TerminalBlock }) {
  const commandEvent = block.events.find((event) => event.type === "terminal_command");
  const outputEvent = block.events.find((event) => event.type === "terminal_output");
  const data = asEventRecord(outputEvent?.data ?? commandEvent?.data);
  const exitCode = typeof data.exit_code === "number" ? `exit ${data.exit_code}` : pickEventString(data, "status") ?? "command";
  const command = commandEvent?.message ?? block.messages[0];
  const output = stripAnsi(outputEvent?.message.trim() ?? "");
  return (
    <div className="command-trace-block">
      <div className="command-row" data-command-state={exitCode}>
        <span>cmd</span>
        <code title={command}>{command}</code>
        <small>{exitCode}</small>
      </div>
      {output ? (
        <details className="tui-inline" data-tui-inline="command-output">
          <summary>{trimText(firstMeaningfulLine(output), 86)}</summary>
          <pre>{output}</pre>
        </details>
      ) : null}
    </div>
  );
}

export function TuiInlineBlock({ block }: { block: TerminalBlock }) {
  const output = stripAnsi(block.messages.join("\n").trimEnd() || block.title);
  const preview = firstMeaningfulLine(output);
  const longOutput = output.split(/\r?\n/).length > 8 || output.length > 520;
  if (!longOutput) return <pre className="tui-output" data-tui-inline="plain">{output}</pre>;
  return (
    <details className="tui-inline" data-tui-inline="collapsible">
      <summary>{trimText(preview, 110)}</summary>
      <pre>{output}</pre>
    </details>
  );
}

export function TokenUsageStrip({ block }: { block: TerminalBlock }) {
  const data = asEventRecord(block.events[0]?.data);
  const usage = asEventRecord(data.usage);
  const pairs = Object.entries(usage).filter(([, value]) => typeof value === "number");
  return (
    <div className="token-usage-strip">
      {pairs.length ? pairs.map(([key, value]) => <span key={key}>{eventLabel(key)} {String(value)}</span>) : <span>{block.messages.join("").trim() || "Token usage"}</span>}
    </div>
  );
}

export function FormattedMessage({ text }: { text: string }) {
  const nodes = formattedNodes(text);
  return (
    <div className="formatted-message">
      {nodes.map((node, index) => {
        if (node.kind === "table") return <FormattedTable key={index} rows={node.rows} />;
        if (node.kind === "codeblock") return <FormattedCodeBlock key={index} node={node} />;
        if (node.kind === "heading") return <h4 key={index}>{formatInlineMessage(node.text)}</h4>;
        if (node.kind === "li") return <li key={index}>{formatInlineMessage(node.text)}</li>;
        if (node.kind === "ol") return <div className="formatted-ordered-row" key={index}><span>{node.order}.</span><p>{formatInlineMessage(node.text)}</p></div>;
        if (node.kind === "task") return <label className="formatted-task-row" key={index}><input type="checkbox" checked={node.checked} readOnly /><span>{formatInlineMessage(node.text)}</span></label>;
        if (node.kind === "quote") return <blockquote key={index}>{formatInlineMessage(node.text)}</blockquote>;
        return <p key={index}>{formatInlineMessage(node.text)}</p>;
      })}
    </div>
  );
}

export function formattedNodes(text: string): FormattedNode[] {
  const nodes: FormattedNode[] = [];
  let tableRows: string[][] = [];
  let codeFence: { language: string | null; lines: string[] } | null = null;

  function flushTable() {
    if (tableRows.length > 0) nodes.push({ kind: "table", rows: tableRows });
    tableRows = [];
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    const fence = trimmed.match(/^```([A-Za-z0-9_-]+)?\s*$/);
    if (fence) {
      flushTable();
      if (codeFence) {
        nodes.push({ kind: "codeblock", language: codeFence.language, text: codeFence.lines.join("\n") });
        codeFence = null;
      } else {
        codeFence = { language: fence[1] ?? null, lines: [] };
      }
      continue;
    }
    if (codeFence) {
      codeFence.lines.push(line);
      continue;
    }
    if (!trimmed) {
      flushTable();
      continue;
    }
    if (isMarkdownTableLine(trimmed)) {
      if (!isMarkdownTableSeparator(trimmed)) tableRows.push(markdownTableCells(trimmed));
      continue;
    }
    flushTable();
    const task = trimmed.match(/^[-*]\s+\[(x|X| )\]\s+(.+)$/);
    if (task) {
      nodes.push({ kind: "task", text: task[2], checked: task[1].toLowerCase() === "x" });
      continue;
    }
    const ordered = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (ordered) {
      nodes.push({ kind: "ol", text: ordered[2], order: Number(ordered[1]) });
      continue;
    }
    const quote = trimmed.match(/^>\s?(.+)$/);
    if (quote) {
      nodes.push({ kind: "quote", text: quote[1] });
      continue;
    }
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      nodes.push({ kind: "li", text: bullet[1] });
      continue;
    }
    const markdownHeading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (markdownHeading) {
      nodes.push({ kind: "heading", text: markdownHeading[1] });
      continue;
    }
    nodes.push({ kind: looksLikeResultHeading(trimmed) ? "heading" : "p", text: trimmed });
  }
  if (codeFence) nodes.push({ kind: "codeblock", language: codeFence.language, text: codeFence.lines.join("\n") });
  flushTable();
  return nodes;
}

function FormattedTable({ rows }: { rows: string[][] }) {
  const [head, ...body] = rows;
  if (!head) return null;
  return (
    <div className="result-table-wrap">
      <table className="result-table">
        {body.length ? (
          <thead>
            <tr>{head.map((cell, index) => <th key={index}>{formatInlineMessage(cell)}</th>)}</tr>
          </thead>
        ) : null}
        <tbody>
          {(body.length ? body : [head]).map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{formatInlineMessage(cell)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormattedCodeBlock({ node }: { node: Extract<FormattedNode, { kind: "codeblock" }> }) {
  return (
    <div className="formatted-code-block" data-formatted-code-block={node.language ?? "plain"}>
      <header>
        <span>{node.language ?? "text"}</span>
        <button data-action-id="formatted-code.copy" type="button" onClick={() => void copyText(node.text)}>Copy</button>
      </header>
      <pre><code>{node.text}</code></pre>
    </div>
  );
}

function formatInlineMessage(text: string) {
  return inlineParts(text).map((part, index) => {
    if (part.kind === "link") return <FileReferenceChip key={index} label={part.label} path={part.target} />;
    if (part.kind === "code") return <code key={index}>{part.text}</code>;
    return <span key={index}>{part.text}</span>;
  });
}

type InlinePart =
  | { kind: "text" | "code"; text: string }
  | { kind: "link"; label: string; target: string };

function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let index = 0;
  while (index < text.length) {
    const codeStart = text.indexOf("`", index);
    const linkStart = text.indexOf("[", index);
    const nextStart = [codeStart, linkStart].filter((value) => value >= 0).sort((left, right) => left - right)[0] ?? -1;
    if (nextStart < 0) {
      if (index < text.length) parts.push({ kind: "text", text: text.slice(index) });
      break;
    }
    if (nextStart > index) parts.push({ kind: "text", text: text.slice(index, nextStart) });
    if (nextStart === codeStart) {
      const codeEnd = text.indexOf("`", codeStart + 1);
      if (codeEnd < 0) {
        parts.push({ kind: "text", text: text.slice(codeStart) });
        break;
      }
      parts.push({ kind: "code", text: text.slice(codeStart + 1, codeEnd) });
      index = codeEnd + 1;
      continue;
    }
    const link = readMarkdownLink(text, linkStart);
    if (!link) {
      parts.push({ kind: "text", text: text.slice(linkStart, linkStart + 1) });
      index = linkStart + 1;
      continue;
    }
    parts.push({ kind: "link", label: link.label, target: link.target });
    index = link.end;
  }
  return parts;
}

function readMarkdownLink(text: string, start: number): { label: string; target: string; end: number } | null {
  const labelEnd = text.indexOf("](", start);
  if (labelEnd < 0) return null;
  const targetStart = labelEnd + 2;
  let depth = 0;
  for (let cursor = targetStart; cursor < text.length; cursor += 1) {
    const char = text[cursor];
    if (char === "(") depth += 1;
    if (char === ")") {
      if (depth === 0) return { label: text.slice(start + 1, labelEnd), target: text.slice(targetStart, cursor), end: cursor + 1 };
      depth -= 1;
    }
  }
  return null;
}

export function FileReferenceChip({ label, path }: { label: string; path: string }) {
  const compact = compactFileLabel(label, path);
  return (
    <button
      className="file-reference-chip file-chip"
      data-action-id={`source-ref.copy.${actionIdSegment(path)}`}
      title={path}
      type="button"
      onClick={() => void navigator.clipboard?.writeText(path)}
    >
      {compact}
    </button>
  );
}

function actionIdSegment(value: string): string {
  return value
    .replace(/^file:\/\//u, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 72) || "item";
}

function resultSectionsForBlock(block: TerminalBlock): Array<{ label: string; message: string }> {
  if (block.events.length === 1) {
    const event = block.events[0];
    const data = asEventRecord(event.data);
    const sectionLabel = pickEventString(data, "sectionLabel") ?? event.type;
    const raw = pickEventString(data, "rawResult");
    if (event.type === "session_result" && raw) return parseResultSections(raw);
    if (["research_note", "design_decision", "tool_call", "artifact", "design_system_artifact", "session_result", "acceptance_statement"].includes(event.type) || data.sectionLabel) {
      return [{ label: sectionLabel, message: event.message }];
    }
  }
  const parsed = parseResultSections(block.messages.join("\n"));
  return parsed.length ? parsed : [{ label: block.title, message: block.messages.join("\n").trim() || block.title }];
}

function parseResultSections(text: string): Array<{ label: string; message: string }> {
  const pattern = /^\s*(?:[-*]\s*)?(?:#{1,6}\s*)?(?:\*\*)?([A-Za-z][A-Za-z0-9 _/-]{2,64})(?:\*\*)?\s*:?\s*(.*)$/;
  const sections: Array<{ label: string; lines: string[] }> = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(pattern);
    const sectionLabel = match ? normalizeResultSectionLabel(match[1]) : null;
    if (match && sectionLabel && isExplicitResultSectionLine(line, match[1])) {
      sections.push({ label: sectionLabel, lines: match[2]?.trim() ? [match[2].trim()] : [] });
      continue;
    }
    sections.at(-1)?.lines.push(line);
  }
  return sections.map((section) => ({ label: section.label, message: section.lines.join("\n").trim() })).filter((section) => section.message);
}

function isExplicitResultSectionLine(line: string, label: string): boolean {
  if (/^\s*(?:[-*]\s*)?(?:#{1,6}\s+|\*\*)/.test(line)) return true;
  return ["research_note", "design_decision", "tool_call", "artifact", "design_system_artifact", "session_result", "acceptance_statement"].includes(label.trim().toLowerCase());
}

function normalizeResultSectionLabel(label: string): string | null {
  const normalized = label.trim().replace(/[_/-]+/g, " ").replace(/\s+/g, " ").toLowerCase();
  const exact = normalized.replaceAll(" ", "_");
  if (["research_note", "design_decision", "tool_call", "artifact", "design_system_artifact", "session_result", "acceptance_statement"].includes(exact)) return exact;
  if (/^(research|research notes?|research findings?|findings|evidence)$/.test(normalized)) return "research_note";
  if (/^(design decisions?|decisions?|recommendations?)$/.test(normalized)) return "design_decision";
  if (/^(commands?|commands run|tool calls?|tools?)$/.test(normalized)) return "tool_call";
  if (/^(artifacts?|files changed|outputs?|deliverables?)$/.test(normalized)) return "artifact";
  if (/^(acceptance criteria|acceptance statement|verification|checks?)$/.test(normalized)) return "acceptance_statement";
  if (/^(summary|result|session result|next steps|handoff)$/.test(normalized)) return "session_result";
  return null;
}

function resultSectionTitle(label: string, message = ""): string {
  if (label === "artifact" || label === "design_system_artifact") {
    const artifactTitle = extractArtifactTitle(message);
    if (artifactTitle) return artifactTitle;
  }
  if (label === "research_note") return "Research";
  if (label === "design_decision") return "Decision";
  if (label === "acceptance_statement") return "Accept";
  if (label === "tool_call") return "Tools";
  if (label === "session_result") return "Verify";
  return eventLabel(label);
}

function resultSectionBody(label: string, message: string): string {
  if (label !== "artifact" && label !== "design_system_artifact") return message;
  const artifactTitle = extractArtifactTitle(message);
  if (!artifactTitle) return message;
  const lines = message.split(/\r?\n/);
  const index = lines.findIndex((line) => line.trim().replace(/:$/, "") === artifactTitle);
  if (index < 0) return message;
  return [...lines.slice(0, index), ...lines.slice(index + 1)].join("\n").trim();
}

function extractArtifactTitle(message: string): string | null {
  const first = message.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  if (!first) return null;
  const normalized = first.replace(/^#{1,6}\s+/, "").replace(/:$/, "").trim();
  if (!normalized || normalized.length > 88) return null;
  if (!/\b(design|artifact|pull|system|audit|inventory|trace)\b/i.test(normalized)) return null;
  return normalized;
}

function isMarkdownTableLine(line: string): boolean {
  return line.includes("|") && line.split("|").length >= 3;
}

function isMarkdownTableSeparator(line: string): boolean {
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(line);
}

function markdownTableCells(line: string): string[] {
  return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function looksLikeResultHeading(text: string): boolean {
  if (!text.endsWith(":")) return false;
  const normalized = text.replace(/:$/, "").trim();
  return normalized.length > 3 && normalized.length <= 80 && !normalized.includes("|");
}

function compactFileLabel(label: string, path: string): string {
  const target = path.replace(/^file:\/\//, "");
  const filename = target.split("/").at(-1) ?? label;
  const line = target.match(/:(\d+)$/)?.[1];
  return line ? `${filename.replace(/:\d+$/, "")}:${line}` : filename;
}

export function buildTerminalBlocks(input: {
  session: SessionSummary | null;
  events: StudioEvent[];
  harnessLabel: string;
  action: StudioAction;
  prompt: string;
}): TerminalBlock[] {
  const blocks: TerminalBlock[] = [];
  const hasUserChatMessage = input.events.some((event) => event.type === "chat_message");
  if (input.session && !hasUserChatMessage) {
    blocks.push({
      id: "run-context",
      kind: "run_context",
      title: "You",
      meta: `${input.harnessLabel} / ${input.action}`,
      timestamp: input.session.startedAt,
      messages: [trimText(input.prompt, 360)],
      events: [],
    });
  }

  function findMatchingToolResult(toolCall: StudioEvent, fromIndex: number): { event: StudioEvent; index: number } | null {
    const data = toolCall.data && typeof toolCall.data === "object" ? (toolCall.data as Record<string, unknown>) : {};
    const callId = typeof data.id === "string" ? data.id : typeof data.callId === "string" ? data.callId : null;
    if (!callId) return null;
    for (let index = fromIndex + 1; index < input.events.length; index += 1) {
      const candidate = input.events[index];
      if (candidate.type !== "tool_result") continue;
      const cd = candidate.data && typeof candidate.data === "object" ? (candidate.data as Record<string, unknown>) : {};
      const candidateId = typeof cd.toolUseId === "string" ? cd.toolUseId : typeof cd.tool_use_id === "string" ? cd.tool_use_id : typeof cd.id === "string" ? cd.id : null;
      if (candidateId === callId) return { event: candidate, index };
    }
    return null;
  }

  const skipEventIds = new Set<string>();
  let activeGroup: TerminalBlock | null = null;
  for (let index = 0; index < input.events.length; index += 1) {
    const event = input.events[index];
    if (event.type === "reference_trace") continue;
    if (skipEventIds.has(event.id)) continue;
    if (event.type === "tool_call") {
      const match = findMatchingToolResult(event, index);
      if (match) {
        skipEventIds.add(match.event.id);
        const data = event.data && typeof event.data === "object" ? (event.data as Record<string, unknown>) : {};
        const inputJson = typeof data.input === "object" && data.input ? JSON.stringify(data.input) : "";
        blocks.push({
          id: `tool_pair-${event.id}`,
          kind: "tool_pair",
          title: event.message,
          meta: inputJson ? trimText(inputJson, 96) : "tool call",
          timestamp: match.event.timestamp,
          messages: [event.message, match.event.message],
          data: { call: event.data, result: match.event.data },
          events: [event, match.event],
        });
        activeGroup = null;
        continue;
      }
    }
    if (event.type === "terminal_command") {
      const next = input.events[index + 1];
      const pairedOutput = next?.type === "terminal_output" ? next : null;
      blocks.push({
        id: `command_trace-${event.id}`,
        kind: "command_trace",
        title: "Command",
        meta: pairedOutput ? "command / output" : "command",
        timestamp: pairedOutput?.timestamp ?? event.timestamp,
        messages: pairedOutput ? [event.message, pairedOutput.message] : [event.message],
        data: pairedOutput?.data ?? event.data,
        events: pairedOutput ? [event, pairedOutput] : [event],
      });
      if (pairedOutput) index += 1;
      activeGroup = null;
      continue;
    }
    const kind = blockKindForEvent(event);
    if ((kind === "stdout_group" || kind === "stderr_group") && activeGroup !== null && activeGroup.kind === kind) {
      activeGroup.messages.push(event.message);
      activeGroup.events.push(event);
      activeGroup.timestamp = event.timestamp;
      continue;
    }

    activeGroup = {
      id: `${kind}-${event.id}`,
      kind,
      title: titleForBlock(kind, event),
      meta: metaForBlock(kind, event),
      timestamp: event.timestamp,
      messages: [event.message],
      data: event.data,
      events: [event],
    };
    blocks.push(activeGroup);
  }

  return ensureUniqueTerminalBlockIds(blocks);
}

function ensureUniqueTerminalBlockIds(blocks: TerminalBlock[]): TerminalBlock[] {
  const seenBlockIds = new Map<string, number>();
  return blocks.map((block) => {
    const seenCount = seenBlockIds.get(block.id) ?? 0;
    seenBlockIds.set(block.id, seenCount + 1);
    if (seenCount === 0) return block;
    return { ...block, id: `${block.id}-${seenCount + 1}` };
  });
}

function blockKindForEvent(event: StudioEvent): TerminalBlockKind {
  if (event.type === "stdout") return "stdout_group";
  if (event.type === "terminal_output") return "stdout_group";
  if (event.type === "terminal_command") return "command_trace";
  if (event.type === "stderr" || event.type === "session_error") return "stderr_group";
  if (event.type === "chat_message") return "run_context";
  if (event.type === "session_result") return "session_result";
  if (ARTIFACT_EVENT_TYPES.has(event.type)) return "artifact_group";
  if (AGENTIC_EVENT_TYPES.has(event.type)) return "agentic_group";
  return "lifecycle";
}

function titleForBlock(kind: TerminalBlockKind, event: StudioEvent): string {
  if (event.type === "chat_message") return "You";
  if (event.type === "terminal_command" || event.type === "terminal_output") return "Terminal";
  if (event.type.startsWith("research_") || event.type === "research_note") return "Research";
  if (event.type === "design_artifact" || event.type === "design_system_artifact" || event.type === "figma_candidate") return "Design";
  if (event.type === "preview_ready" || event.type === "design_preview") return "Preview";
  if (event.type === "marketplace_download") return "Marketplace";
  if (event.type === "handoff_bundle") return "Handoff";
  if (event.type === "auth_state") return "Auth";
  if (kind === "stdout_group") return "Output";
  if (kind === "stderr_group") return event.type === "session_error" ? "Error" : "Warnings";
  if (kind === "session_result") return "Result";
  if (kind === "artifact_group") return "Artifact";
  if (kind === "agentic_group") return event.type === "tool_call" ? "Tool" : eventLabel(event.type);
  return eventLabel(event.type);
}

function metaForBlock(kind: TerminalBlockKind, event: StudioEvent): string {
  if (event.type === "chat_message") {
    const data = asEventRecord(event.data);
    return [pickEventString(data, "harness"), pickEventString(data, "chatMode"), pickEventString(data, "permissionMode")]
      .filter(Boolean)
      .join(" / ") || "user";
  }
  if (event.type === "terminal_command") return "command";
  if (event.type === "terminal_output") return "output";
  if (event.type.startsWith("research_")) return eventLabel(event.type);
  if (kind === "stdout_group") return "stdout";
  if (kind === "stderr_group") return event.type === "session_error" ? "session" : "stderr";
  if (kind === "session_result") return "parsed JSON";
  if (kind === "artifact_group") return eventLabel(event.type);
  if (kind === "agentic_group") return eventLabel(event.type);
  return "lifecycle";
}
