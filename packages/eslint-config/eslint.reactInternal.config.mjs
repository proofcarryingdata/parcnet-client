import baseConfig from "./eslint.base.config.mjs";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(...baseConfig, {
  languageOptions: {
    globals: {
      ...globals.browser,
      React: true,
      JSX: true
    }
  }
});
