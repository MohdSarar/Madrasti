// services/auth/eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import jest from "eslint-plugin-jest";
import tseslint from "typescript-eslint";

export default [
  // 1) Enterprise: ignore build artifacts & vendor dirs
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },

  // 2) Base JS recommended
  js.configs.recommended,

  // 3) TypeScript recommended (parser + rules)
  ...tseslint.configs.recommended,

  // 4) Project rules for TS files
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node, // process, __dirname, etc.
      },
    },
    rules: {
      // enterprise pragmatic defaults
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // 5) Jest tests only
  {
    files: ["test/**/*.ts", "**/*.test.ts"],
    plugins: { jest },
    languageOptions: {
      globals: {
        ...globals.jest, // describe/it/test/expect/beforeAll...
      },
    },
    rules: {
      ...jest.configs.recommended.rules,
    },
  },
];
