import { MfdPanel } from "../components/MfdPanel.js";

/**
 * The Command Deck shell (Step 0.9). An empty MFD grid awaiting the live
 * telemetry that Phase 1 delivers (ship, location, fuel, pips, cargo, session
 * rates). Phase-0 scope is the frame, not the data.
 */
export function CommandDeck(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="font-display text-lg uppercase tracking-[0.3em] text-orange">Command Deck</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {["Ship", "Location", "Fuel & Pips", "Cargo", "Activity", "Session"].map((slot) => (
          <MfdPanel key={slot} title={slot}>
            <p className="text-xs text-signal-skip">awaiting live telemetry · Phase 1</p>
          </MfdPanel>
        ))}
      </div>
    </div>
  );
}
