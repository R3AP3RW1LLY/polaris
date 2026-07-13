/**
 * App state tree (SSOT Step 1.7). The snapshot the renderer shows and the pure
 * intelligence layer reasons over — so it lives in `shared`. Reducers folding
 * events into it are pure functions in `@lodestar/core/state`.
 */

import type { ParsedJournalEvent } from "./journal-events.js";
import type {
  CargoSnapshot,
  Pips,
  StatusFlags,
  StatusFlags2,
  StatusSnapshot,
} from "./livefiles.js";

/** The tagged inputs the state reducers fold: parsed journal events + live-file snapshots. */
export type StateInput =
  | { readonly kind: "journal"; readonly event: ParsedJournalEvent }
  | { readonly kind: "status"; readonly status: StatusSnapshot }
  | { readonly kind: "cargo"; readonly cargo: CargoSnapshot };

export interface ShipState {
  readonly type?: string; // ship model, e.g. "python"
  readonly name?: string;
  readonly ident?: string;
  readonly cargoCapacity?: number;
  readonly maxJumpRange?: number;
  readonly moduleCount?: number;
  readonly fuelMain?: number;
  readonly fuelReservoir?: number;
}

export interface LocationState {
  readonly system?: string;
  readonly systemAddress?: number;
  readonly starPos?: readonly [number, number, number];
  readonly body?: string;
  readonly bodyType?: string;
  readonly ring?: string; // ring name when the last body/scan is a ring
  readonly docked: boolean;
  readonly stationName?: string;
}

export interface CargoLineState {
  readonly name: string;
  readonly count: number;
}

export interface CargoState {
  readonly count: number;
  readonly items: readonly CargoLineState[];
}

/** Display-only activity classification, derived from event patterns + status flags. */
export type Activity = "unknown" | "on-foot" | "docked" | "supercruise" | "mining" | "traveling";

export interface RootState {
  readonly ship: ShipState;
  readonly location: LocationState;
  readonly cargo: CargoState;
  readonly activity: Activity;
  readonly pips?: Pips;
  readonly flags?: StatusFlags;
  readonly flags2?: StatusFlags2;
  /** Timestamp of the most recent event folded in (ISO). */
  readonly timestamp?: string;
}

export function initialRootState(): RootState {
  return {
    ship: {},
    location: { docked: false },
    cargo: { count: 0, items: [] },
    activity: "unknown",
  };
}
