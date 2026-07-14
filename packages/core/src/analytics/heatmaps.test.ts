import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, applyMigrations, MIGRATIONS } from "@lodestar/data";
import type { Db } from "@lodestar/data";
import { createAnalyticsRepository, HEATMAP_YIELD_SQL } from "./repository.js";
import { ringCommodityHeatmap, timeProductivityHeatmap } from "./heatmaps.js";
import { buildSessionWhere } from "./aggregates.js";

/**
 * Two sessions on the SAME weekday+hour (06-02 and 06-09 are 7 days apart) share a
 * slot: 70 t over 2 h → 35 t/h. A third on the next day: 20 t / 0.5 h → 40 t/h.
 */
function seed(db: Db): void {
  const s = db.prepare(
    `INSERT INTO sessions (id, started_at, ended_at, ship, system, ring, tons_refined,
       credits_earned, limpets_launched, status)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  );
  s.run(
    1,
    "2025-06-02T14:00:00Z",
    "2025-06-02T15:00:00Z",
    "Python",
    "Paesia",
    "Paesia 2 A Ring",
    30,
    30_000_000,
    40,
    "ended",
  );
  s.run(
    2,
    "2025-06-03T14:00:00Z",
    "2025-06-03T14:30:00Z",
    "Cutter",
    "Hyades",
    "Hyades B 1 A Ring",
    20,
    40_000_000,
    30,
    "ended",
  );
  s.run(
    5,
    "2025-06-09T14:00:00Z",
    "2025-06-09T15:00:00Z",
    "Python",
    "Paesia",
    "Paesia 2 A Ring",
    40,
    20_000_000,
    50,
    "ended",
  );
  s.run(3, "2025-06-04T15:00:00Z", null, "Python", "Paesia", "Paesia 2 A Ring", 5, 0, 8, "active");

  const r = db.prepare(
    "INSERT INTO refinements (session_id, timestamp, commodity, tons) VALUES (?,?,?,?)",
  );
  r.run(1, "2025-06-02T14:10:00Z", "painite", 20);
  r.run(1, "2025-06-02T14:20:00Z", "platinum", 10);
  r.run(2, "2025-06-03T14:10:00Z", "platinum", 20);
  r.run(5, "2025-06-09T14:10:00Z", "painite", 40);
  r.run(3, "2025-06-04T15:10:00Z", "painite", 5);
}

describe("timeProductivityHeatmap (pure)", () => {
  it("is a 7×24 matrix of tons/hr, with null for slots that have no sessions", () => {
    const hm = timeProductivityHeatmap([
      { startedAt: "2025-06-02T14:00:00Z", tonsRefined: 30, durationSec: 3600 },
      { startedAt: "2025-06-09T14:00:00Z", tonsRefined: 40, durationSec: 3600 }, // same weekday/hour
      { startedAt: "2025-06-03T14:00:00Z", tonsRefined: 20, durationSec: 1800 },
    ]);
    expect(hm.rows).toHaveLength(7);
    expect(hm.cols).toHaveLength(24);
    const dayA = new Date("2025-06-02T14:00:00Z").getUTCDay();
    const dayB = new Date("2025-06-03T14:00:00Z").getUTCDay();
    expect(hm.cells[dayA]?.[14]).toBe(35); // 70 t over 2 h
    expect(hm.cells[dayB]?.[14]).toBe(40); // 20 t over 0.5 h
    // A slot with no session is null, distinct from a real 0.
    expect(hm.cells[dayA]?.[0]).toBeNull();
  });

  it("skips an unparseable timestamp without throwing", () => {
    const hm = timeProductivityHeatmap([
      { startedAt: "not-a-date", tonsRefined: 10, durationSec: 3600 },
    ]);
    expect(hm.cells.flat().every((c) => c === null)).toBe(true);
  });
});

describe("ringCommodityHeatmap (pure)", () => {
  it("is a ring×commodity yield matrix with null where the pairing never occurred", () => {
    const hm = ringCommodityHeatmap([
      { ring: "Paesia 2 A Ring", commodity: "painite", tons: 60 },
      { ring: "Paesia 2 A Ring", commodity: "platinum", tons: 10 },
      { ring: "Hyades B 1 A Ring", commodity: "platinum", tons: 20 },
    ]);
    expect(hm.rows).toEqual(["Hyades B 1 A Ring", "Paesia 2 A Ring"]);
    expect(hm.cols).toEqual(["painite", "platinum"]);
    // Hyades never yielded painite → null.
    expect(hm.cells[0]?.[0]).toBeNull();
    expect(hm.cells[0]?.[1]).toBe(20);
    expect(hm.cells[1]?.[0]).toBe(60);
    expect(hm.cells[1]?.[1]).toBe(10);
  });
});

describe("AnalyticsRepository.heatmaps", () => {
  let db: Db;
  beforeEach(() => {
    db = openDatabase(":memory:");
    applyMigrations(db, MIGRATIONS);
    seed(db);
  });
  afterEach(() => db.close());

  it("builds both heatmaps from ended sessions (active excluded)", () => {
    const { timeProductivity, ringCommodityYield } = createAnalyticsRepository(db).heatmaps();
    const day = new Date("2025-06-02T14:00:00Z").getUTCDay();
    expect(timeProductivity.cells[day]?.[14]).toBe(35);
    expect(ringCommodityYield.rows).toEqual(["Hyades B 1 A Ring", "Paesia 2 A Ring"]);
    expect(ringCommodityYield.cols).toEqual(["painite", "platinum"]);
    // Paesia painite = S1 20 + S5 40 = 60; the active S3's painite is excluded.
    expect(ringCommodityYield.cells[1]?.[0]).toBe(60);
    expect(ringCommodityYield.cells[0]?.[0]).toBeNull(); // Hyades painite never
  });

  it("the ring×commodity yield query reaches refinements via its index", () => {
    const where = buildSessionWhere({});
    const plan = (
      db.prepare("EXPLAIN QUERY PLAN " + HEATMAP_YIELD_SQL(where.sql)).all(where.params) as {
        detail: string;
      }[]
    )
      .map((r) => r.detail)
      .join(" | ");
    expect(plan).toContain("idx_refinements_session");
  });
});
