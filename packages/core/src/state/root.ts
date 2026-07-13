/**
 * Root state reducer (SSOT Step 1.7). Pure: folds one `StateInput` into the
 * `RootState` tree via the sub-reducers, tracks the latest status flags/pips, and
 * re-derives the display activity. `foldState` replays a whole sequence from the
 * initial state (used by the golden fixture-replay test and, in Step 1.9, to
 * bootstrap the renderer store from a backfill).
 */

import type { RootState, StateInput } from "@lodestar/shared";
import { initialRootState } from "@lodestar/shared";
import { reduceShip } from "./ship.js";
import { reduceLocation } from "./location.js";
import { reduceCargo } from "./cargo.js";
import { classifyActivity } from "./activity.js";

function inputTimestamp(input: StateInput): string {
  if (input.kind === "journal") return input.event.timestamp;
  if (input.kind === "status") return input.status.timestamp;
  return input.cargo.timestamp;
}

export function reduce(state: RootState, input: StateInput): RootState {
  const ship = reduceShip(state.ship, input);
  const location = reduceLocation(state.location, input);
  const cargo = reduceCargo(state.cargo, input);
  const flags = input.kind === "status" ? input.status.flags : state.flags;
  const flags2 = input.kind === "status" ? input.status.flags2 : state.flags2;
  const pips = input.kind === "status" ? (input.status.pips ?? state.pips) : state.pips;
  const next: RootState = {
    ship,
    location,
    cargo,
    activity: state.activity,
    timestamp: inputTimestamp(input),
    ...(flags !== undefined ? { flags } : {}),
    ...(flags2 !== undefined ? { flags2 } : {}),
    ...(pips !== undefined ? { pips } : {}),
  };
  return { ...next, activity: classifyActivity(state.activity, next, input) };
}

export function foldState(inputs: Iterable<StateInput>, from = initialRootState()): RootState {
  let state = from;
  for (const input of inputs) state = reduce(state, input);
  return state;
}
