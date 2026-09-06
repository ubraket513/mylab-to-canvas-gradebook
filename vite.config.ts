import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

const entry = (name: string) => fileURLToPath(new URL(name, import.meta.url))

export default defineConfig({
  base: "/",
  // Serve font subsets as same-origin files; data URLs violate font-src 'self'.
  build: {
    target: "es2022",
    outDir: "dist",
    assetsInlineLimit: 0,
    // The information pages are their own documents so the workflow keeps its state in the original tab.
    rollupOptions: {
      input: {
        main: entry("index.html"),
        crashReport: entry("crash-report.html"),
        privacy: entry("privacy.html"),
        license: entry("license.html")
      }
    }
  }
})
