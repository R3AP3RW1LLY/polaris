import type { Config } from "tailwindcss";
import preset from "./src/renderer/theme/tailwind-preset.js";

export default {
  content: ["./src/renderer/**/*.{ts,tsx,html}"],
  presets: [preset as Config],
} satisfies Config;
