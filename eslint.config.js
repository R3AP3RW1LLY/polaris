// LODESTAR lint wall (SSOT §4.1 / Step 0.3). Scope: product source under
// src/. Type-aware strict rules; no `any`, no non-null assertions outside
// tests, no enums. Prettier disables stylistic conflicts.
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/build/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/test/fixtures/**",
    ],
  },
  // Stale disable directives are an error everywhere (a disable that no longer
  // suppresses anything is dead weight hiding a bypass).
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  {
    files: [
      "packages/*/src/**/*.{ts,tsx}",
      "apps/*/src/**/*.{ts,tsx}",
      "services/*/src/**/*.{ts,tsx}",
    ],
    extends: [...tseslint.configs.strictTypeChecked],
    plugins: { "@eslint-community/eslint-comments": eslintComments },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Use union types instead of enums (SSOT §4.1).",
        },
      ],
      // Every rule suppression must carry a `-- reason` and target specific
      // rules; blanket `eslint-disable` is banned. Keeps the wall auditable.
      "@eslint-community/eslint-comments/require-description": ["error", { ignore: [] }],
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
      "@eslint-community/eslint-comments/no-aggregating-enable": "error",
    },
  },
  {
    files: ["**/*.tsx"],
    extends: [reactHooks.configs["recommended-latest"]],
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "off",
    },
  },
  prettier,
);
