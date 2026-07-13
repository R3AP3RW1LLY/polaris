/**
 * Activity classifier (SSOT Step 1.7) — DISPLAY-ONLY, derived from event patterns
 * plus the latest status flags. Precedence: on-foot > docked > supercruise, then
 * the most recent journal signal (mining vs traveling), otherwise sticky.
 */

import type { Activity, RootState, StateInput } from "@lodestar/shared";

export function classifyActivity(prev: Activity, next: RootState, input: StateInput): Activity {
  if (next.flags2?.onFoot === true) return "on-foot";
  if (next.location.docked) return "docked";
  if (next.flags?.supercruise === true) return "supercruise";
  if (input.kind === "journal") {
    const e = input.event;
    switch (e.event) {
      case "LaunchDrone":
        // Only prospector/collection limpets mean mining — repair/fuel/hatchbreaker/
        // decontamination/recon/research limpets do NOT.
        return e.droneType === "Prospector" || e.droneType === "Collection" ? "mining" : prev;
      case "ProspectedAsteroid":
      case "AsteroidCracked":
      case "MiningRefined":
        return "mining";
      case "FSDJump":
      case "SupercruiseEntry":
      case "Undocked":
        return "traveling";
      // Docked is handled by the location.docked precedence check above.
      default:
        return prev;
    }
  }
  return prev; // status/cargo snapshots don't change the pattern-based activity alone
}
