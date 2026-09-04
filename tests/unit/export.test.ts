import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { parseCanvasGradebook } from "../../src/csv/canvas"
import {
  buildScoreUpdates,
  exportCanvasGradebook,
  makeDownloadFilename
} from "../../src/csv/export"
import { parseCsvText } from "../../src/csv/parse"
import type { CanvasGradebook, ReviewRow } from "../../src/domain/types"

function fixture(name: string): string {
  return readFileSync(new URL(`../fixtures/anonymized/${name}`, import.meta.url), "utf8")
}

function canvasBook(): CanvasGradebook {
  const matrix = parseCsvText(fixture("canvas-valid.csv"))
  expect(matrix.ok).toBe(true)
  if (!matrix.ok) throw new Error("Synthetic Canvas CSV did not parse.")
  const result = parseCanvasGradebook(matrix.value)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error("Synthetic Canvas gradebook was rejected.")
  return result.value
}

function reviewRow(
  canvasRowIndex: number | null,
  newCanvasScore: number | null,
  includeInExport: boolean
): ReviewRow {
  return {
    key: `row-${canvasRowIndex ?? "none"}`,
    mylabRowIndex: 10,
    canvasRowIndex,
    studentDisplayName: "Synthetic Student",
    matchStatus: canvasRowIndex === null ? "unmatched" : "exact",
    existingCanvasScore: canvasRowIndex === null ? null : { kind: "value", value: 1 },
    sectionResults: [],
    myLabAddOn: newCanvasScore,
    newCanvasScore,
    warnings: [],
    includeInExport
  }
}

describe("Canvas export", () => {
  it("changes only confirmed cells in the selected assignment", () => {
    const book = canvasBook()
    const originalRows = book.matrix.rows.map((row) => [...row])
    const updates = buildScoreUpdates([
      reviewRow(3, 9, true),
      reviewRow(4, 10, true),
      reviewRow(5, 99, false),
      reviewRow(null, null, false)
    ])

    expect([...updates]).toEqual([
      [3, "9.0"],
      [4, "10.0"]
    ])
    const csv = exportCanvasGradebook(book, book.assignments[0]!, updates)
    const exported = parseCsvText(csv)
    const expected = parseCsvText(fixture("canvas-expected.csv"))
    expect(exported.ok).toBe(true)
    expect(expected.ok).toBe(true)
    if (!exported.ok || !expected.ok) return
    expect(exported.value.rows).toEqual(expected.value.rows)

    for (let row = 0; row < originalRows.length; row += 1) {
      for (let column = 0; column < originalRows[row]!.length; column += 1) {
        const isApprovedChange = (row === 3 || row === 4) && column === 5
        if (!isApprovedChange) {
          expect(exported.value.rows[row]![column]).toBe(originalRows[row]![column])
        }
      }
    }
    expect(book.matrix.rows).toEqual(originalRows)
  })

  it("rejects an update for a row outside parsed Canvas students", () => {
    const book = canvasBook()
    expect(() =>
      exportCanvasGradebook(book, book.assignments[0]!, new Map([[6, "9.0"]]))
    ).toThrow(RangeError)
  })

  it("rejects an assignment column that was not selected from the gradebook", () => {
    const book = canvasBook()
    const wrongAssignment = { ...book.assignments[0]!, columnIndex: 6 }
    expect(() => exportCanvasGradebook(book, wrongAssignment, new Map())).toThrow(RangeError)
  })

  it("rejects a non-finite confirmed score", () => {
    expect(() => buildScoreUpdates([reviewRow(3, Number.NaN, true)])).toThrow(RangeError)
  })

  it("rejects incomplete or conflicting included review rows", () => {
    expect(() => buildScoreUpdates([reviewRow(3, null, true)])).toThrow(RangeError)
    expect(() =>
      buildScoreUpdates([reviewRow(3, 4, true), reviewRow(3, 5, true)])
    ).toThrow(RangeError)
  })

  it("retains BOM presence and the detected linebreak", () => {
    const book = canvasBook()
    const withBom: CanvasGradebook = {
      ...book,
      matrix: { ...book.matrix, rows: book.matrix.rows.map((row) => [...row]), hadBom: true }
    }
    const csv = exportCanvasGradebook(withBom, withBom.assignments[0]!, new Map())
    expect(csv.startsWith("\uFEFF")).toBe(true)
    expect(csv).toContain("\r\n")
  })

  it("uses the approved date-based filename", () => {
    expect(makeDownloadFilename(new Date("2026-09-05T12:00:00Z"))).toBe(
      "canvas-gradebook-updated-2026-09-05.csv"
    )
    expect(() => makeDownloadFilename(new Date(Number.NaN))).toThrow(RangeError)
  })
})
