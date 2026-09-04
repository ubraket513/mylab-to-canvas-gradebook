import { describe, expect, it } from "vitest"

import { buildReviewModel } from "../../src/domain/review-policy"
import type {
  CanvasAssignment,
  CanvasGradebook,
  CanvasStudent,
  MyLabGradebook,
  MyLabStudent,
  ParsedNumber,
  ReviewDecisions,
  ReviewInput,
  StudentMatch
} from "../../src/domain/types"

const assignment: CanvasAssignment = {
  assignmentId: "15461093",
  columnIndex: 3,
  name: "H2",
  pointsPossible: 10
}

function parsed(raw: string): ParsedNumber {
  if (raw.trim() === "") return { kind: "blank" }
  const value = Number(raw)
  return Number.isFinite(value) ? { kind: "value", value } : { kind: "invalid", raw }
}

function canvasStudent(rowIndex: number, name: string, login: string): CanvasStudent {
  return { rowIndex, name, sisLoginId: login, sisUserId: `user-${rowIndex}` }
}

function canvasGradebook(
  entries: readonly { rowIndex: number; name: string; login: string; score: string }[]
): CanvasGradebook {
  const rows: string[][] = [
    ["Student", "SIS User ID", "SIS Login ID", "H2 (15461093)"],
    ["Points Possible", "", "", "10"]
  ]
  const students: CanvasStudent[] = []
  for (const entry of entries) {
    while (rows.length < entry.rowIndex) rows.push([])
    rows[entry.rowIndex] = [entry.name, `user-${entry.rowIndex}`, entry.login, entry.score]
    students.push(canvasStudent(entry.rowIndex, entry.name, entry.login))
  }
  return {
    matrix: { rows, linebreak: "\n", hadBom: false },
    headerRowIndex: 0,
    pointsRowIndex: 1,
    studentColumn: 0,
    sisUserIdColumn: 1,
    sisLoginIdColumn: 2,
    assignments: [assignment],
    students
  }
}

function myLabStudent(
  rowIndex: number,
  firstName: string,
  lastName: string,
  scores: Record<string, ParsedNumber>
): MyLabStudent {
  return {
    rowIndex,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}@psu.edu`,
    login: "display-only",
    scores
  }
}

function myLabGradebook(students: MyLabStudent[], sectionKeys = ["1.1"]): MyLabGradebook {
  return {
    sections: sectionKeys.map((key, index) => ({
      key,
      columnIndex: 5 + index,
      detectedWeight: key === "1.2" ? 2.5 : 10
    })),
    students,
    issues: []
  }
}

function decisions(overrides: Partial<ReviewDecisions> = {}): ReviewDecisions {
  return {
    matchResolutions: overrides.matchResolutions ?? new Map(),
    acknowledgedUnmatched: overrides.acknowledgedUnmatched ?? false,
    acknowledgedBlankScores: overrides.acknowledgedBlankScores ?? false,
    overMaximumOverrides: overrides.overMaximumOverrides ?? new Set()
  }
}

function oneRowInput(options: {
  canvasScore?: string
  myLabScores?: Record<string, ParsedNumber>
  match?: StudentMatch
  weights?: ReadonlyMap<string, number>
  decisions?: ReviewDecisions
  pointsPossible?: number
} = {}): ReviewInput {
  const student = myLabStudent(7, "Ada", "Lovelace", options.myLabScores ?? { "1.1": parsed("0.8") })
  const selectedAssignment = { ...assignment, pointsPossible: options.pointsPossible ?? 10 }
  return {
    canvas: canvasGradebook([
      { rowIndex: 2, name: "Lovelace, Ada", login: "ada", score: options.canvasScore ?? "1" }
    ]),
    assignment: selectedAssignment,
    mylab: myLabGradebook([student], Object.keys(student.scores)),
    weights: options.weights ?? new Map(Object.keys(student.scores).map((key) => [key, key === "1.2" ? 2.5 : 10])),
    threshold: 0.8,
    matches:
      options.match === undefined
        ? [
            {
              mylabRowIndex: 7,
              status: "exact",
              canvasRowIndex: 2,
              candidateCanvasRowIndices: [2],
              reason: "identifier"
            }
          ]
        : [options.match],
    decisions: options.decisions ?? decisions()
  }
}

describe("buildReviewModel", () => {
  it("includes a valid exact match automatically", () => {
    const model = buildReviewModel(oneRowInput({ weights: new Map([["1.1", 2.5]]) }))
    expect(model.rows[0]).toMatchObject({
      canvasRowIndex: 2,
      myLabAddOn: 2.5,
      newCanvasScore: 3.5,
      includeInExport: true,
      warnings: []
    })
    expect(model.exportAllowed).toBe(true)
  })

  it.each(["suggested", "duplicate"] as const)(
    "requires an explicit candidate for a %s match",
    (status) => {
      const match: StudentMatch = {
        mylabRowIndex: 7,
        status,
        canvasRowIndex: null,
        candidateCanvasRowIndices: [2],
        reason: status === "suggested" ? "name" : "duplicate-identifier"
      }
      const unresolved = buildReviewModel(oneRowInput({ match }))
      expect(unresolved.rows[0]).toMatchObject({
        canvasRowIndex: null,
        includeInExport: false,
        warnings: ["ambiguous-match"]
      })
      expect(unresolved.summary.needsConfirmation).toBe(1)
      expect(unresolved.exportAllowed).toBe(false)

      const resolved = buildReviewModel(
        oneRowInput({
          match,
          canvasScore: "0",
          decisions: decisions({ matchResolutions: new Map([[7, 2]]) })
        })
      )
      expect(resolved.rows[0]).toMatchObject({ canvasRowIndex: 2, includeInExport: true })
      expect(resolved.exportAllowed).toBe(true)
    }
  )

  it("treats an explicitly rejected candidate as an acknowledged unmatched row", () => {
    const match: StudentMatch = {
      mylabRowIndex: 7,
      status: "suggested",
      canvasRowIndex: null,
      candidateCanvasRowIndices: [2],
      reason: "name"
    }
    const model = buildReviewModel(
      oneRowInput({
        match,
        decisions: decisions({
          matchResolutions: new Map([[7, null]]),
          acknowledgedUnmatched: true
        })
      })
    )
    expect(model.rows[0]).toMatchObject({
      canvasRowIndex: null,
      includeInExport: false,
      warnings: ["unmatched"]
    })
    expect(model.exportAllowed).toBe(true)
  })

  it("keeps a resolution outside the offered candidates unresolved", () => {
    const match: StudentMatch = {
      mylabRowIndex: 7,
      status: "suggested",
      canvasRowIndex: null,
      candidateCanvasRowIndices: [2],
      reason: "name"
    }
    const model = buildReviewModel(
      oneRowInput({
        match,
        decisions: decisions({ matchResolutions: new Map([[7, 99]]) })
      })
    )
    expect(model.rows[0]).toMatchObject({
      canvasRowIndex: null,
      includeInExport: false,
      warnings: ["ambiguous-match"]
    })
    expect(model.exportAllowed).toBe(false)
  })

  it("uses zero for a blank Canvas score and requires acknowledgement", () => {
    const blocked = buildReviewModel(oneRowInput({ canvasScore: "", weights: new Map([["1.1", 2.5]]) }))
    expect(blocked.rows[0]).toMatchObject({
      existingCanvasScore: { kind: "blank" },
      newCanvasScore: 2.5,
      warnings: ["blank-canvas-score"]
    })
    expect(blocked.exportAllowed).toBe(false)

    const allowed = buildReviewModel(
      oneRowInput({
        canvasScore: "",
        weights: new Map([["1.1", 2.5]]),
        decisions: decisions({ acknowledgedBlankScores: true })
      })
    )
    expect(allowed.exportAllowed).toBe(true)
  })

  it("awards the normal bonus to every blank MyLab section and warns once", () => {
    const model = buildReviewModel(
      oneRowInput({
        canvasScore: "0",
        myLabScores: { "1.1": parsed(""), "1.2": parsed("") },
        decisions: decisions({ acknowledgedBlankScores: true })
      })
    )
    expect(model.rows[0]?.sectionResults).toEqual([
      { sectionKey: "1.1", raw: { kind: "blank" }, rawUsed: 0, weight: 10, adjusted: 2 },
      { sectionKey: "1.2", raw: { kind: "blank" }, rawUsed: 0, weight: 2.5, adjusted: 0.5 }
    ])
    expect(model.rows[0]).toMatchObject({
      myLabAddOn: 2.5,
      newCanvasScore: 2.5,
      warnings: ["blank-mylab-score"]
    })
    expect(model.summary.blankMyLabScores).toBe(1)
    expect(model.exportAllowed).toBe(true)
  })

  it.each([
    { canvasScore: "invalid", myLabScores: { "1.1": parsed("0.8") }, warning: "invalid-canvas-score" },
    { canvasScore: "1", myLabScores: { "1.1": parsed("absent") }, warning: "invalid-mylab-score" }
  ] as const)("blocks $warning with no calculated final score", ({ canvasScore, myLabScores, warning }) => {
    const model = buildReviewModel(oneRowInput({ canvasScore, myLabScores }))
    expect(model.rows[0]?.newCanvasScore).toBeNull()
    expect(model.rows[0]?.warnings).toContain(warning)
    expect(model.exportAllowed).toBe(false)
  })

  it("reports a blank Canvas score even when invalid MyLab text also blocks calculation", () => {
    const model = buildReviewModel(
      oneRowInput({ canvasScore: "", myLabScores: { "1.1": parsed("absent") } })
    )
    expect(model.rows[0]?.warnings).toEqual([
      "invalid-mylab-score",
      "blank-canvas-score"
    ])
    expect(model.summary.blankCanvasScores).toBe(1)
    expect(model.rows[0]?.newCanvasScore).toBeNull()
  })

  it("blocks an over-maximum result until its Canvas row is explicitly overridden", () => {
    const blocked = buildReviewModel(oneRowInput({ canvasScore: "9", weights: new Map([["1.1", 2]]) }))
    expect(blocked.rows[0]).toMatchObject({
      newCanvasScore: 11,
      includeInExport: false,
      warnings: ["over-assignment-maximum"]
    })
    expect(blocked.exportAllowed).toBe(false)

    const allowed = buildReviewModel(
      oneRowInput({
        canvasScore: "9",
        weights: new Map([["1.1", 2]]),
        decisions: decisions({ overMaximumOverrides: new Set([2]) })
      })
    )
    expect(allowed.rows[0]?.includeInExport).toBe(true)
    expect(allowed.exportAllowed).toBe(true)
  })

  it("requires acknowledgement for an unmatched student", () => {
    const match: StudentMatch = {
      mylabRowIndex: 7,
      status: "unmatched",
      canvasRowIndex: null,
      candidateCanvasRowIndices: [],
      reason: "none"
    }
    expect(buildReviewModel(oneRowInput({ match })).exportAllowed).toBe(false)
    expect(
      buildReviewModel(
        oneRowInput({ match, decisions: decisions({ acknowledgedUnmatched: true }) })
      ).exportAllowed
    ).toBe(true)
  })

  it("summarizes independent risks by affected student and clears only every blocker", () => {
    const canvas = canvasGradebook([
      { rowIndex: 2, name: "Lovelace, Ada", login: "ada", score: "" },
      { rowIndex: 3, name: "Hopper, Grace", login: "grace", score: "0" }
    ])
    const mylab = myLabGradebook([
      myLabStudent(7, "Ada", "Lovelace", { "1.1": parsed("") }),
      myLabStudent(8, "Grace", "Hopper", { "1.1": parsed("0.8") }),
      myLabStudent(9, "No", "Match", { "1.1": parsed("0.8") })
    ])
    const matches: StudentMatch[] = [
      {
        mylabRowIndex: 7,
        status: "exact",
        canvasRowIndex: 2,
        candidateCanvasRowIndices: [2],
        reason: "identifier"
      },
      {
        mylabRowIndex: 8,
        status: "suggested",
        canvasRowIndex: null,
        candidateCanvasRowIndices: [3],
        reason: "name"
      },
      {
        mylabRowIndex: 9,
        status: "unmatched",
        canvasRowIndex: null,
        candidateCanvasRowIndices: [],
        reason: "none"
      }
    ]
    const input: ReviewInput = {
      canvas,
      assignment: { ...assignment, pointsPossible: 1 },
      mylab,
      weights: new Map([["1.1", 10]]),
      threshold: 0.8,
      matches,
      decisions: decisions()
    }

    const blocked = buildReviewModel(input)
    expect(blocked.summary).toMatchObject({
      confirmed: 1,
      needsConfirmation: 1,
      unmatched: 1,
      blankCanvasScores: 1,
      blankMyLabScores: 1,
      overMaximum: 1
    })
    expect(blocked.exportAllowed).toBe(false)

    const allowed = buildReviewModel({
      ...input,
      decisions: decisions({
        matchResolutions: new Map([[8, 3]]),
        acknowledgedUnmatched: true,
        acknowledgedBlankScores: true,
        overMaximumOverrides: new Set([2, 3])
      })
    })
    expect(allowed.blockers).toEqual([])
    expect(allowed.exportAllowed).toBe(true)
  })
})
