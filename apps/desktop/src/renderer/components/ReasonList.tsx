import type { AssayReason } from "@lodestar/shared";
import { reasonText } from "../assay-format.js";

/** The structured verdict reasons, rendered verbatim (Step 2.9). */
export function ReasonList({
  reasons,
}: {
  readonly reasons: readonly AssayReason[];
}): React.JSX.Element {
  return (
    <ul className="flex flex-col gap-1" data-testid="reason-list">
      {reasons.map((reason, i) => (
        <li key={`${reason.code}-${String(i)}`} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan/70" aria-hidden />
          <span className="text-orange">{reasonText(reason)}</span>
        </li>
      ))}
    </ul>
  );
}
