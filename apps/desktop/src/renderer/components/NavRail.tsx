import { MODULES } from "../modules.js";
import type { ModuleId } from "../modules.js";

export interface NavRailProps {
  readonly active: ModuleId;
  readonly onSelect: (id: ModuleId) => void;
}

/**
 * The cockpit nav rail. Available modules navigate; unbuilt ones are shown with
 * their arrival phase and are inert (never dead links) — Step 0.9.
 */
export function NavRail({ active, onSelect }: NavRailProps): React.JSX.Element {
  return (
    <nav aria-label="Modules" className="flex w-44 flex-col gap-1 border-r border-cyan-dim/30 p-2">
      {MODULES.map((module) => {
        const isActive = module.id === active;
        return (
          <button
            key={module.id}
            type="button"
            disabled={!module.available}
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              if (module.available) onSelect(module.id);
            }}
            className={`clip-mfd flex flex-col border px-2 py-1 text-left font-display text-xs uppercase tracking-widest transition-colors ${
              isActive
                ? "border-orange bg-orange/15 text-orange"
                : module.available
                  ? "border-cyan-dim/40 text-cyan hover:bg-cyan/10"
                  : "border-void-600 text-signal-skip"
            }`}
          >
            <span>{module.label}</span>
            {!module.available && (
              <span className="text-[9px] text-signal-skip">arrives · Phase {module.phase}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
