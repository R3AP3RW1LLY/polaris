import { motion } from "framer-motion";
import type { AssayVerdictEvent } from "@lodestar/shared";
import { ReasonList } from "./ReasonList.js";
import { contentTierLabel, topMaterial } from "../assay-format.js";

/**
 * The headline verdict card (Step 2.9): a big MINE (orange, glowing) / SKIP (dim)
 * call, the dominant commodity, the structured reasons, and rock-composition bars.
 * Re-animates on each new prospect (keyed on prospectId).
 */
export function VerdictCard({
  verdict,
}: {
  readonly verdict: AssayVerdictEvent;
}): React.JSX.Element {
  const mine = verdict.call === "MINE";
  const top = topMaterial(verdict.materials);
  return (
    <motion.div
      key={verdict.prospectId}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`glass rounded-2xl border p-5 ${mine ? "border-orange/60 shadow-glow" : "border-white/10"}`}
      data-testid="verdict-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`font-display text-4xl uppercase tracking-[0.2em] ${mine ? "text-orange" : "text-cyan-dim"}`}
          data-testid="verdict-call"
        >
          {verdict.call}
        </span>
        {top !== undefined && (
          <span className="text-right text-lg text-orange">
            {top.displayName}{" "}
            <span className="text-cyan">{String(Math.round(top.proportion))}%</span>
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-cyan/70">
        {contentTierLabel(verdict.content)} content · {String(Math.round(verdict.remainingPct))}%
        remaining
      </p>

      <div className="mt-4">
        <ReasonList reasons={verdict.reasons} />
      </div>

      <div className="mt-4 flex flex-col gap-1.5" data-testid="composition">
        {verdict.materials.map((m) => (
          <div key={m.name} className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0 truncate text-cyan">{m.displayName}</span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-void-900">
              <div
                className="h-full rounded bg-orange/70"
                style={{ width: `${String(Math.min(100, Math.max(0, m.proportion)))}%` }}
              />
            </div>
            <span className="w-9 text-right text-orange">{String(Math.round(m.proportion))}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
