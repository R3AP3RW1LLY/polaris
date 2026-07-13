/**
 * Status.json parser (SSOT §5.2 / Step 1.6). Decodes the `Flags`/`Flags2`
 * bitmasks into named booleans, pips into {sys,eng,wep} (the file stores
 * HALF-pips, so each is halved), fuel, and cargo tons.
 *
 * The bit→meaning table below is VALIDATED against real captured Status.json
 * states recorded on the operator's machine (see test/fixtures/livefiles/*.json),
 * not derived from §5.2's own table — bit 24 (InMainShip) is the safety-critical
 * one the Phase-7 arming model keys on (confirmed set in-ship, clear on foot).
 * Bit extraction uses float division rather than `<<`/`&` so bits ≥31 can't hit
 * JS's 32-bit signed-int overflow.
 *
 * Ship-flight fields (Pips/Fuel/Cargo/FireGroup/GuiFocus) are OPTIONAL: the game
 * omits them entirely when the commander is on foot / in a taxi. `Balance` is
 * deliberately not read — it's financial PII.
 */

import type {
  DomainError,
  Result,
  StatusFlags,
  StatusFlags2,
  StatusSnapshot,
} from "@lodestar/shared";
import { Reader, opt, parseObject } from "../util/reader.js";

const FLAG_BITS: Readonly<Record<keyof StatusFlags, number>> = {
  docked: 0,
  landed: 1,
  landingGearDown: 2,
  shieldsUp: 3,
  supercruise: 4,
  flightAssistOff: 5,
  hardpointsDeployed: 6,
  inWing: 7,
  lightsOn: 8,
  cargoScoopDeployed: 9,
  silentRunning: 10,
  scoopingFuel: 11,
  fsdMassLocked: 16,
  fsdCharging: 17,
  fsdCooldown: 18,
  lowFuel: 19,
  overHeating: 20,
  hasLatLong: 21,
  inDanger: 22,
  beingInterdicted: 23,
  inMainShip: 24,
  inFighter: 25,
  inSrv: 26,
  fsdJump: 30,
};

const FLAG2_BITS: Readonly<Record<keyof StatusFlags2, number>> = {
  onFoot: 0,
  inTaxi: 1,
  inMulticrew: 2,
  onFootInStation: 3,
  onFootOnPlanet: 4,
  glideMode: 12,
  onFootInHangar: 13,
  onFootSocialSpace: 14,
  onFootExterior: 15,
  breathableAtmosphere: 16,
};

function bitSet(value: number, bit: number): boolean {
  return Math.floor(value / 2 ** bit) % 2 === 1;
}

function decode<K extends string>(
  bits: Readonly<Record<K, number>>,
  value: number,
): Record<K, boolean> {
  const out = {} as Record<K, boolean>;
  for (const key of Object.keys(bits) as K[]) {
    out[key] = bitSet(value, bits[key]);
  }
  return out;
}

export function decodeStatusFlags(value: number): StatusFlags {
  return decode(FLAG_BITS, value);
}

export function decodeStatusFlags2(value: number): StatusFlags2 {
  return decode(FLAG2_BITS, value);
}

export function parseStatus(raw: string): Result<StatusSnapshot, DomainError> {
  return parseObject(raw, "status", (r: Reader): StatusSnapshot => {
    const flagsRaw = r.number("Flags");
    const flags2Raw = r.optionalNumber("Flags2") ?? 0; // Flags2 is Odyssey-only
    const pips = r.has("Pips") ? r.numberTuple("Pips", 3) : undefined;
    const fuel = r.has("Fuel") ? r.child("Fuel") : undefined;
    return {
      timestamp: r.string("timestamp"),
      flagsRaw,
      flags: decodeStatusFlags(flagsRaw),
      flags2Raw,
      flags2: decodeStatusFlags2(flags2Raw),
      // The file stores HALF-pips (a value of 8 = 4 pips), so halve each.
      ...opt(
        "pips",
        pips === undefined
          ? undefined
          : { sys: (pips[0] ?? 0) / 2, eng: (pips[1] ?? 0) / 2, wep: (pips[2] ?? 0) / 2 },
      ),
      ...opt("fireGroup", r.optionalNumber("FireGroup")),
      ...opt("guiFocus", r.optionalNumber("GuiFocus")),
      ...opt("fuelMain", fuel === undefined ? undefined : fuel.number("FuelMain")),
      ...opt("fuelReservoir", fuel === undefined ? undefined : fuel.number("FuelReservoir")),
      ...opt("cargo", r.optionalNumber("Cargo")),
      ...opt("legalState", r.optionalString("LegalState")),
    };
  });
}
