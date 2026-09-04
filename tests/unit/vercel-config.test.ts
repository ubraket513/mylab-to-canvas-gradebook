import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

describe("Vercel configuration", () => {
  it("builds only the static Vite site with restrictive global headers", () => {
    const config = JSON.parse(
      readFileSync(new URL("../../vercel.json", import.meta.url), "utf8")
    ) as Record<string, unknown>
    expect(config).toMatchObject({
      framework: "vite",
      buildCommand: "npm run build",
      outputDirectory: "dist"
    })
    expect(config).not.toHaveProperty("rewrites")
    expect(config).not.toHaveProperty("functions")

    const rules = config.headers as Array<{ source: string; headers: Array<{ key: string; value: string }> }>
    expect(rules).toHaveLength(1)
    expect(rules[0]?.source).toBe("/(.*)")
    const headers = new Map(rules[0]?.headers.map(({ key, value }) => [key, value]))
    expect(headers.get("Content-Security-Policy")).toContain("connect-src 'none'")
    expect(headers.get("Content-Security-Policy")).toContain("worker-src 'self' blob:")
    expect(headers.get("X-Frame-Options")).toBe("DENY")
  })
})
