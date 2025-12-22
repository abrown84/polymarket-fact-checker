/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react-hooks", "react-refresh"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", "node_modules", "src/convex/_generated"],
  rules: {
    // This repo uses a lot of API-shaped data; don't block deploys on `any`.
    "@typescript-eslint/no-explicit-any": "off",
    // Allow legacy code annotations without failing lint.
    "@typescript-eslint/ban-ts-comment": "off",
    // Keep unused vars strict (and avoid warnings since lint uses --max-warnings 0).
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", ignoreRestSiblings: true },
    ],
    // Optional in this project; avoid surprising lint failures.
    "react-refresh/only-export-components": "off",
  },
};

