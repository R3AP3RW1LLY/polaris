/**
 * Live status-file domain types (SSOT §5.2 / Step 1.6). Kept in `shared` (like
 * the journal-event types) so the pure `intelligence` layer can consume them
 * without importing `core`. The ship-flight fields on `StatusSnapshot` are
 * OPTIONAL: the game omits Pips/Fuel/Cargo/FireGroup/GuiFocus entirely when the
 * commander is on foot or in a taxi (verified against a real on-foot capture).
 * `Balance` is deliberately NOT modeled — it's financial PII (privacy stance).
 */

export interface StatusFlags {
  readonly docked: boolean;
  readonly landed: boolean;
  readonly landingGearDown: boolean;
  readonly shieldsUp: boolean;
  readonly supercruise: boolean;
  readonly flightAssistOff: boolean;
  readonly hardpointsDeployed: boolean;
  readonly inWing: boolean;
  readonly lightsOn: boolean;
  readonly cargoScoopDeployed: boolean;
  readonly silentRunning: boolean;
  readonly scoopingFuel: boolean;
  readonly fsdMassLocked: boolean;
  readonly fsdCharging: boolean;
  readonly fsdCooldown: boolean;
  readonly lowFuel: boolean;
  readonly overHeating: boolean;
  readonly hasLatLong: boolean;
  readonly inDanger: boolean;
  readonly beingInterdicted: boolean;
  readonly inMainShip: boolean;
  readonly inFighter: boolean;
  readonly inSrv: boolean;
  readonly fsdJump: boolean;
}

export interface StatusFlags2 {
  readonly onFoot: boolean;
  readonly inTaxi: boolean;
  readonly inMulticrew: boolean;
  readonly onFootInStation: boolean;
  readonly onFootOnPlanet: boolean;
  readonly glideMode: boolean;
  readonly onFootInHangar: boolean;
  readonly onFootSocialSpace: boolean;
  readonly onFootExterior: boolean;
  readonly breathableAtmosphere: boolean;
}

export interface Pips {
  readonly sys: number;
  readonly eng: number;
  readonly wep: number;
}

export interface StatusSnapshot {
  readonly timestamp: string;
  readonly flagsRaw: number;
  readonly flags: StatusFlags;
  readonly flags2Raw: number;
  readonly flags2: StatusFlags2;
  // Ship-flight fields — absent when on foot / in a taxi.
  readonly pips?: Pips;
  readonly fireGroup?: number;
  readonly guiFocus?: number;
  readonly fuelMain?: number;
  readonly fuelReservoir?: number;
  readonly cargo?: number;
  readonly legalState?: string;
}

export interface CargoItem {
  readonly name: string;
  readonly nameLocalised?: string;
  readonly count: number;
  readonly stolen: number;
}

export interface CargoSnapshot {
  readonly timestamp: string;
  readonly vessel: string;
  readonly count: number;
  readonly inventory: readonly CargoItem[];
}

export interface MarketItem {
  readonly id: number;
  readonly name: string;
  readonly category: string;
  readonly sellPrice: number;
  readonly buyPrice: number;
  readonly meanPrice: number;
  readonly demand: number;
  readonly stock: number;
}

export interface MarketSnapshot {
  readonly timestamp: string;
  readonly marketId: number;
  readonly stationName: string;
  readonly starSystem: string;
  readonly items: readonly MarketItem[];
}

export interface NavRouteHop {
  readonly starSystem: string;
  readonly systemAddress: number;
  readonly starPos: readonly [number, number, number];
  readonly starClass: string;
}

export interface NavRouteSnapshot {
  readonly timestamp: string;
  readonly route: readonly NavRouteHop[];
}

export interface ModuleInfo {
  readonly slot: string;
  readonly item: string;
  readonly power?: number;
  readonly priority?: number;
}

export interface ModulesSnapshot {
  readonly timestamp: string;
  readonly modules: readonly ModuleInfo[];
}
