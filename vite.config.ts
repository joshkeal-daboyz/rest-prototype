import { defineConfig } from "vitest/config";

// base is the repo name so the build works on GitHub Pages (joshkeal-daboyz.github.io/rest-prototype/).
export default defineConfig({
  base: process.env["GITHUB_PAGES"] ? "/rest-prototype/" : "/",
  test: {
    include: ["src/**/*.test.ts", "tools/**/*.test.ts"],
    passWithNoTests: true,
  },
});
