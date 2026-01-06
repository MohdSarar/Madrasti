// Step 2 ESLint: TypeScript-aware (type-checked) for src/, pragmatic for scripts/ and test/
// The audit requirement is *type-aware ESLint*, not style-policing. We keep the
// security/type-safety rules for runtime code, and relax noisy rules for tests/scripts.

import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },

  // Base JS rules
  js.configs.recommended,

  // TypeScript (with type information)
  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        // Type-aware rules need a project.
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Default: apply stricter rules only to src/
  {
    files: ["src/**/*.ts"],
    rules: {
      // Keep type-safety where it matters.
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-argument": "error",

      // Avoid opinionated churn.
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
    },
  },

  // Tests: allow some pragmatic typing (supertest bodies are often `any`).
  {
    files: ["test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  },

  // Scripts: pragmatic as well.
  {
    files: ["scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  }
);
