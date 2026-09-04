import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { parseCanvasGradebook, readCanvasScore } from "../../src/csv/canvas"
import { parseCsvText } from "../../src/csv/parse"
import type { CanvasGradebook } from "../../src/domain/types"

function parseFixture(name: string): CanvasGradebook {
  const csv = readFileSync(new URL(`../fixtures/anonymized/${name}`, import.meta.url), "utf8")
  const matrix = parseCsvText(csv)
  expect(matrix.ok).toBe(true)
  if (!matrix.ok) throw new Error("Synthetic CSV fixture did not parse.")

  const result = parseCanvasGradebook(matrix.value)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error("Synthetic Canvas fixture was rejected.")
  return result.value
}

describe("parseCanvasGradebook", () => {
  it("detects assignments and students while retaining Canvas metadata", () => {
    const book = parseFixture("canvas-valid.csv")

    expect(book.assignments).toEqual([
      {
        assignmentId: "15461093",
        columnIndex: 5,
        name: "H2",
        pointsPossible: 10
      }
    ])
    expect(book.students).toHaveLength(3)
    expect(book.matrix.rows[1]?.[5]).toBe("Manual Posting")
    expect(book.assignments.map(({ name }) => name)).not.toContain("Homework Current Score")
    expect(book.matrix.rows.some((row) => row[0] === "Student, Test")).toBe(true)
    expect(book.students.some(({ name }) => name === "Student, Test")).toBe(false)
  })

  it("reads blank, numeric, and invalid assignment cells without mutation", () => {
    const book = parseFixture("canvas-valid.csv")
    const assignment = book.assignments[0]!

    expect(readCanvasScore(book, assignment, 4)).toEqual({ kind: "blank" })
    expect(book.matrix.rows[4]?.[assignment.columnIndex]).toBe("")
    expect(readCanvasScore(book, assignment, 3)).toEqual({ kind: "value", value: 2.5 })
    expect(book.matrix.rows[3]?.[assignment.columnIndex]).toBe("2.5")

    book.matrix.rows[3]![assignment.columnIndex] = "not scored"
    expect(readCanvasScore(book, assignment, 3)).toEqual({
      kind: "invalid",
      raw: "not scored"
    })
  })

  it("rejects a gradebook without the Points Possible metadata row", () => {
    const matrix = parseCsvText(
      "Student,SIS User ID,SIS Login ID,H2 (15461093)\nAda Lovelace,9001,adl1,2.5"
    )
    expect(matrix.ok).toBe(true)
    if (!matrix.ok) return

    const result = parseCanvasGradebook(matrix.value)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.code).toBe("canvas-points-row-missing")
  })

  it("warns when normalized SIS Login IDs are duplicated", () => {
    const csv = readFileSync(
      new URL("../fixtures/anonymized/canvas-duplicate.csv", import.meta.url),
      "utf8"
    )
    const matrix = parseCsvText(csv)
    expect(matrix.ok).toBe(true)
    if (!matrix.ok) return

    const result = parseCanvasGradebook(matrix.value)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.warnings.some(({ code }) => code === "canvas-duplicate-login")).toBe(true)
  })

  it("keeps a non-test row without a login unchanged and warns about it", () => {
    const matrix = parseCsvText(
      "Student,SIS User ID,SIS Login ID,H2 (15461093)\n" +
        "Points Possible,,,10\n" +
        "Ada Lovelace,9001,,2.5"
    )
    expect(matrix.ok).toBe(true)
    if (!matrix.ok) return

    const result = parseCanvasGradebook(matrix.value)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.students).toEqual([])
    expect(result.value.matrix.rows[2]?.[0]).toBe("Ada Lovelace")
    expect(result.warnings.map(({ code }) => code)).toContain("canvas-missing-login")
  })
})
