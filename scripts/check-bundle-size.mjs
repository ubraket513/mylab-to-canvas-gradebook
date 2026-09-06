import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return javascriptFiles(path)
      return entry.isFile() && entry.name.endsWith(".js") ? [path] : []
    })
  )
  return nested.flat()
}

// Budget for the app plus the About page. Well above current usage; a breach means something large
// was added by accident, not that the app drifted a few KiB.
const limit = 1024 * 1024
const files = await javascriptFiles("dist/assets")
const sizes = await Promise.all(files.map(async (file) => gzipSync(await readFile(file)).byteLength))
const total = sizes.reduce((sum, bytes) => sum + bytes, 0)

console.log(`JavaScript gzip total: ${(total / 1024).toFixed(1)} KiB (limit: ${limit / 1024} KiB)`)
if (total > limit) process.exitCode = 1
