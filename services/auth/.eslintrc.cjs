/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  env: {
    node: true,      // => process, __dirname
    es2022: true,
    jest: true       // => describe/it/expect/beforeAll...
  },
    parser: "@typescript-eslint/parser",
    parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    },
    plugins: ["@typescript-eslint", "jest"],
    extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:jest/recommended",
    ],

  ignorePatterns: [
    "dist/",
    "coverage/",
    "node_modules/",
    "*.cjs" // optionnel: tu peux l’enlever si tu veux lint les configs
  ],
  rules: {
    // optionnel selon ton style
    "@typescript-eslint/no-explicit-any": "off"
  }
};
