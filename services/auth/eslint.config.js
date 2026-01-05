import js from "@eslint/js";
import tseslint from "typescript-eslint";
import jest from "eslint-plugin-jest";
import globals from "globals";

export default [
  js.configs.recommended,

  // TypeScript + Jest + Node config for TS files
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: tseslint.parser,
      globals: {
        ...globals.node, // gives process, __dirname, etc.
        ...globals.jest, // gives describe, it, expect, beforeAll, etc.
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      jest,
    },
    rules: {
      "no-console": "off",
    },
  },
];
