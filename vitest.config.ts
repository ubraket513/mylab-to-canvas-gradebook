import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/private/**"],
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.ts", "src/csv/**/*.ts"],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 }
    }
  }
})
