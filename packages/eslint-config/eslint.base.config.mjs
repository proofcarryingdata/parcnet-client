import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginChaiFriendly from "eslint-plugin-chai-friendly";
import hooksPlugin from "eslint-plugin-react-hooks";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintPluginTurbo from "eslint-plugin-turbo";
import eslintPluginImport from "eslint-plugin-import";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    ignores: ["**/node_modules/*", "**/dist/", "**/vitest.config.ts"] // global ignore with single ignore key
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true
      }
    }
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked]
  },
  {
    plugins: {
      "chai-friendly": pluginChaiFriendly,
      "react-hooks": hooksPlugin,
      prettier: eslintPluginPrettier,
      turbo: eslintPluginTurbo,
      import: eslintPluginImport
    },
    rules: {
      ...hooksPlugin.configs.recommended.rules,
      "prettier/prettier": "error",
      "turbo/no-undeclared-env-vars": "error"
    }
  },
  {
    rules: {
      "import/extensions": ["error", "always"]
    },
    files: ["./packages/**"]
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
      "react-hooks/exhaustive-deps": "error",
      "require-await": "off",
      "@typescript-eslint/require-await": "off"
    }
  }
);
