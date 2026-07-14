import { useEffect } from "react";
import { MfdPanel } from "../components/MfdPanel.js";
import { VerdictCard } from "../components/VerdictCard.js";
import { ProspectHistory } from "../components/ProspectHistory.js";
import { useAssayStore } from "../stores/assay.js";
import { subscribeGameState, useGameState } from "../stores/game-state.js";

/**
 * The Assay dashboard (SSOT Step 2.9): the live MINE/SKIP verdict card, structured
 * reasons + rock composition, recent-prospect history, and a hit-rate strip fed by
 * the 2.8 prospector stats. The verdict feed is app-level (App.tsx) so history
 * survives screen switches; this screen subscribes to game-state for live stats.
 */
export function Assay(): React.JSX.Element {
  const latest = useAssayStore((s) => s.latest);
  const history = useAssayStore((s) => s.history);
  const session = useGameState((s) => s.session);
  const stats = session?.prospectStats;
  const assayed = stats !== undefined && stats.prospected > 0;

  useEffect(() => {
    let off = (): void => {};
    try {
      off = subscribeGameState(window.lodestar);
    } catch {
      /* bridge unavailable — the panels still render whatever the store holds */
    }
    return () => {
      off();
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="assay-screen">
      <h1 className="font-display text-lg uppercase tracking-[0.3em] text-orange">Assay</h1>

      <div className="flex flex-wrap gap-3" data-testid="hit-rate-strip">
        <Stat label="Prospected" value={stats !== undefined ? String(stats.prospected) : "0"} />
        <Stat
          label="Hit rate"
          value={assayed ? `${String(Math.round(stats.hitRate * 100))}%` : "—"}
        />
        <Stat
          label="Avg best"
          value={assayed ? `${String(Math.round(stats.avgBestMaterialPct))}%` : "—"}
        />
        <Stat
          label="Motherlodes"
          value={stats !== undefined ? String(stats.motherlodeCount) : "0"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div>
          {latest === null ? (
            <MfdPanel title="Awaiting prospect">
              <p className="text-sm text-cyan" data-testid="assay-empty">
                Fire a prospector limpet at an asteroid — the mine/skip verdict lands here.
              </p>
            </MfdPanel>
          ) : (
            <VerdictCard verdict={latest} />
          )}
        </div>
        <MfdPanel title="Recent prospects">
          <ProspectHistory history={history} />
        </MfdPanel>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): React.JSX.Element {
  return (
    <div className="glass min-w-[7rem] flex-1 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-cyan/70">{label}</div>
      <div className="font-display text-xl text-orange">{value}</div>
    </div>
  );
}
