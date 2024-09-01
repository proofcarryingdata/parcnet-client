/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["@parcnet/eslint-config/library.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname
  }
};
