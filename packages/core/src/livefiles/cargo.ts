/** Cargo.json parser (SSOT §5.2 / Step 1.6): the current cargo manifest. */

import type { CargoSnapshot, DomainError, Result } from "@lodestar/shared";
import { opt, parseObject } from "../util/reader.js";

export function parseCargo(raw: string): Result<CargoSnapshot, DomainError> {
  return parseObject(raw, "cargo", (r): CargoSnapshot => ({
    timestamp: r.string("timestamp"),
    vessel: r.string("Vessel"),
    count: r.number("Count"),
    inventory: r.has("Inventory")
      ? r.objectArray("Inventory", (c) => ({
          name: c.string("Name"),
          count: c.number("Count"),
          stolen: c.number("Stolen"),
          ...opt("nameLocalised", c.optionalString("Name_Localised")),
        }))
      : [],
  }));
}
