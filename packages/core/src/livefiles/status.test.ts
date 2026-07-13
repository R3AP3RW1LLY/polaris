import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { decodeStatusFlags, decodeStatusFlags2, parseStatus } from "./status.js";
import type { StatusFlags } from "@lodestar/shared";

const FIXTURE_DIR = fileURLToPath(new URL("../../test/fixtures/livefiles/", import.meta.url));
const readFixture = (name: string): string => readFileSync(join(FIXTURE_DIR, name), "utf8");

/**
 * REAL-CAPTURE verification (SSOT Step 1.6 acceptance): these expectations are
 * checked against Status.json states actually recorded from the running game
 * (see test/fixtures/livefiles/*.json), NOT synthetic values derived from §5.2's
 * own bit table — that would be circular. Each fixture's `Flags` value and the
 * flags it must decode to were confirmed against live gameplay.
 */
interface RealCapture {
  readonly file: string;
  readonly flagsRaw: number;
  readonly on: readonly (keyof StatusFlags)[];
  readonly off: readonly (keyof StatusFlags)[];
}

const REAL_CAPTURES: readonly RealCapture[] = [
  {
    file: "status-docked.json",
    flagsRaw: 16842765,
    on: ["docked", "landingGearDown", "shieldsUp", "fsdMassLocked", "inMainShip"],
    off: ["supercruise", "flightAssistOff", "hardpointsDeployed", "inSrv", "inFighter"],
  },
  {
    file: "status-masslocked.json",
    flagsRaw: 16842760,
    on: ["shieldsUp", "fsdMassLocked", "inMainShip"],
    off: ["docked", "supercruise", "flightAssistOff", "hardpointsDeployed"],
  },
  {
    file: "status-faoff.json",
    flagsRaw: 16777256,
    on: ["shieldsUp", "flightAssistOff", "inMainShip"],
    off: ["docked", "fsdMassLocked", "hardpointsDeployed", "supercruise"],
  },
  {
    file: "status-hardpoints.json",
    flagsRaw: 16777288,
    on: ["shieldsUp", "hardpointsDeployed", "inMainShip"],
    off: ["docked", "fsdMassLocked", "flightAssistOff", "supercruise"],
  },
  {
    file: "status-supercruise.json",
    flagsRaw: 16777240,
    on: ["shieldsUp", "supercruise", "inMainShip"],
    off: ["docked", "fsdMassLocked", "flightAssistOff", "hardpointsDeployed"],
  },
];

describe("parseStatus — verified against REAL captured Status.json states", () => {
  for (const cap of REAL_CAPTURES) {
    it(`${cap.file}: decodes the real Flags bitmask to the observed state`, () => {
      const r = parseStatus(readFixture(cap.file));
      expect(r.ok, JSON.stringify(r)).toBe(true);
      if (!r.ok) return;
      expect(r.value.flagsRaw).toBe(cap.flagsRaw);
      for (const flag of cap.on)
        expect(r.value.flags[flag], `${cap.file}: ${flag} should be ON`).toBe(true);
      for (const flag of cap.off)
        expect(r.value.flags[flag], `${cap.file}: ${flag} should be OFF`).toBe(false);
    });
  }

  it("the safety-critical InMainShip bit (24) is set in every real in-ship capture", () => {
    for (const cap of REAL_CAPTURES) {
      const r = parseStatus(readFixture(cap.file));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.flags.inMainShip, cap.file).toBe(true);
    }
  });

  it("InMainShip CLEARS in the real on-foot capture, which also omits all ship fields", () => {
    const r = parseStatus(readFixture("status-onfoot.json"));
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (!r.ok) return;
    // Flags 5 = Docked(0) + LandingGear(2); bit 24 is NOT set — the definitive
    // InMainShip verification (set in-ship above, clear here).
    expect(r.value.flags.inMainShip).toBe(false);
    expect(r.value.flags.docked).toBe(true);
    expect(r.value.flags.landingGearDown).toBe(true);
    expect(r.value.flags2.onFoot).toBe(true);
    expect(r.value.flags2.onFootInStation).toBe(true);
    expect(r.value.flags2.breathableAtmosphere).toBe(true);
    // On foot the game omits Pips/Fuel/Cargo/FireGroup entirely — must not error.
    expect(r.value.pips).toBeUndefined();
    expect(r.value.fuelMain).toBeUndefined();
    expect(r.value.cargo).toBeUndefined();
    expect(r.value.fireGroup).toBeUndefined();
  });

  it("decodes pips (half-pips → real pips), fuel, and cargo from a real capture", () => {
    const r = parseStatus(readFixture("status-docked.json"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.pips).toEqual({ sys: 1, eng: 1, wep: 4 }); // [2,2,8] half-pips
    expect(r.value.fuelMain).toBe(32);
    expect(r.value.fuelReservoir).toBeCloseTo(0.6);
    expect(r.value.cargo).toBe(112);
    expect(r.value.legalState).toBe("Clean");
  });
});

describe("decodeStatusFlags2 (on-foot bits — pre-verified synthetically pending the real capture)", () => {
  it("decodes the Flags2 on-foot bits", () => {
    expect(decodeStatusFlags2(1).onFoot).toBe(true); // bit 0
    expect(decodeStatusFlags2(1 + 8).onFootInStation).toBe(true); // bit 3
    expect(decodeStatusFlags2(0).onFoot).toBe(false);
  });
});

describe("decodeStatusFlags (bit mechanics)", () => {
  it("extracts each bit independently, including high bits without 32-bit overflow", () => {
    expect(decodeStatusFlags(1).docked).toBe(true);
    expect(decodeStatusFlags(0).docked).toBe(false);
    expect(decodeStatusFlags(2 ** 24).inMainShip).toBe(true);
    expect(decodeStatusFlags(2 ** 26).inSrv).toBe(true);
    expect(decodeStatusFlags(2 ** 30).fsdJump).toBe(true); // > 2^30, near the 32-bit boundary
    expect(decodeStatusFlags(2 ** 24).docked).toBe(false);
  });
});

describe("parseStatus — robustness", () => {
  it("rejects a mid-write partial file with a retryable error (never throws)", () => {
    const r = parseStatus(`{"timestamp":"t","Flags":167`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("status.json");
  });

  it("rejects a non-object and a missing/wrong-type Flags", () => {
    expect(parseStatus(`[1,2,3]`).ok).toBe(false);
    expect(
      parseStatus(
        `{"timestamp":"t","Pips":[2,2,8],"FireGroup":1,"GuiFocus":0,"Fuel":{"FuelMain":1,"FuelReservoir":0},"Cargo":0}`,
      ).ok,
    ).toBe(false); // missing Flags
    expect(
      parseStatus(
        `{"timestamp":"t","Flags":"x","Pips":[2,2,8],"FireGroup":1,"GuiFocus":0,"Fuel":{"FuelMain":1,"FuelReservoir":0},"Cargo":0}`,
      ).ok,
    ).toBe(false); // Flags wrong type
  });

  it("halves odd half-pips into fractional pips (a real half-pip UI state)", () => {
    const r = parseStatus(
      `{"timestamp":"t","Flags":${String(2 ** 24)},"Pips":[1,2,9],"FireGroup":0,"GuiFocus":0,"Fuel":{"FuelMain":8,"FuelReservoir":0.5},"Cargo":0}`,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.pips).toEqual({ sys: 0.5, eng: 1, wep: 4.5 });
  });

  it("defaults Flags2 to 0 when absent (pre-Odyssey shape)", () => {
    const r = parseStatus(
      `{"timestamp":"t","Flags":${String(2 ** 24)},"Pips":[4,4,4],"FireGroup":0,"GuiFocus":0,"Fuel":{"FuelMain":8,"FuelReservoir":0.5},"Cargo":0}`,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.flags2Raw).toBe(0);
      expect(r.value.flags2.onFoot).toBe(false);
    }
  });
});
