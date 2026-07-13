import { describe, expect, it } from "vitest";
import { parseCargo } from "./cargo.js";
import { parseMarket } from "./market.js";
import { parseNavRoute } from "./navroute.js";
import { parseModules } from "./modules.js";

describe("parseCargo", () => {
  it("parses the manifest with inventory", () => {
    const r = parseCargo(
      `{"timestamp":"t","event":"Cargo","Vessel":"Ship","Count":10,"Inventory":[{"Name":"painite","Name_Localised":"Painite","Count":8,"Stolen":0},{"Name":"drones","Count":2,"Stolen":0}]}`,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.count).toBe(10);
      expect(r.value.inventory).toHaveLength(2);
      expect(r.value.inventory[0]).toEqual({
        name: "painite",
        count: 8,
        stolen: 0,
        nameLocalised: "Painite",
      });
      expect(r.value.inventory[1]).not.toHaveProperty("nameLocalised");
    }
  });

  it("defaults inventory to [] when absent and rejects a partial write", () => {
    const r = parseCargo(`{"timestamp":"t","event":"Cargo","Vessel":"Ship","Count":0}`);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.inventory).toEqual([]);
    expect(parseCargo(`{"timestamp":"t","Vessel":`).ok).toBe(false);
  });
});

describe("parseMarket", () => {
  it("parses market items and rejects a wrong-typed field", () => {
    const r = parseMarket(
      `{"timestamp":"t","event":"Market","MarketID":1,"StationName":"S","StarSystem":"Sys","Items":[{"id":128,"Name":"painite","Category":"Minerals","SellPrice":500000,"BuyPrice":0,"MeanPrice":400000,"Demand":100,"Stock":0}]}`,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.marketId).toBe(1);
      expect(r.value.items[0]?.sellPrice).toBe(500000);
    }
    expect(
      parseMarket(
        `{"timestamp":"t","MarketID":1,"StationName":"S","StarSystem":"Sys","Items":[{"id":"x","Name":"p","Category":"M","SellPrice":1,"BuyPrice":0,"MeanPrice":1,"Demand":0,"Stock":0}]}`,
      ).ok,
    ).toBe(false);
  });

  it("defaults items to [] when the market is closed (no Items key)", () => {
    const r = parseMarket(`{"timestamp":"t","MarketID":1,"StationName":"S","StarSystem":"Sys"}`);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.items).toEqual([]);
  });
});

describe("parseNavRoute", () => {
  it("parses route hops with StarPos vectors", () => {
    const r = parseNavRoute(
      `{"timestamp":"t","event":"NavRoute","Route":[{"StarSystem":"A","SystemAddress":1,"StarPos":[1.5,-2.0,3.0],"StarClass":"M"},{"StarSystem":"B","SystemAddress":2,"StarPos":[4,5,6],"StarClass":"K"}]}`,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.route).toHaveLength(2);
      expect(r.value.route[0]?.starPos).toEqual([1.5, -2, 3]);
    }
  });

  it("defaults route to [] when absent and rejects a malformed StarPos", () => {
    expect(parseNavRoute(`{"timestamp":"t","event":"NavRoute"}`).ok).toBe(true);
    expect(
      parseNavRoute(
        `{"timestamp":"t","Route":[{"StarSystem":"A","SystemAddress":1,"StarPos":[1,2],"StarClass":"M"}]}`,
      ).ok,
    ).toBe(false);
  });
});

describe("parseModules", () => {
  it("parses modules with optional power/priority", () => {
    const r = parseModules(
      `{"timestamp":"t","event":"ModulesInfo","Modules":[{"Slot":"MediumHardpoint1","Item":"hpt_x","Power":0.5,"Priority":1},{"Slot":"Slot01","Item":"int_y"}]}`,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.modules[0]).toEqual({
        slot: "MediumHardpoint1",
        item: "hpt_x",
        power: 0.5,
        priority: 1,
      });
      expect(r.value.modules[1]).not.toHaveProperty("power");
    }
  });

  it("defaults modules to [] when absent and rejects a partial write", () => {
    expect(parseModules(`{"timestamp":"t","event":"ModulesInfo"}`).ok).toBe(true);
    expect(parseModules(`{"timestamp":"t","Modules":`).ok).toBe(false);
  });
});
