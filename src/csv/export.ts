import Papa from "papaparse"

import type { CanvasAssignment, CanvasGradebook, ReviewRow } from "../domain/types"

export function buildScoreUpdates(rows: readonly ReviewRow[]): ReadonlyMap<number, string> {
  const updates = new Map<number, string>()
  for (const row of rows) {
    if (!row.includeInExport) continue
    if (row.canvasRowIndex === null || row.newCanvasScore === null) {
      throw new RangeError("An included review row is missing its confirmed score.")
    }
    if (!Number.isFinite(row.newCanvasScore)) {
      throw new RangeError("An included review row has a non-finite score.")
    }
    if (updates.has(row.canvasRowIndex)) {
      throw new RangeError("More than one review row targets the same Canvas student.")
    }
    updates.set(row.canvasRowIndex, row.newCanvasScore.toFixed(1))
  }
  return updates
}

export function exportCanvasGradebook(
  gradebook: CanvasGradebook,
  assignment: CanvasAssignment,
  updates: ReadonlyMap<number, string>
): string {
  const isKnownAssignment = gradebook.assignments.some(
    (candidate) =>
      candidate.assignmentId === assignment.assignmentId &&
      candidate.columnIndex === assignment.columnIndex
  )
  if (!isKnownAssignment) {
    throw new RangeError("The selected assignment is not part of this Canvas gradebook.")
  }

  const studentRows = new Set(gradebook.students.map(({ rowIndex }) => rowIndex))
  const rows = gradebook.matrix.rows.map((row) => [...row])
  for (const [rowIndex, score] of updates) {
    if (!studentRows.has(rowIndex)) {
      throw new RangeError("A score update targets a row outside the parsed Canvas students.")
    }
    const numericScore = Number(score)
    if (!Number.isFinite(numericScore)) {
      throw new RangeError("A score update must be finite.")
    }
    rows[rowIndex]![assignment.columnIndex] = numericScore.toFixed(1)
  }

  const csv = Papa.unparse(rows, {
    header: false,
    delimiter: ",",
    newline: gradebook.matrix.linebreak || "\r\n",
    quoteChar: '"',
    escapeChar: '"',
    quotes: false,
    skipEmptyLines: false,
    escapeFormulae: false
  })
  return gradebook.matrix.hadBom ? `\uFEFF${csv}` : csv
}

export function makeDownloadFilename(now: Date): string {
  if (!Number.isFinite(now.getTime())) throw new RangeError("A valid date is required.")
  return `canvas-gradebook-updated-${now.toISOString().slice(0, 10)}.csv`
}
