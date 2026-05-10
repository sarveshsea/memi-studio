// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC
//
// CostHud — pinned topbar widget showing live token + dollar + cache-hit
// rate. Polls /api/usage every 3 seconds. Cache-hit rate is the silent
// killer: most users have no idea they're paying full freight on every
// prefix. Putting it on the HUD makes prompt-caching wins visible in
// real time.

import { useEffect, useState } from "react";
import { getUsageSnapshot, type StudioUsageSnapshot, type StudioUsageTotals } from "./studio-api";

interface CostHudProps {
  /** Polling interval in ms. Default 3s. */
  pollMs?: number;
  /** Optional className for outer container styling. */
  className?: string;
}

const DEFAULT_POLL_MS = 3_000;

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

function cacheHitRate(totals: StudioUsageTotals): number | null {
  if (totals.inputTokens === 0) return null;
  return Math.round((totals.cachedInputTokens / totals.inputTokens) * 100);
}

export function CostHud({ pollMs = DEFAULT_POLL_MS, className }: CostHudProps) {
  const [snapshot, setSnapshot] = useState<StudioUsageSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const next = await getUsageSnapshot();
        if (!cancelled) {
          setSnapshot(next);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(tick, pollMs);
        }
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [pollMs]);

  if (error) {
    return (
      <div
        className={`cost-hud cost-hud-error ${className ?? ""}`.trim()}
        data-cost-hud="error"
        title={error}
      >
        <span className="cost-hud-icon">⚠</span>
        <span className="cost-hud-label">cost</span>
        <span className="cost-hud-value">—</span>
      </div>
    );
  }

  const totals = snapshot?.totals;
  const hitRate = totals ? cacheHitRate(totals) : null;
  const tokensTotal = totals?.totalTokens ?? 0;
  const cost = totals?.estimatedCostUsd ?? 0;

  // Pick the most recent active session for the per-turn view.
  const activeSession = snapshot?.sessions?.find((s) => s.status === "running")
    ?? snapshot?.sessions?.[0]
    ?? null;

  return (
    <div
      className={`cost-hud ${className ?? ""}`.trim()}
      data-cost-hud="ok"
      data-cache-hit-rate={hitRate ?? "n/a"}
      title={
        snapshot
          ? `Total: ${formatTokens(tokensTotal)} tokens • ${formatCost(cost)}` +
            (hitRate !== null ? ` • cache hit ${hitRate}%` : "") +
            (activeSession
              ? `\nActive session ${activeSession.id} (${activeSession.harness}): ${formatTokens(activeSession.totals.totalTokens)} • ${formatCost(activeSession.totals.estimatedCostUsd)}`
              : "")
          : "Loading usage…"
      }
      aria-live="polite"
    >
      <span className="cost-hud-segment cost-hud-tokens" data-cost-hud-segment="tokens">
        <span className="cost-hud-segment-label">tok</span>
        <span className="cost-hud-segment-value">{formatTokens(tokensTotal)}</span>
      </span>
      <span className="cost-hud-segment cost-hud-cost" data-cost-hud-segment="cost">
        <span className="cost-hud-segment-label">cost</span>
        <span className="cost-hud-segment-value">{formatCost(cost)}</span>
      </span>
      {hitRate !== null && (
        <span
          className={`cost-hud-segment cost-hud-cache ${hitRate >= 50 ? "cost-hud-cache-good" : hitRate >= 20 ? "cost-hud-cache-mid" : "cost-hud-cache-poor"}`}
          data-cost-hud-segment="cache"
          data-cache-hit-status={hitRate >= 50 ? "good" : hitRate >= 20 ? "mid" : "poor"}
          title={`Prompt cache hit rate: ${hitRate}%${hitRate < 20 ? " — likely paying full price on prefixes" : ""}`}
        >
          <span className="cost-hud-segment-label">cache</span>
          <span className="cost-hud-segment-value">{hitRate}%</span>
        </span>
      )}
    </div>
  );
}
