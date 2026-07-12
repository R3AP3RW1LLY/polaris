import type { Config } from "tailwindcss";

/**
 * Cockpit-MFD design tokens (SSOT §3.1 visual theme): near-black panels,
 * Elite-orange primary, cyan accents. Consumed by tailwind.config.ts as a
 * preset so tokens live in one place.
 */
const preset: Omit<Config, "content"> = {
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: "#0a0a0f",
          900: "#05050a",
          800: "#0a0a0f",
          700: "#12121a",
          600: "#1b1b26",
        },
        orange: {
          DEFAULT: "#ff7100",
          bright: "#ff8c2b",
          dim: "#b34f00",
        },
        cyan: {
          DEFAULT: "#00b3d6",
          bright: "#2be0ff",
          dim: "#0a7f99",
        },
        signal: {
          mine: "#ff7100",
          skip: "#5a5a6a",
          warn: "#ffcc33",
          danger: "#ff4444",
          ok: "#33dd88",
        },
      },
      fontFamily: {
        display: ['"Orbitron"', '"Rajdhani"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Consolas"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 8px rgba(255,113,0,0.45)",
        "glow-cyan": "0 0 8px rgba(0,179,214,0.45)",
      },
    },
  },
};

export default preset;
