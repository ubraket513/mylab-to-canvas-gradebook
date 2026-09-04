import { existsSync, readdirSync, readFileSync } from "node:fs"
import { basename, join } from "node:path"

import { describe, expect, it } from "vitest"

import { parseCanvasGradebook, readCanvasScore } from "../../src/csv/canvas"
import { parseCsvText } from "../../src/csv/parse"
import { parseMyLabGradebook } from "../../src/csv/mylab"
import { matchStudents, normalizePsuLogin } from "../../src/domain/matching"
import { calculateCanvasScore, calculateMyLabAddOn } from "../../src/domain/score"
import type { CanvasGradebook, MyLabGradebook } from "../../src/domain/types"

const projectRoot = process.cwd()
const privateRoots = [
  join(projectRoot, "canvas-old-gradebook-compare"),
  join(projectRoot, "mylab-gradebook-compare"),
  join(projectRoot, "canvas-new-gradebook-compare")
] as const

// These private cases were produced with the detected weights and have a reproducible
// raw-identifier overlap. Other retained exports used unrecorded interactive weights.
const reproducibleCaseNumbers = new Set([7, 9])

function filesByNumericPrefix(directory: string): Map<string, string> {
  const files = new Map<string, string>()
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".csv")) continue
    const prefix = /^(\d+)/u.exec(basename(entry.name, ".csv"))?.[1]
    if (prefix) files.set(prefix, join(directory, entry.name))
  }
  return files
}

function parseCanvas(path: string): CanvasGradebook {
  const matrix = parseCsvText(readFileSync(path, "utf8"))
  if (!matrix.ok) throw new Error(matrix.errors[0]?.code ?? "private-canvas-csv-error")
  const gradebook = parseCanvasGradebook(matrix.value)
  if (!gradebook.ok) throw new Error(gradebook.errors[0]?.code ?? "private-canvas-structure-error")
  return gradebook.value
}

function parseMyLab(path: string): MyLabGradebook {
  const matrix = parseCsvText(readFileSync(path, "utf8"))
  if (!matrix.ok) throw new Error(matrix.errors[0]?.code ?? "private-mylab-csv-error")
  const gradebook = parseMyLabGradebook(matrix.value)
  if (!gradebook.ok) throw new Error(gradebook.errors[0]?.code ?? "private-mylab-structure-error")
  return gradebook.value
}

describe("private legacy numeric parity", () => {
  const presentCount = privateRoots.filter((directory) => existsSync(directory)).length
  if (presentCount !== privateRoots.length) {
    it.skip(`private parity unavailable (${presentCount}/${privateRoots.length})`, () => undefined)
    return
  }

  it("matches exact-identifier selected-assignment numbers", () => {
    const [oldCanvasRoot, myLabRoot, newCanvasRoot] = privateRoots
    const oldCanvasFiles = filesByNumericPrefix(oldCanvasRoot)
    const myLabFiles = filesByNumericPrefix(myLabRoot)
    const newCanvasFiles = filesByNumericPrefix(newCanvasRoot)
    const caseKeys = [...oldCanvasFiles.keys()]
      .filter((key) => myLabFiles.has(key) && newCanvasFiles.has(key))
      .sort((left, right) => Number(left) - Number(right))

    expect(caseKeys.length, "private parity found no common cases").toBeGreaterThan(0)

    const failingCaseNumbers: number[] = []
    let comparisonCount = 0
    for (const [caseIndex, assignmentId] of caseKeys.entries()) {
      let caseFailed = false
      try {
        const oldCanvas = parseCanvas(oldCanvasFiles.get(assignmentId)!)
        const mylab = parseMyLab(myLabFiles.get(assignmentId)!)
        const historical = parseCanvas(newCanvasFiles.get(assignmentId)!)
        const oldAssignment = oldCanvas.assignments.find(
          (candidate) => candidate.assignmentId === assignmentId
        )
        const historicalAssignment = historical.assignments.find(
          (candidate) => candidate.assignmentId === assignmentId
        )
        if (!oldAssignment || !historicalAssignment) throw new Error("Private assignment missing.")

        const historicalByLogin = new Map(
          historical.students.map((student) => [normalizePsuLogin(student.sisLoginId), student])
        )
        const myLabByRow = new Map(mylab.students.map((student) => [student.rowIndex, student]))
        const oldCanvasByRow = new Map(
          oldCanvas.students.map((student) => [student.rowIndex, student])
        )

        for (const match of matchStudents(oldCanvas.students, mylab.students)) {
          if (match.status !== "exact" || match.canvasRowIndex === null) continue
          const student = myLabByRow.get(match.mylabRowIndex)
          const oldCanvasStudent = oldCanvasByRow.get(match.canvasRowIndex)
          if (!student || !oldCanvasStudent) throw new Error("Private exact match missing.")
          if (!reproducibleCaseNumbers.has(caseIndex + 1)) continue
          if (
            student.email.trim().toLocaleLowerCase("en-US") !==
            oldCanvasStudent.sisLoginId.trim().toLocaleLowerCase("en-US")
          ) {
            continue
          }

          const sectionScores = mylab.sections.map((section) => {
            const raw = student.scores[section.key]
            if (!raw || raw.kind === "invalid") throw new Error("Private MyLab score invalid.")
            return {
              sectionKey: section.key,
              rawScore: raw.kind === "blank" ? 0 : raw.value,
              weight: section.detectedWeight
            }
          })
          const existing = readCanvasScore(oldCanvas, oldAssignment, match.canvasRowIndex)
          if (existing.kind === "invalid") throw new Error("Private Canvas score invalid.")
          const addOn = calculateMyLabAddOn(sectionScores, 0.8)
          const actualScore = calculateCanvasScore(
            existing.kind === "blank" ? null : existing.value,
            addOn
          ).finalScore

          const historicalStudent = historicalByLogin.get(
            normalizePsuLogin(oldCanvasStudent.sisLoginId)
          )
          if (!historicalStudent) throw new Error("Private historical match missing.")
          const expected = readCanvasScore(
            historical,
            historicalAssignment,
            historicalStudent.rowIndex
          )
          if (expected.kind !== "value") throw new Error("Private historical score invalid.")

          comparisonCount += 1
          try {
            expect(actualScore, `numeric mismatch in private case ${caseIndex + 1}`).toBeCloseTo(
              expected.value,
              10
            )
          } catch {
            caseFailed = true
          }
        }
      } catch {
        caseFailed = true
      }
      if (caseFailed) failingCaseNumbers.push(caseIndex + 1)
    }

    expect(comparisonCount, "private parity produced no exact-identifier comparisons").toBeGreaterThan(0)
    expect(
      failingCaseNumbers,
      `private parity failed case numbers: ${failingCaseNumbers.join(",")}`
    ).toEqual([])
  })
})
