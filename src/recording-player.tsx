// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Cluster D — Feature 8: Browser session recording player.
 *
 * Renders an HTML5 `<video>` plus a chapter rail underneath. Chapter clicks
 * bubble through `onSeek` so the parent can also wire other side-effects
 * (analytics, deep-linking, etc.).
 *
 * The component intentionally does not assume a video file is present — the
 * recording manifest may exist before the assembled video does. When `videoSrc`
 * is omitted the player renders a placeholder and the chapter rail remains
 * usable for navigation.
 */

export interface RecordingChapter {
  /** Chapter number (1-indexed). */
  readonly number: number;
  /** Display title — falls back to "Chapter N" when empty. */
  readonly title: string;
  /** Frame index this chapter starts at. */
  readonly startFrame: number;
  /** Frame index this chapter ends at (inclusive). */
  readonly endFrame: number;
  /** Duration in milliseconds. */
  readonly durationMs: number;
  /** Optional time offset in seconds, used when seeking the underlying video. */
  readonly startSeconds?: number;
}

export interface RecordingPlayerProps {
  readonly chapters: ReadonlyArray<RecordingChapter>;
  readonly onSeek?: (chapterIdx: number) => void;
  /** Optional video URL — when omitted the player renders a placeholder. */
  readonly videoSrc?: string;
  /** Optional poster image displayed before playback. */
  readonly posterSrc?: string;
  /** Used to set an accessible label on the surface. */
  readonly title?: string;
}

export default function RecordingPlayer(props: RecordingPlayerProps) {
  const { chapters, onSeek, videoSrc, posterSrc, title } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeChapter, setActiveChapter] = useState<number>(0);

  const safeChapters = useMemo<RecordingChapter[]>(
    () =>
      chapters.map((chapter, index) => ({
        ...chapter,
        title: chapter.title?.trim().length ? chapter.title : `Chapter ${index + 1}`,
      })),
    [chapters],
  );

  const handleSeek = useCallback(
    (idx: number) => {
      const chapter = safeChapters[idx];
      if (!chapter) return;
      setActiveChapter(idx);
      const video = videoRef.current;
      if (video && typeof chapter.startSeconds === "number" && Number.isFinite(chapter.startSeconds)) {
        try {
          video.currentTime = Math.max(0, chapter.startSeconds);
        } catch {
          // ignore — readyState may still be 0
        }
      }
      onSeek?.(idx);
    },
    [safeChapters, onSeek],
  );

  return (
    <section className="recording-player" aria-label={title ?? "Browser session recording"}>
      <div className="recording-player-frame">
        {videoSrc ? (
          <video
            ref={videoRef}
            className="recording-player-video"
            src={videoSrc}
            poster={posterSrc}
            controls
            preload="metadata"
          />
        ) : (
          <div className="recording-player-placeholder" role="status">
            <strong>Recording manifest only</strong>
            <small>Video assembly will appear here once the ffmpeg job completes.</small>
          </div>
        )}
      </div>
      <ol className="recording-player-chapters" aria-label="Chapter rail">
        {safeChapters.length === 0 ? (
          <li className="recording-player-chapters-empty">No chapters captured yet.</li>
        ) : (
          safeChapters.map((chapter, idx) => {
            const isActive = idx === activeChapter;
            return (
              <li key={`${chapter.number}-${chapter.startFrame}`}>
                <button
                  type="button"
                  className={`recording-player-chapter${isActive ? " active" : ""}`}
                  data-recording-chapter-index={idx}
                  data-active={isActive ? "true" : "false"}
                  onClick={() => handleSeek(idx)}
                >
                  <span className="recording-player-chapter-number">{chapter.number}.</span>
                  <span className="recording-player-chapter-title">{chapter.title}</span>
                  <small className="recording-player-chapter-meta">
                    {formatRange(chapter.startFrame, chapter.endFrame)} · {formatDuration(chapter.durationMs)}
                  </small>
                </button>
              </li>
            );
          })
        )}
      </ol>
    </section>
  );
}

function formatRange(start: number, end: number): string {
  if (start === end) return `frame ${start}`;
  return `frames ${start}–${end}`;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${remainder.toString().padStart(2, "0")}s`;
}
