const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "prettier",
    "turbo"
  ],
  plugins: ["only-warn", "@typescript-eslint", "react-hooks"],
  globals: {
    React: true,
    JSX: true
  },
  env: {
    node: true
  },
  settings: {
    "import/resolver": {
      typescript: {
        project
      }
    }
  },
  ignorePatterns: [
    // Ignore dotfiles
    ".*.js",
    ".*.cjs",
    "node_modules/",
    "dist/"
  ],
  overrides: [
    {
      files: ["*.js?(x)", "*.ts?(x)"]
    }
  ],
  rules: {
    "no-unused-vars": "off",
    "no-case-declarations": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error"
  }
};
