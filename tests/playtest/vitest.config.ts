import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The playtest harness (ticket 036) has its own config: `npm test` and `npm run gate` never collect it.
export default defineConfig({
  root: join(dirname(fileURLToPath(import.meta.url)), "..", ".."),
  test: {
    include: ["tests/playtest/**/*.test.ts"],
  },
});
