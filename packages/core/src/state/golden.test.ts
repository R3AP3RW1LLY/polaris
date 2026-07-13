import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { parseJournalEvent } from "../journal/events/parse.js";
import { parseStatus } from "../livefiles/status.js";
import { foldState } from "./root.js";
import type { StateInput } from "@lodestar/shared";

const FIXTURE_DIR = fileURLToPath(new URL("../../test/fixtures/journal/", import.meta.url));

function sessionInputs(): StateInput[] {
  const inputs: StateInput[] = [];
  for (const file of ["Journal.2025-06-01T120000.01.log", "Journal.2025-06-01T120000.02.log"]) {
    const raw = readFileSync(join(FIXTURE_DIR, file), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (t === "") continue;
      const r = parseJournalEvent(t);
      if (r.ok) inputs.push({ kind: "journal", event: r.value });
    }
  }
  return inputs;
}

describe("foldState — golden replay of the full fixture mining session", () => {
  const final = foldState(sessionInputs());

  it("ship reflects the Loadout (type/name/ident/capacity/jump range/module count)", () => {
    expect(final.ship).toMatchObject({
      type: "python",
      name: "LODESTAR TEST",
      ident: "LS-01",
      cargoCapacity: 256,
      maxJumpRange: 22.55,
      moduleCount: 4,
    });
  });

  it("location: undocked at LTT 15574 after the travel-and-sell leg (station cleared, ring gone)", () => {
    expect(final.location.system).toBe("LTT 15574");
    expect(final.location.docked).toBe(false);
    expect(final.location).not.toHaveProperty("stationName");
    expect(final.location.body).toBe("Yurchikhin Terminal");
    expect(final.location.bodyType).toBe("Station");
    expect(final.location.ring).toBeUndefined();
  });

  it("cargo: 5t painite in the manifest, limpets excluded", () => {
    expect(final.cargo).toEqual({ count: 5, items: [{ name: "painite", count: 5 }] });
  });

  it("activity: traveling (undocked, no supercruise, not mining)", () => {
    expect(final.activity).toBe("traveling");
  });

  it("timestamp: the last folded event", () => {
    expect(final.timestamp).toBe("2025-06-01T12:20:00Z");
  });

  it("folds ship fuel from a Status snapshot interleaved into the session", () => {
    const status = parseStatus(
      `{"timestamp":"2025-06-01T12:21:00Z","Flags":${String(2 ** 24)},"Pips":[2,2,8],"FireGroup":0,"GuiFocus":0,"Fuel":{"FuelMain":28.4,"FuelReservoir":0.4},"Cargo":5}`,
    );
    expect(status.ok).toBe(true);
    if (!status.ok) return;
    const withFuel = foldState([...sessionInputs(), { kind: "status", status: status.value }]);
    expect(withFuel.ship.fuelMain).toBe(28.4);
    expect(withFuel.ship.fuelReservoir).toBe(0.4);
    expect(withFuel.pips).toEqual({ sys: 1, eng: 1, wep: 4 });
  });

  it("classifies mining while at the ring mid-session", () => {
    // Fold only up to the first MiningRefined and check the activity there.
    const inputs = sessionInputs();
    const upToRefine: StateInput[] = [];
    for (const i of inputs) {
      upToRefine.push(i);
      if (i.kind === "journal" && i.event.event === "MiningRefined") break;
    }
    expect(foldState(upToRefine).activity).toBe("mining");
  });
});
