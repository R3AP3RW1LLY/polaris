import { describe, expect, it } from "vitest";
import { classifyDataAge } from "./data-age.js";

const NOW = Date.parse("2026-07-12T12:00:00.000Z");
const ago = (ms: number): string => new Date(NOW - ms).toISOString();

describe("classifyDataAge", () => {
  it("labels sub-5s data LIVE", () => {
    expect(classifyDataAge(ago(0), NOW)).toEqual({ level: "live", label: "LIVE" });
    expect(classifyDataAge(ago(4_999), NOW)).toEqual({ level: "live", label: "LIVE" });
  });

  it("labels seconds-old data in the fresh bucket with an Ns label", () => {
    expect(classifyDataAge(ago(5_000), NOW)).toEqual({ level: "fresh", label: "5s" });
    expect(classifyDataAge(ago(59_000), NOW)).toEqual({ level: "fresh", label: "59s" });
  });

  it("labels minutes-old data in the aging bucket with an Nm label", () => {
    expect(classifyDataAge(ago(60_000), NOW)).toEqual({ level: "aging", label: "1m" });
    expect(classifyDataAge(ago(59 * 60_000), NOW)).toEqual({ level: "aging", label: "59m" });
  });

  it("labels hours-old data in the old bucket with an Nh label", () => {
    expect(classifyDataAge(ago(60 * 60_000), NOW)).toEqual({ level: "old", label: "1h" });
    expect(classifyDataAge(ago(23 * 3_600_000), NOW)).toEqual({ level: "old", label: "23h" });
  });

  it("labels day-plus data STALE", () => {
    expect(classifyDataAge(ago(24 * 3_600_000), NOW)).toEqual({ level: "stale", label: "STALE" });
    expect(classifyDataAge(ago(9 * 86_400_000), NOW)).toEqual({ level: "stale", label: "STALE" });
  });

  it("treats a future timestamp (clock skew) as LIVE, never negative", () => {
    expect(classifyDataAge(ago(-10_000), NOW)).toEqual({ level: "live", label: "LIVE" });
  });

  it("returns an unknown level for an unparseable timestamp", () => {
    expect(classifyDataAge("not-a-date", NOW)).toEqual({ level: "unknown", label: "—" });
  });

  it("accepts a millisecond number as well as an ISO string", () => {
    expect(classifyDataAge(NOW - 30_000, NOW)).toEqual({ level: "fresh", label: "30s" });
  });
});
