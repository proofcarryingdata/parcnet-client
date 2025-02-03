import eslint from "@eslint/js";
import pluginChaiFriendly from "eslint-plugin-chai-friendly";
import eslintPluginImport from "eslint-plugin-import";
import hooksPlugin from "eslint-plugin-react-hooks";
import eslintPluginTurbo from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    ignores: [
      "**/src/generated/**",
      "**/node_modules/*",
      "**/dist/",
      "**/vitest.config.ts",
      "**/vite.config.ts",
      "**/vitest.workspace.ts",
      "**/tailwind.config.ts",
      "**/tsup.config.ts",
    ], // global ignore with single ignore key
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    plugins: {
      "chai-friendly": pluginChaiFriendly,
      "react-hooks": hooksPlugin,
      turbo: eslintPluginTurbo,
      import: eslintPluginImport,
    },
    rules: {
      ...hooksPlugin.configs.recommended.rules,
      "turbo/no-undeclared-env-vars": "error",
    },
  },
  {
    rules: {
      "import/extensions": ["error", "always"],
    },
    files: ["./packages/**"],
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
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-case-declarations": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "require-await": "off",
      "@typescript-eslint/require-await": "off",
      "import/no-extraneous-dependencies": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "no-unexpected-multiline": "off",
      "no-restricted-globals": ["error", "origin"],
      "no-restricted-syntax": [
        "error",
        {
          selector: "BinaryExpression[operator='in']",
          message:
            "Don't use in operator. Use Object.prototype.hasOwnProperty.call instead.",
        },
        {
          selector:
            'Property:matches([kind = "get"], [kind = "set"]), MethodDefinition:matches([kind = "get"], [kind = "set"])',
          message: "Don't use get and set accessors.",
        },
        {
          selector: "ForInStatement",
          message: "Don't use for-in loop.",
        },
        // Ban static `this`:
        {
          selector: "MethodDefinition[static = true] ThisExpression",
          message: "Prefer using the class's name directly.",
        },
      ],
    },
  }
);
