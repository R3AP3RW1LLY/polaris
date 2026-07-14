import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssayVerdictEvent } from "@lodestar/shared";
import { subscribeAssayVerdicts, useAssayStore } from "./assay.js";

const verdict = (prospectId: number, call: "MINE" | "SKIP" = "MINE"): AssayVerdictEvent => ({
  prospectId,
  call,
  score: 0,
  reasons: [],
  method: "laser",
  timestamp: "2025-06-01T12:00:00Z",
  content: "$AsteroidMaterialContent_High;",
  remainingPct: 100,
  materials: [{ name: "painite", displayName: "Painite", proportion: 25 }],
});

describe("assay store", () => {
  beforeEach(() => {
    useAssayStore.setState({ latest: null, history: [] });
  });

  it("record sets latest and prepends to history (newest first)", () => {
    const { record } = useAssayStore.getState();
    record(verdict(1));
    record(verdict(2, "SKIP"));
    const s = useAssayStore.getState();
    expect(s.latest?.prospectId).toBe(2);
    expect(s.history.map((v) => v.prospectId)).toEqual([2, 1]);
  });

  it("caps history at the limit (drops the oldest)", () => {
    const { record } = useAssayStore.getState();
    for (let i = 1; i <= 20; i += 1) record(verdict(i));
    const s = useAssayStore.getState();
    expect(s.history).toHaveLength(12);
    expect(s.history[0]?.prospectId).toBe(20); // newest
    expect(s.history.at(-1)?.prospectId).toBe(9); // oldest kept (20..9)
  });

  it("subscribeAssayVerdicts records each pushed verdict and unsubscribes", () => {
    let cb: ((v: AssayVerdictEvent) => void) | undefined;
    const off = vi.fn();
    const api = {
      onAssayVerdict: (fn: (v: AssayVerdictEvent) => void) => {
        cb = fn;
        return off;
      },
    };
    const unsub = subscribeAssayVerdicts(api);
    cb?.(verdict(5));
    expect(useAssayStore.getState().latest?.prospectId).toBe(5);
    unsub();
    expect(off).toHaveBeenCalled();
  });
});
