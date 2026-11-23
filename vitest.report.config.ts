import { configDefaults, defineConfig } from "vitest/config";

// Ticket 079: the report files (`*.report.test.ts`), on demand with `npm run report`, always over the 20 named cities.
// (Not a merge of vite.config.ts: a merge would concatenate its `exclude` of the reports onto this one.)
export default defineConfig({
  test: {
    include: ["src/**/*.report.test.ts"],
    exclude: configDefaults.exclude,
    passWithNoTests: true,
    env: { REST_CITIES: "all" },
    globalSetup: ["src/city/testing/globalsetup.ts"],
    setupFiles: ["src/city/testing/yield.setup.ts"],
  },
});
