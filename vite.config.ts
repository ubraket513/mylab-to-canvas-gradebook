import { defineConfig } from "vite"

export default defineConfig({
  base: "/",
  // Serve font subsets as same-origin files; data URLs violate font-src 'self'.
  build: { target: "es2022", outDir: "dist", assetsInlineLimit: 0 }
})
