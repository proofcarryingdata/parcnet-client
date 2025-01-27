import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "src/**/*.tsx"],
  format: ["cjs", "esm"],
  clean: true,
  sourcemap: true,
  splitting: false,
  minify: true,
  define: {
    "import.meta.vitest": "undefined"
  }
});
