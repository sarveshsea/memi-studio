// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Design-system review surface, agentic contract + token previews, and the
// design changelog page. Imports only from leaf modules (shared, icons) and
// studio-api types.

import { type FormEvent, type ReactNode, memo, useEffect, useState } from "react";
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
import { type StudioTraceModel, type StudioTraceTask } from "../runtime/index.js";
import { WorkbenchPanel } from "../studio-primitives";
import {
  WORKBENCH_ACTIONS,
  WORKBENCH_COPY,
  type WorkbenchActionCopy,
  type WorkbenchIconName,
} from "../workbench-copy";
import {
  compactRunLabel,
  compactRunSummary,
  currentWorkspaceProject,
  harnessVisibility,
  isPrimaryHarness,
  isVerificationRunText,
  sidebarNavigationSessions,
} from "../studio-workbench";
import { MEMOIRE_PACKAGE_NAME, MEMOIRE_PACKAGE_VERSION, MEMOIRE_STUDIO_VERSION } from "../runtime/package-info";
import {
  ActionChip,
  FigmaLogoMark,
  IconButton,
  MemoireLogoMark,
  SidebarIcon,
  StudioControlIcon,
  StudioLineIcon,
  type StudioControlIconName,
} from "./icons";
import {
  type FormattedNode,
  type OutputTabId,
  type ResearchSource,
  type TerminalBlock,
  type TerminalBlockKind,
  type WorkPacketStarter,
  AGENTIC_EVENT_TYPES,
  ARTIFACT_EVENT_TYPES,
  OUTPUT_TABS,
  activityGlyph,
  activityMeta,
  artifactCardsFromPacket,
  asEventRecord,
  compactName,
  copyText,
  deriveOutputItems,
  deriveSessionStatus,
  displaySourceLabel,
  eventLabel,
  expectedDmgPath,
  figmaStatusLabel,
  filterContextItems,
  filterKnowledgeItems,
  filterTerminalBlocksByQuery,
  firstMeaningfulLine,
  formatDataPreview,
  formatLogPayload,
  formatTime,
  groupSessionsByProject,
  isFigmaBridgeRunning,
  isFigmaPluginConnected,
  knowledgeKindLabel,
  marketplaceNoteFreshness,
  marketplaceSourceBucket,
  marketplaceSourceLabel,
  memoryFilterCounts,
  outputEventMatches,
  outputItemMatches,
  pickEventString,
  researchSourcesFromEvents,
  stripAnsi,
  trimText,
  workArtifactKindFromEvent,
  workArtifactKindLabel,
} from "./shared";
import { FileReferenceChip } from "./terminal";

type AgenticOpenSourceReferences = NonNullable<NonNullable<DesignSystemArtifact["agentic"]>["openSourceReferences"]>;
type AgenticInteractionPatterns = NonNullable<NonNullable<DesignSystemArtifact["agentic"]>["interactionPatterns"]>;

function DesignSystemReviewSurfaceImpl(props: {
  artifact: DesignSystemArtifact | null;
  figmaStatus?: FigmaStatus | null;
  onReviewSection: (
    artifactId: string,
    sectionId: string,
    reviewState: DesignSystemArtifactReviewState,
    comment?: string,
  ) => void | Promise<void>;
  onFixSection: (
    artifactId: string,
    sectionId: string,
    comment?: string,
  ) => void | Promise<void>;
  onSaveArtifact: (artifact: DesignSystemArtifact) => void | Promise<void>;
  onUseSystem: (artifact: DesignSystemArtifact) => void;
}) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [pendingReviewKey, setPendingReviewKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<DesignSystemArtifact | null>(props.artifact);
  const [savingArtifact, setSavingArtifact] = useState(false);
  const artifact = props.artifact;
  const visibleArtifact = draft ?? artifact;
  const draftDirty = Boolean(artifact && draft && JSON.stringify(draft) !== JSON.stringify(artifact));

  useEffect(() => {
    setDraft(artifact);
    if (!artifact) {
      setOpenSections(new Set());
      return;
    }
    const needsWork = artifact.sections.filter((section) => section.reviewState === "needs_work").map((section) => section.id);
    const firstUnreviewed = artifact.sections.find((section) => section.reviewState === "unreviewed")?.id;
    setOpenSections(new Set([...needsWork, ...(firstUnreviewed ? [firstUnreviewed] : [])]));
  }, [artifact?.id, artifact?.updatedAt]);

  function toggle(sectionId: string) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  function patchDraft(update: (current: DesignSystemArtifact) => DesignSystemArtifact) {
    setDraft((current) => current ? update(current) : current);
  }

  function patchDraftSection(sectionId: string, update: (section: DesignSystemArtifactSection) => DesignSystemArtifactSection) {
    patchDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === sectionId ? update(section) : section),
    }));
  }

  async function saveDraft() {
    if (!draft || !draftDirty) return;
    setSavingArtifact(true);
    try {
      await props.onSaveArtifact(draft);
    } finally {
      setSavingArtifact(false);
    }
  }

  async function handleReview(section: DesignSystemArtifactSection, reviewState: DesignSystemArtifactReviewState) {
    if (!visibleArtifact) return;
    const key = `${section.id}:${reviewState}`;
    const comment = reviewState === "needs_work"
      ? `${section.title} needs a scoped agent fix.`
      : `${section.title} verified in Studio.`;
    const nextDraft = {
      ...visibleArtifact,
      sections: visibleArtifact.sections.map((candidate) =>
        candidate.id === section.id ? { ...candidate, reviewState } : candidate,
      ),
    };
    setPendingReviewKey(key);
    setDraft(nextDraft);
    try {
      if (draftDirty) await props.onSaveArtifact(nextDraft);
      if (reviewState === "needs_work") {
        await props.onFixSection(visibleArtifact.id, section.id, comment);
      } else {
        await props.onReviewSection(visibleArtifact.id, section.id, reviewState, comment);
      }
      setOpenSections((current) => new Set([...current, section.id]));
    } finally {
      setPendingReviewKey(null);
    }
  }

  if (!visibleArtifact) {
    return (
      <section className="design-system-review empty-review" data-design-system-artifact="review-surface" aria-label="Design system artifact">
        <header className="artifact-review-head">
          <div>
            <p className="eyebrow">Design system</p>
            <h2>Memory</h2>
          </div>
          <span>idle</span>
        </header>
      </section>
    );
  }

  return (
    <section className="design-system-review" data-design-system-artifact="review-surface" data-artifact-acceptance-state={visibleArtifact.status} data-artifact-dirty={String(draftDirty)} aria-label={visibleArtifact.title}>
      <header className="artifact-review-head">
        <div>
          <p className="eyebrow">Review</p>
          <label className="artifact-title-editor">
            <span>Title</span>
            <input
              value={visibleArtifact.title}
              onChange={(event) => patchDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <p>{visibleArtifact.createdByHarness} / {visibleArtifact.sourceWorkspace ? displaySourceLabel(visibleArtifact.sourceWorkspace) : "local"}</p>
        </div>
        <div className="artifact-review-actions">
          <label>
            <span>Status</span>
            <select
              value={visibleArtifact.status}
              onChange={(event) => patchDraft((current) => ({ ...current, status: event.target.value as DesignSystemArtifact["status"] }))}
            >
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="published">Published</option>
            </select>
          </label>
          <button data-action-id="artifact.save" type="button" onClick={() => void saveDraft()} disabled={!draftDirty || savingArtifact}>
            {savingArtifact ? "Saving" : draftDirty ? "Save" : "Saved"}
          </button>
          <button data-action-id="artifact.use-system" type="button" onClick={() => props.onUseSystem(visibleArtifact)}>Use</button>
        </div>
      </header>

      <DesignSystemSandbox artifact={visibleArtifact} figmaStatus={props.figmaStatus ?? null} />
      <AgenticDesignSystemContract artifact={visibleArtifact} />
      <SourceReferenceChips refs={visibleArtifact.sourceRefs.slice(0, 8)} />
      <ArtifactResolvedEvidence artifact={visibleArtifact} />

      <div className="artifact-review-list">
        {visibleArtifact.sections.map((section) => {
          const open = openSections.has(section.id);
          return (
            <article className="review-section" data-review-section={section.kind} data-review-state={section.reviewState} key={section.id}>
              <button className="review-section-trigger" data-action-id={`artifact.section.${section.kind}`} type="button" onClick={() => toggle(section.id)}>
                <span>{open ? "v" : ">"}</span>
                <strong>{section.title}</strong>
                <small>{section.summary}</small>
                <em>{reviewStateLabel(section.reviewState)}</em>
              </button>
              {open ? (
                <div className="review-section-body">
                  <div className="review-toolbar">
                    <label>
                      <span>State</span>
                      <select
                        value={section.reviewState}
                        onChange={(event) => patchDraftSection(section.id, (current) => ({ ...current, reviewState: event.target.value as DesignSystemArtifactReviewState }))}
                      >
                        <option value="unreviewed">Unreviewed</option>
                        <option value="looks_good">Looks good</option>
                        <option value="needs_work">Needs work</option>
                      </select>
                    </label>
                    <button
                      aria-pressed={section.reviewState === "looks_good"}
                      disabled={pendingReviewKey === `${section.id}:looks_good`}
                      data-action-id={`artifact.review.${section.kind}.looks_good`}
                      data-review-action="looks_good"
                      type="button"
                      onClick={() => void handleReview(section, "looks_good")}
                    >
                      OK
                    </button>
                    <button
                      aria-pressed={section.reviewState === "needs_work"}
                      disabled={pendingReviewKey === `${section.id}:needs_work`}
                      data-action-id={`artifact.review.${section.kind}.needs_work`}
                      data-review-action="needs_work"
                      type="button"
                      onClick={() => void handleReview(section, "needs_work")}
                    >
                      Fix
                    </button>
                  </div>
                  <label className="artifact-section-editor">
                    <span>Summary</span>
                    <input
                      value={section.summary}
                      onChange={(event) => patchDraftSection(section.id, (current) => ({ ...current, summary: event.target.value }))}
                    />
                  </label>
                  <label className="artifact-section-editor">
                    <span>Content</span>
                    <textarea
                      value={section.content}
                      onChange={(event) => patchDraftSection(section.id, (current) => ({ ...current, content: event.target.value }))}
                    />
                  </label>
                  <ArtifactPreview artifact={visibleArtifact} section={section} />
                  <SourceReferenceChips refs={section.sourceRefs} />
                  <label className="artifact-section-editor">
                    <span>Comments</span>
                    <textarea
                      value={section.comments.join("\n")}
                      onChange={(event) => patchDraftSection(section.id, (current) => ({ ...current, comments: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) }))}
                      placeholder="Add review comments..."
                    />
                  </label>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ArtifactResolvedEvidence({ artifact }: { artifact: DesignSystemArtifact }) {
  const assets = artifact.assets ?? [];
  const tokens = displayableDesignTokens(artifact);
  if (assets.length === 0 && tokens.length === 0) return null;
  return (
    <div className="artifact-resolved-evidence" data-artifact-assets="resolved" data-token-evidence="resolved">
      {assets.length ? (
        <section>
          <strong>Resolved assets</strong>
          {assets.slice(0, 6).map((asset) => (
            <span key={asset.id}>{asset.label}</span>
          ))}
        </section>
      ) : null}
      {tokens.length ? (
        <section>
          <strong>Token evidence</strong>
          {tokens.slice(0, 8).map((token) => (
            <span key={token.id}>{token.name}: {token.value}</span>
          ))}
        </section>
      ) : null}
    </div>
  );
}

type DesignSystemResolvedTokenItem = NonNullable<DesignSystemArtifact["tokens"]>[number];
const TYPOGRAPHY_TOKEN_KINDS = new Set<DesignSystemResolvedTokenItem["kind"]>(["typography"]);
const COLOR_TOKEN_KINDS = new Set<DesignSystemResolvedTokenItem["kind"]>(["color"]);
const SPACE_TOKEN_KINDS = new Set<DesignSystemResolvedTokenItem["kind"]>(["spacing", "radius", "shadow"]);

function displayableDesignTokens(
  artifact: DesignSystemArtifact,
  kinds?: ReadonlySet<DesignSystemResolvedTokenItem["kind"]>,
): DesignSystemResolvedTokenItem[] {
  return (artifact.tokens ?? []).filter((token) => {
    if (kinds && !kinds.has(token.kind)) return false;
    return isDisplayableDesignToken(token);
  });
}

function isDisplayableDesignToken(token: DesignSystemResolvedTokenItem): boolean {
  const name = token.name.trim();
  const value = token.value.trim();
  if (!name || !value) return false;
  const raw = `${name} ${value}`;
  if (/[{}]/.test(raw)) return false;
  if (/"[^"]+"\s*:/.test(raw)) return false;
  if (/"(?:id|kind|title|summary|content|label|value|section)"\s*:/i.test(raw)) return false;
  if (/\b(?:sectionId|sourceRefs|preview|state)\b/i.test(raw)) return false;
  if (name.length > 72 || value.length > 96) return false;
  return true;
}

export function SourceReferenceChips({ refs }: { refs: DesignSystemArtifact["sourceRefs"] }) {
  if (refs.length === 0) return null;
  return (
    <div className="source-reference-chips" data-source-reference-chips>
      {refs.map((ref) => (
        <FileReferenceChip
          key={ref.id}
          label={ref.label}
          path={`${ref.sourcePath ?? ref.url ?? ref.label}${ref.line ? `:${ref.line}` : ""}`}
        />
      ))}
    </div>
  );
}

function DesignSystemSandbox({ artifact, figmaStatus }: { artifact: DesignSystemArtifact; figmaStatus: FigmaStatus | null }) {
  const bridge = isFigmaPluginConnected(figmaStatus) ? "plugin connected" : isFigmaBridgeRunning(figmaStatus) ? "bridge running" : "bridge stopped";
  return (
    <section className="design-system-sandbox" data-design-system-sandbox="local-container">
      <article className="metric-chip"><strong>Refs</strong><span>{artifact.sections.length} / {artifact.sourceRefs.length}</span></article>
      <article className="metric-chip"><strong>Agent</strong><span>{artifact.createdByHarness}</span></article>
      <article className="metric-chip"><strong>Figma</strong><span>{bridge}{figmaStatus?.port ? ` / :${figmaStatus.port}` : ""}</span></article>
      <article className="metric-chip"><strong>Handoff</strong><span>tokens / components</span></article>
    </section>
  );
}

function AgenticDesignSystemContract({ artifact }: { artifact: DesignSystemArtifact }) {
  const contract = artifact.agentic;
  if (!contract) return null;
  const roles = contract.roles;
  const references: AgenticOpenSourceReferences = contract.openSourceReferences ?? [];
  const patterns: AgenticInteractionPatterns = contract.interactionPatterns ?? [];
  if (roles.length === 0) return null;
  return (
    <section className="agentic-design-system" data-agentic-design-system="role-contract-collapsed">
      <header className="agentic-contract-summary">
        <strong>Agentic contract</strong>
        <span>{contract.source.name} / {formatAgenticContractAccess(contract.source.access)}</span>
      </header>
      <div className="agentic-role-strip">
        {roles.map((role) => (
          <article className="agentic-role-card" data-agentic-role-card={role.id} key={role.id}>
            <strong>{role.label}</strong>
            <span>{formatAgenticContractTerm(role.atomicLevel)}</span>
            <small>{role.requiredSignals.slice(0, 2).map(formatAgenticContractTerm).join(" / ")}</small>
          </article>
        ))}
      </div>
      {contract.outputSections.length ? (
        <div className="agentic-output-contract">
          <span>{contract.outputSections.map(formatAgenticContractTerm).join(" / ")}</span>
        </div>
      ) : null}
      {references.length || patterns.length ? (
        <details className="agentic-pattern-disclosure">
          <summary>Sources</summary>
          <div className="agentic-pattern-source-list" data-agentic-pattern-source="artifact-contract">
            {references.slice(0, 6).map((reference) => (
              <article className="agentic-pattern-source-card" data-agentic-pattern-source={reference.name} key={reference.name}>
                <strong>{reference.name}</strong>
                <span>{reference.license} / {formatAgenticContractTerm(reference.category)}</span>
                <small>{reference.mappedRoles.map(formatAgenticContractTerm).join(" / ")}</small>
              </article>
            ))}
          </div>
          <div className="agentic-interaction-pattern-list">
            {patterns.slice(0, 5).map((pattern) => (
              <article className="agentic-role-card" data-agentic-pattern={pattern.id} key={pattern.id}>
                <strong>{pattern.label}</strong>
                <span>{pattern.source}</span>
                <small>{pattern.requiredSignals.map(formatAgenticContractTerm).join(" / ")}</small>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function formatAgenticContractAccess(value: string): string {
  if (value === "public-preview") return "Preview reference";
  return formatAgenticContractTerm(value);
}

function formatAgenticContractTerm(value: string): string {
  const normalized = value.trim().replace(/[_/-]+/g, " ").replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function ArtifactPreview({ artifact, section }: { artifact: DesignSystemArtifact; section: DesignSystemArtifactSection }) {
  if (section.preview.kind === "brand") return <BrandPreview artifact={artifact} section={section} />;
  if (section.preview.kind === "typography") return <TypographyPreview artifact={artifact} section={section} />;
  if (section.preview.kind === "tokens") return <TokenPreview artifact={artifact} section={section} />;
  if (section.preview.kind === "spacing") return <SpacingPreview artifact={artifact} section={section} />;
  if (section.preview.kind === "components") return <ComponentPreview artifact={artifact} section={section} />;
  return (
    <div className={`artifact-preview preview-${section.preview.kind}`} data-artifact-preview={section.preview.kind}>
      {section.preview.items.map((item, index) => (
        <article key={`${section.id}-preview-${index}`}>
          <strong>{item.label}</strong>
          <span>{item.value}</span>
          {item.detail ? <small>{item.detail}</small> : null}
        </article>
      ))}
    </div>
  );
}

function BrandPreview({ artifact, section }: { artifact: DesignSystemArtifact; section: DesignSystemArtifactSection }) {
  const assets = (artifact.assets ?? []).filter((asset) => asset.kind === "brand" || asset.kind === "logo").slice(0, 6);
  if (assets.length) {
    return (
      <div className="artifact-preview visual-reference brand-reference" data-artifact-preview="brand-lockups">
        {assets.map((asset) => (
          <article key={asset.id}>
            {asset.previewUrl ? <img className="brand-asset-img" alt={asset.label} src={asset.previewUrl} /> : <span className="brand-mark" aria-hidden="true">{asset.label.slice(0, 1)}</span>}
            <strong>{asset.label}</strong>
            <small>{displaySourceLabel(asset.sourcePath)}</small>
          </article>
        ))}
      </div>
    );
  }
  if (!section.preview.items.length) return null;
  return (
    <div className="artifact-preview visual-reference brand-reference" data-artifact-preview="brand-lockups">
      {section.preview.items.map((item, index) => (
        <article key={`${section.id}-brand-${index}`}>
          <span className="brand-mark" aria-hidden="true">{item.label.slice(0, 1)}</span>
          <strong>{item.label}</strong>
          {item.value ? <small>{item.value}</small> : null}
        </article>
      ))}
    </div>
  );
}

function TypographyPreview({ artifact, section }: { artifact: DesignSystemArtifact; section: DesignSystemArtifactSection }) {
  const typeTokens = displayableDesignTokens(artifact, TYPOGRAPHY_TOKEN_KINDS).slice(0, 4);
  const rows = typeTokens.length
    ? typeTokens.map((token) => ({ label: `${token.name} / ${token.line ?? "src"}`, value: token.value }))
    : section.preview.items.map((item) => ({ label: item.label, value: item.value || item.detail || "" })).filter((item) => item.value.trim().length > 0);
  if (!rows.length) return null;
  return (
    <div className="typography-reference visual-reference" data-artifact-preview="type-ramp">
      {rows.map((row, index) => (
        <p className={`type-sample type-sample-${index}`} key={`${row.label}-${index}`}><span>{row.label}</span>{row.value}</p>
      ))}
    </div>
  );
}

function TokenPreview({ artifact, section }: { artifact: DesignSystemArtifact; section: DesignSystemArtifactSection }) {
  const resolved = displayableDesignTokens(artifact, COLOR_TOKEN_KINDS).slice(0, 12);
  if (resolved.length) {
    return (
      <div className="token-reference visual-reference" data-artifact-preview="token-swatches">
        {resolved.map((token) => <article key={token.id}><span style={{ background: token.value }} /><strong>{token.name}</strong><small>{token.value}</small></article>)}
      </div>
    );
  }
  return <PreviewItemList section={section} />;
}

function SpacingPreview({ artifact, section }: { artifact: DesignSystemArtifact; section: DesignSystemArtifactSection }) {
  const resolved = displayableDesignTokens(artifact, SPACE_TOKEN_KINDS).slice(0, 6);
  if (resolved.length) {
    return (
      <div className="spacing-reference visual-reference" data-artifact-preview="spacing-scale">
        {resolved.map((token) => <article key={token.id}><span /><strong>{token.name}</strong><small>{token.value}</small></article>)}
      </div>
    );
  }
  return <PreviewItemList section={section} />;
}

function ComponentPreview({ artifact, section }: { artifact: DesignSystemArtifact; section: DesignSystemArtifactSection }) {
  const componentTokens = displayableDesignTokens(artifact).filter((token) => token.kind !== "color").slice(0, 6);
  const tokenRefs = componentTokens.map((token) => token.name).join(" / ");
  const sourceRefs = section.sourceRefs.slice(0, 3).map((ref) => ref.label).join(" / ");
  return (
    <div className="component-reference visual-reference" data-artifact-preview="component-playground">
      <div className="component-lab" data-component-lab="playground-sandbox">
        <div className="component-stage">
          {section.preview.items.map((item, index) => (
            <article key={`${section.id}-component-${index}`}>
              <strong>{item.label}</strong>
              {item.value ? <span>{item.value}</span> : null}
              {item.detail ? <small>{item.detail}</small> : null}
            </article>
          ))}
        </div>
        <aside className="component-inspector" data-component-inspector="props-tokens-source">
          {tokenRefs || sourceRefs ? <strong>Evidence</strong> : null}
          {tokenRefs || sourceRefs ? <span>{tokenRefs || sourceRefs}</span> : null}
          <strong>Agent output</strong><span>{section.summary}</span>
        </aside>
      </div>
    </div>
  );
}

function PreviewItemList({ section }: { section: DesignSystemArtifactSection }) {
  if (!section.preview.items.length) return null;
  return (
    <div className={`artifact-preview preview-${section.preview.kind}`} data-artifact-preview={section.preview.kind}>
      {section.preview.items.map((item, index) => (
        <article key={`${section.id}-preview-item-${index}`}>
          <strong>{item.label}</strong>
          {item.value ? <span>{item.value}</span> : null}
          {item.detail ? <small>{item.detail}</small> : null}
        </article>
      ))}
    </div>
  );
}

function reviewStateLabel(state: DesignSystemArtifactReviewState): string {
  if (state === "looks_good") return "looks good";
  if (state === "needs_work") return "needs work";
  return "needs review";
}

type DesignChangelogFilter = "all" | "agent" | "manual" | "needs-evidence" | "archived";

function DesignChangelogPageImpl(props: {
  entries: DesignChangelogEntry[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
  onCreate: (entry: DesignChangelogCreateInput) => void | Promise<void>;
  onUpdate: (id: string, patch: DesignChangelogPatchInput) => void | Promise<void>;
  onArchive: (id: string) => void | Promise<void>;
  onRestore: (id: string) => void | Promise<void>;
  onExport: () => void | Promise<void>;
}) {
  const [filter, setFilter] = useState<DesignChangelogFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => changelogDraft());
  const filteredEntries = props.entries.filter((entry) => matchesDesignChangelogFilter(entry, filter));
  const selectedEntry = editingId ? props.entries.find((entry) => entry.id === editingId) ?? null : null;

  function openNewEntry() {
    setEditingId(null);
    setDraft(changelogDraft());
  }

  function openEntry(entry: DesignChangelogEntry) {
    setEditingId(entry.id);
    setDraft(changelogDraft(entry));
  }

  function saveEntry() {
    const tags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    const payload = {
      title: draft.title,
      summary: draft.summary,
      bodyMarkdown: draft.bodyMarkdown,
      tags,
      authoredBy: "human" as const,
      sessionId: selectedEntry?.sessionId ?? null,
      harness: selectedEntry?.harness ?? null,
      action: selectedEntry?.action ?? null,
      eventIds: selectedEntry?.eventIds ?? [],
      fileRefs: selectedEntry?.fileRefs ?? [],
      captureWarnings: selectedEntry?.captureWarnings ?? [],
    };
    if (selectedEntry) void props.onUpdate(selectedEntry.id, payload);
    else void props.onCreate(payload);
  }

  return (
    <section className="design-changelog-page" data-design-changelog-page="design-memory" aria-label="Design changelog">
      <header className="design-changelog-header">
        <div>
          <p className="eyebrow">Changelog / Design memory</p>
          <h2>Design decisions and system changes</h2>
          <span>{props.entries.length} local entries in .memoire/project-memory/changelog</span>
        </div>
        <div className="design-changelog-actions">
          <button data-action-id="design-changelog.refresh" type="button" onClick={() => void props.onRefresh()} disabled={props.loading}>
            {props.loading ? "Refreshing" : "Refresh"}
          </button>
          <button data-action-id="design-changelog.new" type="button" onClick={openNewEntry}>New entry</button>
          <button data-action-id="design-changelog.export" type="button" onClick={() => void props.onExport()}>Export</button>
        </div>
      </header>

      <div className="design-changelog-filters" role="tablist" aria-label="Changelog filters">
        <button aria-selected={filter === "all"} className={filter === "all" ? "active" : ""} data-design-changelog-filter="all" data-action-id="design-changelog.filter.all" type="button" onClick={() => setFilter("all")}>All</button>
        <button aria-selected={filter === "agent"} className={filter === "agent" ? "active" : ""} data-design-changelog-filter="agent" data-action-id="design-changelog.filter.agent" type="button" onClick={() => setFilter("agent")}>Agent captured</button>
        <button aria-selected={filter === "manual"} className={filter === "manual" ? "active" : ""} data-design-changelog-filter="manual" data-action-id="design-changelog.filter.manual" type="button" onClick={() => setFilter("manual")}>Manual</button>
        <button aria-selected={filter === "needs-evidence"} className={filter === "needs-evidence" ? "active" : ""} data-design-changelog-filter="needs-evidence" data-action-id="design-changelog.filter.needs-evidence" type="button" onClick={() => setFilter("needs-evidence")}>Needs evidence</button>
        <button aria-selected={filter === "archived"} className={filter === "archived" ? "active" : ""} data-design-changelog-filter="archived" data-action-id="design-changelog.filter.archived" type="button" onClick={() => setFilter("archived")}>Archived</button>
      </div>

      {props.error ? <p className="design-changelog-warning">{props.error}</p> : null}

      <div className="design-changelog-layout">
        <div className="design-changelog-list" data-design-changelog-list="timeline">
          {filteredEntries.map((entry) => (
            <article className="design-changelog-card" data-design-changelog-entry={entry.id} data-status={entry.status} key={entry.id}>
              <button data-action-id={`design-changelog.edit.${entry.id}`} type="button" onClick={() => openEntry(entry)}>
                <span>{entry.authoredBy === "human" ? "Manual" : "Agent captured"}</span>
                <strong>{entry.title}</strong>
                <small>{entry.harness ?? "studio"} / {entry.action ?? "design"} / {formatTime(entry.updatedAt)}</small>
                <p>{entry.summary}</p>
                <span>{entry.tags.slice(0, 4).join(" / ") || "untagged"}</span>
                <span>{entry.fileRefs.length} files / {entry.eventIds.length} events</span>
              </button>
              {entry.captureWarnings.length > 0 ? (
                <p className="design-changelog-warning">{entry.captureWarnings[0]}</p>
              ) : null}
            </article>
          ))}
          {filteredEntries.length === 0 ? <p className="empty">No changelog entries for this filter.</p> : null}
        </div>

        <aside className="design-changelog-editor" data-design-changelog-editor="local-project-memory" aria-label="Changelog editor">
          <div className="drawer-section-head">
            <span>{selectedEntry ? "Edit entry" : "New entry"}</span>
            <small>{selectedEntry?.status ?? "active"}</small>
          </div>
          <label>
            <span>Title</span>
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            <span>Summary</span>
            <input value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
          </label>
          <label>
            <span>Tags</span>
            <input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="tokens, figma, studio" />
          </label>
          <label>
            <span>Markdown body</span>
            <textarea value={draft.bodyMarkdown} onChange={(event) => setDraft((current) => ({ ...current, bodyMarkdown: event.target.value }))} />
          </label>
          {selectedEntry ? (
            <div className="design-changelog-file-refs" data-design-changelog-file-refs="linked-evidence">
              <strong>Evidence</strong>
              <span>{selectedEntry.sessionId ?? "manual entry"}</span>
              {selectedEntry.fileRefs.slice(0, 6).map((file) => (
                <small key={file.path}>{file.path} / {file.kind} / +{file.insertions} -{file.deletions}</small>
              ))}
              {selectedEntry.captureWarnings.map((warning) => (
                <p className="design-changelog-warning" key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
          <div className="design-changelog-editor-actions">
            <button data-action-id="design-changelog.save" type="button" onClick={saveEntry} disabled={!draft.title.trim() || !draft.summary.trim()}>Save</button>
            {selectedEntry?.status === "archived" ? (
              <button data-action-id={`design-changelog.restore.${selectedEntry.id}`} type="button" onClick={() => void props.onRestore(selectedEntry.id)}>Restore</button>
            ) : null}
            {selectedEntry && selectedEntry.status !== "archived" ? (
              <button data-action-id={`design-changelog.archive.${selectedEntry.id}`} type="button" onClick={() => void props.onArchive(selectedEntry.id)}>Archive</button>
            ) : null}
            <button data-action-id="design-changelog.cancel" type="button" onClick={openNewEntry}>Clear</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function changelogDraft(entry?: DesignChangelogEntry) {
  return {
    title: entry?.title ?? "",
    summary: entry?.summary ?? "",
    bodyMarkdown: entry?.bodyMarkdown ?? "## Decision\n\n\n## Evidence\n\n",
    tags: entry?.tags.join(", ") ?? "",
  };
}

function matchesDesignChangelogFilter(entry: DesignChangelogEntry, filter: DesignChangelogFilter): boolean {
  if (filter === "archived") return entry.status === "archived";
  if (entry.status === "archived") return false;
  if (filter === "agent") return entry.authoredBy !== "human";
  if (filter === "manual") return entry.authoredBy === "human";
  if (filter === "needs-evidence") return entry.captureWarnings.length > 0 || entry.fileRefs.length === 0;
  return true;
}

// Memoized exports: these surfaces are expensive and only need to re-render when
// their (now stabilized) props change. See src/use-stable-callback.ts.
export const DesignSystemReviewSurface = memo(DesignSystemReviewSurfaceImpl);
export const DesignChangelogPage = memo(DesignChangelogPageImpl);
