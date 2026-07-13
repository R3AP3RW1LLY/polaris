/** Location reducer (SSOT Step 1.7): system/body/ring/docked-station/coordinates. */

import type { LocationState, StateInput } from "@lodestar/shared";
import { opt } from "../util/reader.js";

/** A ring body name ends in "… A Ring" / "… B Ring" etc. — journals carry no Ring field. */
function ringName(body: string | undefined): string | undefined {
  return body !== undefined && /\bRing$/.test(body) ? body : undefined;
}

export function reduceLocation(location: LocationState, input: StateInput): LocationState {
  if (input.kind === "status") {
    // Status.flags.docked corroborates the journal Docked/Undocked; journals lead.
    return location;
  }
  if (input.kind !== "journal") return location;
  const e = input.event;
  switch (e.event) {
    case "FSDJump":
      return {
        system: e.starSystem,
        systemAddress: e.systemAddress,
        starPos: e.starPos,
        docked: false,
      };
    case "Location":
      return {
        system: e.starSystem,
        systemAddress: e.systemAddress,
        starPos: e.starPos,
        docked: e.docked,
        ...opt("body", e.body),
        ...opt("bodyType", e.bodyType),
        ...opt("stationName", e.stationName),
        ...(ringName(e.body) !== undefined ? { ring: e.body } : {}),
      };
    case "Docked":
      return { ...location, system: e.starSystem, docked: true, stationName: e.stationName };
    case "Undocked":
      // Rebuild without stationName (immutable, exactOptional-safe).
      return {
        docked: false,
        ...opt("system", location.system),
        ...opt("systemAddress", location.systemAddress),
        ...opt("starPos", location.starPos),
        ...opt("body", location.body),
        ...opt("bodyType", location.bodyType),
        ...opt("ring", location.ring),
      };
    case "SupercruiseExit":
      return {
        ...location,
        system: e.starSystem,
        ...(e.body !== undefined ? { body: e.body } : {}),
        ...(e.bodyType !== undefined ? { bodyType: e.bodyType } : {}),
        ...(ringName(e.body) !== undefined ? { ring: e.body } : {}),
      };
    case "SAASignalsFound":
      return { ...location, ...(ringName(e.bodyName) !== undefined ? { ring: e.bodyName } : {}) };
    default:
      return location;
  }
}
