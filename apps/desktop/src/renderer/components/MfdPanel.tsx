import type { ReactNode } from "react";

export interface MfdPanelProps {
  readonly title?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * The base cockpit panel: near-black, clipped corners, optional titled header.
 * Rendered as an accessible region labelled by its title.
 */
export function MfdPanel({ title, className, children }: MfdPanelProps): React.JSX.Element {
  return (
    <section
      aria-label={title}
      className={`scanlines clip-mfd border border-cyan-dim/40 bg-void-700/80 text-orange shadow-glow ${className ?? ""}`}
    >
      {title !== undefined && (
        <header className="border-b border-cyan-dim/30 px-3 py-1.5">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-cyan">{title}</h2>
        </header>
      )}
      <div className="p-3">{children}</div>
    </section>
  );
}
