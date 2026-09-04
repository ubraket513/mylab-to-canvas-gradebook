import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { parseCsvText } from "../../src/csv/parse"
import { parseMyLabGradebook } from "../../src/csv/mylab"
import type { MyLabGradebook } from "../../src/domain/types"

function parseText(text: string): MyLabGradebook {
  const matrix = parseCsvText(text)
  expect(matrix.ok).toBe(true)
  if (!matrix.ok) throw new Error("Synthetic CSV did not parse.")

  const result = parseMyLabGradebook(matrix.value)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error("Synthetic MyLab gradebook was rejected.")
  return result.value
}

function fixture(name: string): string {
  return readFileSync(new URL(`../fixtures/anonymized/${name}`, import.meta.url), "utf8")
}

function myLabCsv(keys: readonly string[], weights: readonly number[], scores: readonly string[]): string {
  const pad = ",,,,,"
  return [
    `${pad}${keys.join(",")}`,
    `${pad}${keys.map(() => "1").join(",")}`,
    `,,,,Weight,${weights.join(",")}`,
    `,,,,Attempt,${keys.map(() => "1").join(",")}`,
    `Last name,First name,Email,Log-in,,${keys.map(() => "Score").join(",")}`,
    `Lovelace,Ada,adl1@psu.edu,adl1,,${scores.join(",")}`
  ].join("\n")
}

describe("parseMyLabGradebook", () => {
  it("discovers three sections and preserves fractional weights and blanks", () => {
    const book = parseText(fixture("mylab-three-sections.csv"))

    expect(book.sections.map(({ key, detectedWeight }) => ({ key, detectedWeight }))).toEqual([
      { key: "1.1", detectedWeight: 10 },
      { key: "1.2", detectedWeight: 2.5 },
      { key: "1.3", detectedWeight: 5 }
    ])
    expect(book.students).toHaveLength(2)
    expect(book.students[1]?.scores["1.2"]).toEqual({ kind: "blank" })
    expect(book.students.some(({ lastName }) => lastName === "Course average")).toBe(false)
  })

  it.each([
    [["1.1"], [10], ["0.1234"]],
    [["1.1", "1.2"], [10, 2.5], ["0.1234", "0.8"]]
  ])("supports a dynamic section count", (keys, weights, scores) => {
    const book = parseText(`\n\n${myLabCsv(keys, weights, scores)}\n\n`)
    expect(book.sections.map(({ key }) => key)).toEqual(keys)
    expect(book.students[0]?.scores["1.1"]).toEqual({ kind: "value", value: 0.1234 })
  })

  it("rejects missing Weight metadata", () => {
    const matrix = parseCsvText(myLabCsv(["1.1"], [10], ["0.8"]).replace("Weight", "Other"))
    expect(matrix.ok).toBe(true)
    if (!matrix.ok) return

    const result = parseMyLabGradebook(matrix.value)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.code).toBe("mylab-weight-row-missing")
  })

  it.each(["-0.01", "1.01"])("marks an out-of-range score %s invalid", (score) => {
    const book = parseText(myLabCsv(["1.1"], [10], [score]))
    expect(book.students[0]?.scores["1.1"]).toEqual({ kind: "invalid", raw: score })
    expect(book.issues.map(({ code }) => code)).toContain("mylab-invalid-score")
  })

  it("retains invalid text and adds a non-PII row-level issue", () => {
    const book = parseText(fixture("mylab-invalid-score.csv"))
    expect(book.students[0]?.scores["1.2"]).toEqual({ kind: "invalid", raw: "absent" })
    expect(book.issues).toContainEqual({
      code: "mylab-invalid-score",
      severity: "warning",
      message: "A MyLab score is invalid and requires review.",
      row: 6,
      column: 7
    })
  })
})
