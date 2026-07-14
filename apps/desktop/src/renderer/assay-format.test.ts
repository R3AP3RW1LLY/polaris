import { describe, expect, it } from "vitest";
import type { AssayMaterial } from "@lodestar/shared";
import { contentTierLabel, reasonText, topMaterial } from "./assay-format.js";

const mat = (name: string, displayName: string, proportion: number): AssayMaterial => ({
  name,
  displayName,
  proportion,
});

describe("assay-format", () => {
  it("topMaterial returns the highest-proportion material (undefined for empty)", () => {
    expect(
      topMaterial([mat("a", "A", 10), mat("b", "B", 30), mat("c", "C", 20)])?.displayName,
    ).toBe("B");
    expect(topMaterial([])).toBeUndefined();
  });

  it("contentTierLabel maps the raw symbol to a human tier", () => {
    expect(contentTierLabel("$AsteroidMaterialContent_High;")).toBe("High");
    expect(contentTierLabel("$AsteroidMaterialContent_Medium;")).toBe("Medium");
    expect(contentTierLabel("$AsteroidMaterialContent_Low;")).toBe("Low");
    expect(contentTierLabel("weird")).toBe("Unknown");
  });

  it("reasonText renders each structured reason code", () => {
    expect(reasonText({ code: "motherlode", display: "Painite" })).toBe("Painite — motherlode");
    expect(
      reasonText({
        code: "proportion-above-threshold",
        display: "Platinum",
        proportion: 31.6,
        threshold: 25,
      }),
    ).toBe("Platinum 32% (threshold 25%)");
    expect(reasonText({ code: "price-weighted-value/t", valuePerTon: 150000 })).toBe(
      "Value ~150000 cr/t",
    );
    expect(reasonText({ code: "content-tier", tier: "High" })).toBe("High content");
    expect(reasonText({ code: "already-depleted", remainingPct: 0 })).toBe(
      "Depleted — 0% remaining",
    );
    expect(reasonText({ code: "future-code" })).toBe("future-code");
  });
});
