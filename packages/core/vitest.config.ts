import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // Integration tests hit a real Postgres (fab_erp_test) — truncating
    // shared tables between tests means they can't safely run in parallel
    // against the same database.
    fileParallelism: false,
  },
});
