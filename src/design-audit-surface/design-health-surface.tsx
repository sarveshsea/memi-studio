// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

// Native "Design Health" surface: runs memi's own design-quality audit
// engine against the open workspace and renders the result as first-class
// UI (not an embedded copy of the CLI's static HTML report), reusing the
// app's own CSS custom-property tokens. New in 2.4 Phase C.

import { StudioControlIcon } from "../workbench/icons";
import type { StudioAppQualityIssue, StudioDesignAuditResult } from "../studio-api/shared-types";
import type { StudioError } from "../studio-api/errors";
import { formatScoreDelta, groupIssuesBySeverity, severityOrder, sparklineHeights, verdictTone } from "./format";

export interface DesignHealthSurfaceProps {
  result: StudioDesignAuditResult | null;
  loading: boolean;
  error: StudioError | null;
  onRunAudit: () => void;
  onCancelRun: () => void;
  onAcceptBaseline: () => void;
  runInFlight: boolean;
}

const SEVERITY_LABEL: Record<StudioAppQualityIssue["severity"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function SummaryStat(props: { label: string; value: number | string; statusAccent?: "ok" | "warn" }) {
  return (
    <div className="design-health-stat" data-status-accent={props.statusAccent}>
      <span className="design-health-stat-value">{props.value}</span>
      <span className="design-health-stat-label">{props.label}</span>
    </div>
  );
}

function IssueRow(props: { issue: StudioAppQualityIssue }) {
  const { issue } = props;
  return (
    <li className="design-health-issue" data-severity={issue.severity}>
      <div className="design-health-issue-head">
        <span className="design-health-issue-severity" data-severity={issue.severity}>{SEVERITY_LABEL[issue.severity]}</span>
        <strong>{issue.title}</strong>
        {issue.estimatedEffort ? <span className="design-health-issue-effort">{issue.estimatedEffort} fix</span> : null}
      </div>
      <p className="design-health-issue-detail">{issue.detail}</p>
      {issue.evidenceLocations?.length ? (
        <ul className="design-health-issue-evidence">
          {issue.evidenceLocations.map((location, index) => (
            <li key={`${location.file}:${location.line ?? index}`}>
              {location.file}{location.line ? `:${location.line}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="design-health-issue-recommendation">{issue.recommendation}</p>
    </li>
  );
}

function IssueSeveritySections(props: { issues: StudioAppQualityIssue[] }) {
  const grouped = groupIssuesBySeverity(props.issues);
  const nonEmpty = severityOrder().filter((severity) => grouped[severity].length > 0);
  if (nonEmpty.length === 0) {
    return <p className="design-health-empty-findings">No active findings.</p>;
  }
  return (
    <>
      {nonEmpty.map((severity) => (
        <div key={severity} className="design-health-severity-group">
          <h3>{SEVERITY_LABEL[severity]} ({grouped[severity].length})</h3>
          <ul className="design-health-issue-list">
            {grouped[severity].map((issue) => (
              <IssueRow key={`${issue.id}-${issue.affectedFiles?.join(",") ?? ""}`} issue={issue} />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function ScoreHistorySparkline(props: { history: StudioDesignAuditResult["history"] }) {
  if (props.history.length < 1) return null;
  const scores = props.history.map((entry) => entry.score);
  const heights = sparklineHeights(scores);
  return (
    <div className="design-health-sparkline" aria-hidden="true">
      {heights.map((height, index) => (
        <span
          key={index}
          className="design-health-sparkline-bar"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

export function DesignHealthSurface(props: DesignHealthSurfaceProps) {
  const { result, loading, error, onRunAudit, onCancelRun, onAcceptBaseline, runInFlight } = props;
  const tone = result ? verdictTone(result.diagnosis.summary.score) : "warn";
  const previousScore = result && result.history.length > 1 ? result.history[result.history.length - 2].score : null;
  const delta = result ? formatScoreDelta(result.diagnosis.summary.score, previousScore) : null;

  return (
    <section className="design-health-surface" data-design-health-surface>
      <header className="design-health-header">
        <div>
          <p className="eyebrow">Design Health</p>
          <h2>memi design-quality audit</h2>
        </div>
        {runInFlight ? (
          <button type="button" className="design-health-cancel" data-action-id="design-audit.cancel" onClick={onCancelRun}>
            <StudioControlIcon name="stop" /> Stop
          </button>
        ) : (
          <button type="button" className="design-health-run" data-action-id="design-audit.run" onClick={onRunAudit}>
            <StudioControlIcon name="run" /> {result ? "Re-run audit" : "Run audit"}
          </button>
        )}
      </header>

      {error ? <p className="design-health-error" role="alert">{error.message}</p> : null}

      {!result && !loading && !runInFlight ? (
        <div className="pane-empty-state">
          <h3>No design audit yet</h3>
          <p>Run your first design audit to see a score, findings, and history for this workspace.</p>
          <div className="pane-empty-state-actions">
            <button type="button" className="primary" data-action-id="design-audit.run-empty" onClick={onRunAudit}>
              <StudioControlIcon name="run" /> Run audit
            </button>
          </div>
        </div>
      ) : null}

      {result ? (
        <>
          <div className="design-health-score-row">
            <div className="design-health-score" data-verdict-tone={tone}>
              <span className="design-health-score-value">{result.diagnosis.summary.score}</span>
              <span className="design-health-score-max">/100</span>
            </div>
            <div className="design-health-score-meta">
              <span className="design-health-verdict" data-verdict-tone={tone}>{result.diagnosis.summary.verdict}</span>
              {delta ? <span className="design-health-score-delta" data-direction={delta.direction}>{delta.label}</span> : null}
            </div>
            <ScoreHistorySparkline history={result.history} />
          </div>

          <div className="design-health-stats">
            <SummaryStat label="Files scanned" value={result.diagnosis.summary.scannedFiles} />
            <SummaryStat label="Components" value={result.diagnosis.summary.components} />
            <SummaryStat label="CSS variables" value={result.diagnosis.summary.cssVariables} />
            <SummaryStat
              label="Raw hex colors"
              value={result.diagnosis.summary.hexColors}
              statusAccent={result.diagnosis.summary.hexColors === 0 ? "ok" : "warn"}
            />
          </div>

          {!result.baselineExists ? (
            <div className="design-health-no-baseline-banner">
              <p>
                No baseline yet — {result.active.length} finding(s) shown below reflect this workspace's full history,
                not just new issues.
              </p>
              <button type="button" data-action-id="design-audit.accept-baseline" onClick={onAcceptBaseline}>
                Accept current findings as baseline
              </button>
            </div>
          ) : null}

          <IssueSeveritySections issues={result.active} />

          <details className="design-health-suppressed" open={result.suppressed.length > 0}>
            <summary>{result.suppressed.length} finding(s) accepted as baseline</summary>
            {result.suppressed.length > 0 ? (
              <ul className="design-health-issue-list">
                {result.suppressed.map((issue) => (
                  <IssueRow key={`${issue.id}-${issue.affectedFiles?.join(",") ?? ""}`} issue={issue} />
                ))}
              </ul>
            ) : (
              <p className="design-health-empty-findings">Nothing suppressed.</p>
            )}
          </details>
        </>
      ) : null}
    </section>
  );
}
