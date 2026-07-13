import { describe, expect, it } from "vitest";
import { initialRootState } from "@lodestar/shared";
import type { StateInput } from "@lodestar/shared";
import { parseJournalEvent } from "../journal/events/parse.js";
import { parseStatus } from "../livefiles/status.js";
import { parseCargo } from "../livefiles/cargo.js";
import { reduceShip } from "./ship.js";
import { reduceLocation } from "./location.js";
import { reduceCargo } from "./cargo.js";
import { classifyActivity } from "./activity.js";
import { reduce } from "./root.js";

function journal(raw: string): StateInput {
  const r = parseJournalEvent(raw);
  if (!r.ok) throw new Error(`bad journal fixture: ${JSON.stringify(r.error)}`);
  return { kind: "journal", event: r.value };
}
function status(raw: string): StateInput {
  const r = parseStatus(raw);
  if (!r.ok) throw new Error("bad status fixture");
  return { kind: "status", status: r.value };
}
function cargoFile(raw: string): StateInput {
  const r = parseCargo(raw);
  if (!r.ok) throw new Error("bad cargo fixture");
  return { kind: "cargo", cargo: r.value };
}

const TS = "2025-06-01T12:00:00Z";

describe("reduceShip", () => {
  it("sets type + name from LoadGame and the full summary from Loadout", () => {
    let ship = reduceShip(
      {},
      journal(
        `{"timestamp":"${TS}","event":"LoadGame","Commander":"C","FID":"F","Ship":"python","ShipName":"MY SHIP"}`,
      ),
    );
    expect(ship).toMatchObject({ type: "python", name: "MY SHIP" });
    ship = reduceShip(
      ship,
      journal(
        `{"timestamp":"${TS}","event":"Loadout","Ship":"python","ShipName":"MY SHIP","ShipIdent":"AB-12","Modules":[{"Slot":"s","Item":"i"}],"CargoCapacity":128,"MaxJumpRange":40.5}`,
      ),
    );
    expect(ship).toMatchObject({
      ident: "AB-12",
      cargoCapacity: 128,
      maxJumpRange: 40.5,
      moduleCount: 1,
    });
  });

  it("updates fuel from a Status snapshot", () => {
    const ship = reduceShip(
      {},
      status(
        `{"timestamp":"${TS}","Flags":${String(2 ** 24)},"Pips":[2,2,2],"FireGroup":0,"GuiFocus":0,"Fuel":{"FuelMain":20.5,"FuelReservoir":0.4},"Cargo":0}`,
      ),
    );
    expect(ship.fuelMain).toBe(20.5);
    expect(ship.fuelReservoir).toBe(0.4);
  });
});

describe("reduceLocation", () => {
  const loc0 = initialRootState().location;

  it("FSDJump replaces location and clears docked/body/ring", () => {
    const loc = reduceLocation(
      { docked: true, stationName: "S", ring: "X A Ring", body: "b" },
      journal(
        `{"timestamp":"${TS}","event":"FSDJump","StarSystem":"Sys","SystemAddress":1,"StarPos":[1,2,3],"JumpDist":10,"FuelUsed":1,"FuelLevel":20}`,
      ),
    );
    expect(loc).toEqual({ system: "Sys", systemAddress: 1, starPos: [1, 2, 3], docked: false });
  });

  it("Docked sets the station; Undocked clears it", () => {
    let loc = reduceLocation(
      loc0,
      journal(
        `{"timestamp":"${TS}","event":"Docked","StationName":"Term","StationType":"Coriolis","StarSystem":"Sys","SystemAddress":1,"MarketID":2}`,
      ),
    );
    expect(loc).toMatchObject({ docked: true, stationName: "Term", system: "Sys" });
    loc = reduceLocation(
      loc,
      journal(`{"timestamp":"${TS}","event":"Undocked","StationName":"Term"}`),
    );
    expect(loc.docked).toBe(false);
    expect(loc).not.toHaveProperty("stationName");
  });

  it("captures the ring from a ring-named SupercruiseExit / SAASignalsFound", () => {
    const loc = reduceLocation(
      loc0,
      journal(
        `{"timestamp":"${TS}","event":"SupercruiseExit","StarSystem":"Sys","Body":"Paesia 2 A Ring","BodyType":"PlanetaryRing"}`,
      ),
    );
    expect(loc.ring).toBe("Paesia 2 A Ring");
    const loc2 = reduceLocation(
      loc0,
      journal(
        `{"timestamp":"${TS}","event":"SAASignalsFound","BodyName":"X 1 B Ring","SystemAddress":1,"BodyID":2,"Signals":[]}`,
      ),
    );
    expect(loc2.ring).toBe("X 1 B Ring");
  });

  it("Location sets system/body/docked and a ring when the body is a ring", () => {
    const loc = reduceLocation(
      loc0,
      journal(
        `{"timestamp":"${TS}","event":"Location","StarSystem":"Sys","SystemAddress":1,"StarPos":[1,2,3],"Docked":true,"Body":"Sys 2 A Ring","BodyType":"PlanetaryRing"}`,
      ),
    );
    expect(loc).toMatchObject({
      system: "Sys",
      docked: true,
      body: "Sys 2 A Ring",
      ring: "Sys 2 A Ring",
    });
  });

  it("is unchanged by a Status/cargo snapshot or an unrelated journal event", () => {
    const start = { system: "Sys", docked: true, stationName: "T" };
    expect(reduceLocation(start, status(`{"timestamp":"${TS}","Flags":1}`))).toBe(start);
    expect(reduceCargo({ count: 0, items: [] }, status(`{"timestamp":"${TS}","Flags":1}`))).toEqual(
      { count: 0, items: [] },
    );
    expect(
      reduceLocation(start, journal(`{"timestamp":"${TS}","event":"Music","MusicTrack":"x"}`)),
    ).toBe(start);
  });

  it("does NOT fabricate a ring at a non-ring body (SupercruiseExit / Location)", () => {
    const exit = reduceLocation(
      loc0,
      journal(
        `{"timestamp":"${TS}","event":"SupercruiseExit","StarSystem":"Sys","Body":"Sys A","BodyType":"Star"}`,
      ),
    );
    expect(exit.ring).toBeUndefined();
    const loc = reduceLocation(
      loc0,
      journal(
        `{"timestamp":"${TS}","event":"Location","StarSystem":"Sys","SystemAddress":1,"StarPos":[0,0,0],"Docked":true,"StationName":"Home Base"}`,
      ),
    );
    expect(loc.ring).toBeUndefined();
    expect(loc.stationName).toBe("Home Base"); // Location carries the station when started docked
  });

  it("keeps the manifest on a Cargo event that omits Inventory", () => {
    const prior = { count: 3, items: [{ name: "painite", count: 3 }] };
    const after = reduceCargo(
      prior,
      journal(`{"timestamp":"${TS}","event":"Cargo","Vessel":"Ship","Count":3}`),
    );
    expect(after).toBe(prior);
  });
});

describe("reduceCargo", () => {
  it("builds the manifest from a Cargo event, excluding limpets", () => {
    const cargo = reduceCargo(
      { count: 0, items: [] },
      journal(
        `{"timestamp":"${TS}","event":"Cargo","Vessel":"Ship","Count":18,"Inventory":[{"Name":"painite","Count":8,"Stolen":0},{"Name":"drones","Count":10,"Stolen":0}]}`,
      ),
    );
    expect(cargo).toEqual({ count: 8, items: [{ name: "painite", count: 8 }] });
  });

  it("builds the manifest from a Cargo.json live-file snapshot", () => {
    const cargo = reduceCargo(
      { count: 0, items: [] },
      cargoFile(
        `{"timestamp":"${TS}","event":"Cargo","Vessel":"Ship","Count":5,"Inventory":[{"Name":"platinum","Count":5,"Stolen":0}]}`,
      ),
    );
    expect(cargo).toEqual({ count: 5, items: [{ name: "platinum", count: 5 }] });
  });
});

describe("classifyActivity precedence + patterns", () => {
  const s = initialRootState();

  it("on-foot beats everything (status flags2.onFoot)", () => {
    const r = reduce(
      s,
      status(`{"timestamp":"${TS}","Flags":5,"Flags2":1}`), // bit0 flags2 = onFoot
    );
    expect(r.activity).toBe("on-foot");
  });

  it("docked (via location) beats supercruise/mining patterns", () => {
    const docked = reduce(
      s,
      journal(
        `{"timestamp":"${TS}","event":"Docked","StationName":"T","StationType":"C","StarSystem":"Sys","SystemAddress":1,"MarketID":2}`,
      ),
    );
    expect(docked.activity).toBe("docked");
  });

  it("mining on a LaunchDrone/ProspectedAsteroid/MiningRefined, traveling on FSDJump/SupercruiseEntry/Undocked", () => {
    expect(
      reduce(s, journal(`{"timestamp":"${TS}","event":"LaunchDrone","Type":"Prospector"}`))
        .activity,
    ).toBe("mining");
    expect(
      reduce(s, journal(`{"timestamp":"${TS}","event":"SupercruiseEntry","StarSystem":"Sys"}`))
        .activity,
    ).toBe("traveling");
    // A NON-mining limpet (FuelTransfer/Repair/etc.) must NOT read as mining.
    expect(
      reduce(s, journal(`{"timestamp":"${TS}","event":"LaunchDrone","Type":"FuelTransfer"}`))
        .activity,
    ).toBe("unknown");
    expect(
      reduce(s, journal(`{"timestamp":"${TS}","event":"LaunchDrone","Type":"Collection"}`))
        .activity,
    ).toBe("mining");
    // classifyActivity is sticky for an unrelated event (Music → keeps prior).
    const prev = reduce(
      s,
      journal(`{"timestamp":"${TS}","event":"LaunchDrone","Type":"Prospector"}`),
    );
    const music = journal(`{"timestamp":"${TS}","event":"Music","MusicTrack":"Exploration"}`);
    expect(classifyActivity(prev.activity, prev, music)).toBe("mining");
  });

  it("supercruise from the status flag when not docked/on-foot", () => {
    const r = reduce(s, status(`{"timestamp":"${TS}","Flags":${String(2 ** 4 + 2 ** 24)}}`)); // bit4 SC + bit24
    expect(r.activity).toBe("supercruise");
  });
});

describe("reduce (root)", () => {
  it("tracks latest flags/pips/timestamp from a Status input", () => {
    const r = reduce(
      initialRootState(),
      status(
        `{"timestamp":"${TS}","Flags":${String(2 ** 24)},"Pips":[0,4,8],"FireGroup":0,"GuiFocus":0,"Fuel":{"FuelMain":1,"FuelReservoir":0},"Cargo":0}`,
      ),
    );
    expect(r.pips).toEqual({ sys: 0, eng: 2, wep: 4 });
    expect(r.flags?.inMainShip).toBe(true);
    expect(r.timestamp).toBe(TS);
  });
});
