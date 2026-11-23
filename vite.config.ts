import { configDefaults, defineConfig } from "vitest/config";
import { calibrationPlugin } from "./tools/calibration/plugin";

// base is the repo name so the build works on GitHub Pages (joshkeal-daboyz.github.io/rest-prototype/).
export default defineConfig(({ mode }) => ({
  base: process.env["GITHUB_PAGES"] ? "/rest-prototype/" : "/",
  // Dev only (apply: "serve"): saves the 3D gallery's front choices to assets/private/ (ticket 045).
  plugins: [calibrationPlugin()],
  server: {
    // The calibration file and the 110 MB model files are not part of the module graph; don't watch them.
    watch: { ignored: ["**/assets/private/**"] },
  },
  test: {
    include: ["src/**/*.test.ts", "tools/**/*.test.ts"],
    // Ticket 079: reports run only through `npm run report` (vitest.report.config.ts).
    exclude: [...configDefaults.exclude, "**/*.report.test.ts"],
    // Ticket 079: "all" (`--mode full`) runs the whole-city tests on the 20 named cities, otherwise on one.
    env: { REST_CITIES: mode === "full" ? "all" : "" },
    passWithNoTests: true,
    // Ticket 076: makes the run's shared city cache folder (and deletes it at the end).
    globalSetup: ["src/city/testing/globalsetup.ts"],
    // Ticket 078: a short pause after every test so the worker answers vitest (no onTaskUpdate timeout).
    setupFiles: ["src/city/testing/yield.setup.ts"],
  },
}));
