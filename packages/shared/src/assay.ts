/**
 * Assay verdict wire types (SSOT Step 2.9). The verdict pushed to the renderer for
 * the Assay dashboard. `AssayReason` is a FLAT, serialisable superset of the
 * intelligence `Reason` union — every union member is structurally assignable to it
 * (code + the optional fields it carries) — so the wire type stays in `shared`
 * without dragging the Layer-1 types across the dependency boundary. The renderer
 * renders each reason from its `code` + present fields.
 */

export interface AssayReason {
  readonly code: string;
  readonly display?: string;
  readonly commodityId?: string;
  readonly proportion?: number;
  readonly threshold?: number;
  readonly valuePerTon?: number;
  readonly tier?: string;
  readonly remainingPct?: number;
}

/** A rock-composition entry for the Assay UI (display name resolved via 2.2). */
export interface AssayMaterial {
  readonly name: string;
  readonly displayName: string;
  readonly proportion: number;
}

export interface AssayVerdictEvent {
  readonly prospectId: number;
  readonly call: "MINE" | "SKIP";
  /** Price-weighted expected value per ton (ranking). */
  readonly score: number;
  readonly reasons: readonly AssayReason[];
  readonly method: string;
  /** The prospect's own observation timestamp. */
  readonly timestamp: string;
  /** Content-tier symbol, e.g. "$AsteroidMaterialContent_High;". */
  readonly content: string;
  readonly remainingPct: number;
  readonly materials: readonly AssayMaterial[];
}
