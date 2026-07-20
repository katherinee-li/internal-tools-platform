import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use an isolated in-memory DB so tests never touch the dev data.db.
    env: { DB_PATH: ":memory:" },
    include: ["src/**/*.test.ts"],
  },
});
