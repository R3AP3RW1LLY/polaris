// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { AssayVerdictEvent, SessionSummary } from "@lodestar/shared";
import { Assay } from "./Assay.js";
import { useAssayStore } from "../stores/assay.js";
import { useGameState } from "../stores/game-state.js";

/** The subset of the bridge the Assay screen touches via subscribeGameState. */
function stubBridge(): void {
  const api = {
    getStateSnapshot: vi.fn((): Promise<never> => new Promise(() => {})),
    onStateDelta: vi.fn(() => () => {}),
    onSessionStats: vi.fn(() => () => {}),
  };
  (globalThis as unknown as { window: { lodestar: unknown } }).window.lodestar = api;
}

const MINE: AssayVerdictEvent = {
  prospectId: 1,
  call: "MINE",
  score: 150_000,
  reasons: [
    { code: "proportion-above-threshold", display: "Platinum", proportion: 32, threshold: 25 },
  ],
  method: "laser",
  timestamp: "2025-06-01T12:00:00Z",
  content: "$AsteroidMaterialContent_High;",
  remainingPct: 100,
  materials: [
    { name: "platinum", displayName: "Platinum", proportion: 32 },
    { name: "gold", displayName: "Gold", proportion: 6 },
  ],
};

const withStats = (): SessionSummary => ({
  active: true,
  startedAt: "2025-06-01T12:00:00Z",
  tonsRefined: 0,
  tonsPerHour: 0,
  creditsEarned: 0,
  creditsPerHour: 0,
  limpetsLaunched: 0,
  bankedToCarrier: 0,
  prospectStats: {
    prospected: 4,
    mineVerdicts: 3,
    hitRate: 0.75,
    avgBestMaterialPct: 28,
    motherlodeCount: 1,
    byCommodity: { platinum: 3, gold: 1 },
  },
});

afterEach(cleanup);
beforeEach(() => {
  stubBridge();
  useAssayStore.setState({ latest: null, history: [] });
  useGameState.setState({ session: null });
});

describe("Assay screen", () => {
  it("shows the empty state before any prospect", () => {
    render(<Assay />);
    expect(screen.getByTestId("assay-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("verdict-card")).toBeNull();
  });

  it("renders the verdict card with call, reasons, composition, and history", () => {
    useAssayStore.setState({ latest: MINE, history: [MINE] });
    render(<Assay />);
    expect(screen.getByTestId("verdict-call")).toHaveTextContent("MINE");
    expect(screen.getByTestId("reason-list")).toHaveTextContent(/Platinum 32%/);
    expect(screen.getByTestId("composition")).toHaveTextContent(/Platinum/);
    expect(screen.getByTestId("prospect-history")).toHaveTextContent("MINE");
  });

  it("shows the live hit-rate strip from the 2.8 prospect stats", () => {
    useGameState.setState({ session: withStats() });
    render(<Assay />);
    const strip = screen.getByTestId("hit-rate-strip");
    expect(strip).toHaveTextContent("75%"); // hit rate
    expect(strip).toHaveTextContent("4"); // prospected
    expect(strip).toHaveTextContent("28%"); // avg best
  });
});
