import { useEffect, useState } from "react";
import type { AppHealth } from "@lodestar/shared";
import { Settings } from "./screens/Settings.js";
import { MfdButton } from "./components/MfdButton.js";

type View = "deck" | "settings";

/**
 * Phase-0 app shell: a minimal view switcher between the Command Deck health
 * readout and the Settings screen. The full cockpit-MFD nav rail + routes
 * arrive in Step 0.9.
 */
export function App(): React.JSX.Element {
  const [view, setView] = useState<View>("deck");
  return (
    <div className="min-h-screen bg-void text-orange">
      <nav className="flex gap-2 border-b border-cyan-dim/30 p-2">
        <MfdButton
          variant={view === "deck" ? "primary" : "ghost"}
          onClick={() => {
            setView("deck");
          }}
        >
          Command Deck
        </MfdButton>
        <MfdButton
          variant={view === "settings" ? "primary" : "ghost"}
          onClick={() => {
            setView("settings");
          }}
        >
          Settings
        </MfdButton>
      </nav>
      {view === "deck" ? <CommandDeck /> : <Settings />}
    </div>
  );
}

function CommandDeck(): React.JSX.Element {
  const [health, setHealth] = useState<AppHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.lodestar
      .getHealth()
      .then(setHealth)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
      });
  }, []);

  return (
    <main style={{ fontFamily: "monospace", padding: 24 }}>
      <h1>LODESTAR</h1>
      {error !== null && <p style={{ color: "#ff4444" }}>health error: {error}</p>}
      {health === null && error === null && <p>querying health…</p>}
      {health !== null && (
        <dl>
          <dt>version</dt>
          <dd data-testid="version">{health.version}</dd>
          <dt>database</dt>
          <dd data-testid="db-status">{health.dbStatus}</dd>
          <dt>journal</dt>
          <dd data-testid="journal-status">{health.journalStatus}</dd>
        </dl>
      )}
    </main>
  );
}
