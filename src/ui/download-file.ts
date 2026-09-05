export function downloadCsv(contents: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

interface SaveHandle { createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void>; abort(): Promise<void> }> }
type SaveWindow = Window & { showSaveFilePicker?: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<SaveHandle> }
export const supportsSaveAs = (): boolean => window.isSecureContext && typeof (window as SaveWindow).showSaveFilePicker === "function"

export async function saveCsvAs(contents: () => string, filename: string): Promise<"saved" | "cancelled"> {
  const picker = (window as SaveWindow).showSaveFilePicker
  if (!picker || !supportsSaveAs()) throw new Error("Save as is unavailable")
  let handle: SaveHandle
  try {
    // Open before generating the CSV so the click's user activation is preserved.
    handle = await picker.call(window, { suggestedName: filename, types: [{ description: "Canvas gradebook CSV", accept: { "text/csv": [".csv"] } }] })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled"
    throw error
  }
  const data = contents()
  const writable = await handle.createWritable()
  try { await writable.write(data); await writable.close() }
  catch (error) { try { await writable.abort() } catch { /* Preserve the original failure. */ } throw error }
  return "saved"
}
