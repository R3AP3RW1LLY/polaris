/**
 * Data-age classification (SSOT §1.2.3). Every external-data view surfaces how
 * old its data is so stale numbers are never mistaken for live ones. Pure and
 * clock-injectable so bucket boundaries are exhaustively testable. Lives in
 * shared because staleness is cross-cutting (renderer badges, main-process
 * watchdogs, ingestion services) — not a presentation concern.
 */

export type DataAgeLevel = "live" | "fresh" | "aging" | "old" | "stale" | "unknown";

export interface DataAge {
  readonly level: DataAgeLevel;
  readonly label: string;
}

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function classifyDataAge(timestamp: string | number, nowMs: number): DataAge {
  const ts = typeof timestamp === "number" ? timestamp : Date.parse(timestamp);
  if (Number.isNaN(ts)) return { level: "unknown", label: "—" };

  const age = nowMs - ts;
  if (age < 5 * SECOND) return { level: "live", label: "LIVE" };
  if (age < MINUTE) return { level: "fresh", label: `${String(Math.floor(age / SECOND))}s` };
  if (age < HOUR) return { level: "aging", label: `${String(Math.floor(age / MINUTE))}m` };
  if (age < DAY) return { level: "old", label: `${String(Math.floor(age / HOUR))}h` };
  return { level: "stale", label: "STALE" };
}
