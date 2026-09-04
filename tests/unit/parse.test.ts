import { describe, expect, it } from "vitest"
import { MAX_CSV_BYTES } from "../../src/config"
import { parseCsvFile, parseCsvText } from "../../src/csv/parse"

describe("parseCsvText", () => {
  it("keeps cells as strings and preserves structural blank rows", () => {
    const result = parseCsvText('\uFEFFStudent,SIS Login ID\r\n"Lovelace, Ada",00123\r\n,\r\n')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.hadBom).toBe(true)
    expect(result.value.linebreak).toBe("\r\n")
    expect(result.value.rows[1]).toEqual(["Lovelace, Ada", "00123"])
    expect(result.value.rows[2]).toEqual(["", ""])
  })

  it("returns parser errors instead of throwing or logging rows", () => {
    const result = parseCsvText('Student,SIS Login ID\n"unclosed,abc123')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.code).toBe("csv-parse-error")
  })
})

describe("parseCsvFile", () => {
  it("rejects the wrong extension before reading a file", async () => {
    const result = await parseCsvFile({ name: "grades.txt", size: 12 } as File)
    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "invalid-file-type",
          severity: "error",
          message: "Choose a CSV file."
        }
      ]
    })
  })

  it("rejects a CSV larger than the privacy-safe browser limit", async () => {
    const result = await parseCsvFile({ name: "grades.csv", size: MAX_CSV_BYTES + 1 } as File)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.code).toBe("file-too-large")
  })
})
