/**
 * Renderer Assay store (SSOT Step 2.9). Holds the latest verdict + a rolling
 * history, fed by the `assay.verdict` push. Wired app-level (App.tsx) so verdicts
 * accumulate even when the Assay screen isn't mounted — the history is populated
 * when you open it, not started empty.
 */

import { create } from "zustand";
import type { AssayVerdictEvent } from "@lodestar/shared";

const HISTORY_LIMIT = 12;

export interface AssayStore {
  readonly latest: AssayVerdictEvent | null;
  /** Most recent first, capped at HISTORY_LIMIT. */
  readonly history: readonly AssayVerdictEvent[];
  record: (verdict: AssayVerdictEvent) => void;
}

export const useAssayStore = create<AssayStore>((set) => ({
  latest: null,
  history: [],
  record: (verdict) => {
    set((prev) => ({
      latest: verdict,
      history: [verdict, ...prev.history].slice(0, HISTORY_LIMIT),
    }));
  },
}));

/** The slice of the preload API the subscription consumes. */
export interface AssayApi {
  onAssayVerdict: (cb: (verdict: AssayVerdictEvent) => void) => () => void;
}

/** Wire the `assay.verdict` push into the store; returns an unsubscribe. */
export function subscribeAssayVerdicts(
  api: AssayApi,
  record: AssayStore["record"] = useAssayStore.getState().record,
): () => void {
  return api.onAssayVerdict((verdict) => {
    record(verdict);
  });
}
