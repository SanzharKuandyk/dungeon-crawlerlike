import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/game/**/*.test.ts", "tests/server/**/*.test.ts", "tests/client/**/*.test.ts"],
    testTimeout: 15000,
  },
});
