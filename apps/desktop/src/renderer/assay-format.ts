/** Presentation helpers for the Assay dashboard (Step 2.9). */

import type { AssayMaterial, AssayReason } from "@lodestar/shared";

/** The dominant (highest-proportion) material of a rock, or undefined for an empty rock. */
export function topMaterial(materials: readonly AssayMaterial[]): AssayMaterial | undefined {
  let best: AssayMaterial | undefined;
  for (const m of materials) {
    if (best === undefined || m.proportion > best.proportion) best = m;
  }
  return best;
}

/** A human content-tier label from the raw symbol ("$AsteroidMaterialContent_High;" → "High"). */
export function contentTierLabel(content: string): string {
  const c = content.toLowerCase();
  if (c.includes("high")) return "High";
  if (c.includes("medium")) return "Medium";
  if (c.includes("low")) return "Low";
  return "Unknown";
}

const round = (n: number | undefined): string => (n === undefined ? "?" : String(Math.round(n)));

/** Human phrasing for a structured verdict reason, rendered verbatim from its code + fields. */
export function reasonText(reason: AssayReason): string {
  switch (reason.code) {
    case "motherlode":
      return `${reason.display ?? reason.commodityId ?? "Unknown"} — motherlode`;
    case "proportion-above-threshold":
      return `${reason.display ?? reason.commodityId ?? "?"} ${round(reason.proportion)}% (threshold ${round(reason.threshold)}%)`;
    case "price-weighted-value/t":
      return `Value ~${round(reason.valuePerTon)} cr/t`;
    case "content-tier":
      return `${reason.tier ?? "Unknown"} content`;
    case "already-depleted":
      return `Depleted — ${round(reason.remainingPct)}% remaining`;
    default:
      return reason.code;
  }
}
