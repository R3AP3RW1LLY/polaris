/**
 * Cargo reducer (SSOT Step 1.7): the manifest is authoritative from Cargo journal
 * events and the Cargo.json live file (both carry the full inventory). Limpets
 * ("drones") are excluded from the displayed manifest — they aren't tradable cargo.
 */

import type { CargoLineState, CargoState, StateInput } from "@lodestar/shared";

const LIMPET_NAMES = new Set(["drones", "limpet", "limpets"]);

function manifestFrom(
  items: readonly { readonly name: string; readonly count: number }[],
): CargoState {
  const lines: CargoLineState[] = items
    .filter((i) => !LIMPET_NAMES.has(i.name.toLowerCase()))
    .map((i) => ({ name: i.name, count: i.count }));
  const count = lines.reduce((sum, l) => sum + l.count, 0);
  return { count, items: lines };
}

export function reduceCargo(cargo: CargoState, input: StateInput): CargoState {
  if (input.kind === "cargo") {
    return manifestFrom(input.cargo.inventory);
  }
  if (input.kind === "journal" && input.event.event === "Cargo") {
    return input.event.inventory === undefined ? cargo : manifestFrom(input.event.inventory);
  }
  return cargo;
}
