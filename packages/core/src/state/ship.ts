/** Ship reducer (SSOT Step 1.7): folds LoadGame/Loadout + Status into ship state. */

import type { ShipState, StateInput } from "@lodestar/shared";

export function reduceShip(ship: ShipState, input: StateInput): ShipState {
  if (input.kind === "status") {
    const { fuelMain, fuelReservoir } = input.status;
    return {
      ...ship,
      ...(fuelMain !== undefined ? { fuelMain } : {}),
      ...(fuelReservoir !== undefined ? { fuelReservoir } : {}),
    };
  }
  if (input.kind !== "journal") return ship;
  const e = input.event;
  if (e.event === "LoadGame") {
    return { ...ship, type: e.ship, name: e.shipName };
  }
  if (e.event === "Loadout") {
    return {
      ...ship,
      type: e.ship,
      name: e.shipName,
      cargoCapacity: e.cargoCapacity,
      maxJumpRange: e.maxJumpRange,
      moduleCount: e.modules.length,
      ...(e.shipIdent !== undefined ? { ident: e.shipIdent } : {}),
    };
  }
  return ship;
}
