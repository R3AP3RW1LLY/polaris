import type { ButtonHTMLAttributes, ReactNode } from "react";

export type MfdButtonVariant = "primary" | "ghost";

export interface MfdButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "style"
> {
  readonly variant?: MfdButtonVariant;
  readonly children: ReactNode;
}

const VARIANT_CLASSES: Record<MfdButtonVariant, string> = {
  primary: "border-orange bg-orange/15 text-orange hover:bg-orange/25 shadow-glow",
  ghost: "border-cyan-dim/50 bg-transparent text-cyan hover:bg-cyan/10",
};

/**
 * Cockpit-styled button. Defaults to type=button so it never accidentally
 * submits a form; disabled state suppresses interaction.
 */
export function MfdButton({
  variant = "primary",
  type = "button",
  children,
  ...rest
}: MfdButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      className={`clip-mfd border px-3 py-1 font-display text-xs uppercase tracking-[0.15em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]}`}
      {...rest}
    >
      {children}
    </button>
  );
}
