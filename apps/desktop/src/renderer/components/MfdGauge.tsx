export interface MfdGaugeProps {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly unit?: string;
}

/** Proportional fill percent, clamped to 0..100 and safe against a zero max. */
export function gaugeFillPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  const pct = (value / max) * 100;
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return pct;
}

/** A horizontal bar gauge (fuel, cargo %, …) exposed as an accessible meter. */
export function MfdGauge({ label, value, max, unit }: MfdGaugeProps): React.JSX.Element {
  const fill = gaugeFillPercent(value, max);
  // ARIA value must agree with the clamped visual bar, never exceed the range.
  const safeMax = max > 0 ? max : 0;
  const ariaNow = Math.min(Math.max(value, 0), safeMax);
  return (
    <div className="font-mono text-xs">
      <div className="mb-0.5 flex justify-between text-cyan">
        <span className="uppercase tracking-[0.15em]">{label}</span>
        <span className="text-orange">
          {value}
          {unit !== undefined ? ` ${unit}` : ""}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={ariaNow}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        className="h-2 w-full overflow-hidden border border-cyan-dim/40 bg-void-900"
      >
        <div
          data-testid="gauge-fill"
          className="h-full bg-orange shadow-glow"
          style={{ width: `${String(fill)}%` }}
        />
      </div>
    </div>
  );
}
