import type { AssayVerdictEvent } from "@lodestar/shared";
import { topMaterial } from "../assay-format.js";

/** Last-N prospect outcomes (Step 2.9): call + dominant commodity, newest first. */
export function ProspectHistory({
  history,
}: {
  readonly history: readonly AssayVerdictEvent[];
}): React.JSX.Element {
  if (history.length === 0) {
    return <p className="text-xs text-cyan-dim">No prospects yet this session.</p>;
  }
  return (
    <ul className="flex flex-col gap-1" data-testid="prospect-history">
      {history.map((verdict) => {
        const top = topMaterial(verdict.materials);
        const mine = verdict.call === "MINE";
        return (
          <li key={verdict.prospectId} className="flex items-center justify-between gap-2 text-xs">
            <span
              className={`w-10 font-display uppercase tracking-wider ${mine ? "text-orange" : "text-cyan-dim"}`}
            >
              {verdict.call}
            </span>
            <span className="flex-1 truncate text-cyan">
              {top !== undefined
                ? `${top.displayName} ${String(Math.round(top.proportion))}%`
                : "—"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
