import { classifyDataAge } from "@lodestar/shared";
import type { DataAgeLevel } from "@lodestar/shared";

export interface DataAgeBadgeProps {
  readonly timestamp: string | number;
  readonly source: string;
  /** Injectable clock for tests; defaults to Date.now(). */
  readonly now?: number;
}

const LEVEL_CLASSES: Record<DataAgeLevel, string> = {
  live: "border-signal-ok/60 text-signal-ok",
  fresh: "border-cyan-dim/60 text-cyan",
  aging: "border-cyan-dim/50 text-cyan",
  old: "border-signal-warn/60 text-signal-warn",
  stale: "border-signal-danger/70 text-signal-danger",
  unknown: "border-signal-skip/50 text-signal-skip",
};

/**
 * The data-provenance badge shown on every external-data view (SSOT §1.2.3).
 * The `title` attribute carries the source + exact timestamp for hover detail.
 * Staleness is conveyed by BOTH the label text and color (never color alone).
 */
export function DataAgeBadge({ timestamp, source, now }: DataAgeBadgeProps): React.JSX.Element {
  const nowMs = now ?? Date.now();
  const { level, label } = classifyDataAge(timestamp, nowMs);
  const ts = typeof timestamp === "number" ? timestamp : Date.parse(timestamp);
  const iso = Number.isNaN(ts) ? "unknown" : new Date(ts).toISOString();
  return (
    <span
      title={`${source} · ${iso}`}
      className={`clip-mfd inline-block border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${LEVEL_CLASSES[level]}`}
    >
      {label}
    </span>
  );
}
