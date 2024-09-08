import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginChaiFriendly from "eslint-plugin-chai-friendly";
import hooksPlugin from "eslint-plugin-react-hooks";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintPluginTurbo from "eslint-plugin-turbo";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,

  {
    ignores: ["**/node_modules/*", "**/dist/"] // global ignore with single ignore key
  },
  {
    languageOptions: {
      parserOptions: {
        project: false,
        tsconfigRootDir: import.meta.dirname
      }
    },
    files: ["src/**/*.{ts,tsx}"]
  },
  {
    plugins: {
      "chai-friendly": pluginChaiFriendly,
      "react-hooks": hooksPlugin,
      prettier: eslintPluginPrettier,
      turbo: eslintPluginTurbo
    },
    rules: {
      ...hooksPlugin.configs.recommended.rules,
      "prettier/prettier": "error",
      "turbo/no-undeclared-env-vars": "error"
    }
  },
  {
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
      "chai-friendly/no-unused-expressions": "error",
      "@typescript-eslint/consistent-type-definitions": "off",
      // enable underscore ignore pattern for unused vars
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      "no-case-declarations": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error"
    }
  }
);