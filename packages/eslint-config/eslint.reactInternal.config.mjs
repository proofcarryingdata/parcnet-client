import globals from "globals";
import tseslint from "typescript-eslint";
import baseConfig from "./eslint.base.config.mjs";

export default tseslint.config(...baseConfig, {
  languageOptions: {
    globals: {
      ...globals.browser,
      React: true,
      JSX: true
    }
  }
});
