import { describe, expect, it } from "vitest"

import { createInitialState, reduceAppState, type ReviewStepState } from "../../src/app/state"
import type {
  CanvasGradebook,
  MyLabGradebook,
  ReviewDecisions,
  ReviewModel,
  StudentMatch
} from "../../src/domain/types"

const canvas: CanvasGradebook = {
  matrix: { rows: [], linebreak: "\n", hadBom: false },
  headerRowIndex: 0,
  pointsRowIndex: 1,
  studentColumn: 0,
  sisUserIdColumn: 1,
  sisLoginIdColumn: 2,
  assignments: [
    { assignmentId: "42", columnIndex: 3, name: "Quiz", pointsPossible: 20 },
    { assignmentId: "43", columnIndex: 4, name: "Exam", pointsPossible: 100 }
  ],
  students: []
}

const mylab: MyLabGradebook = {
  sections: [{ key: "1.1", columnIndex: 5, detectedWeight: 10 }],
  students: [],
  issues: []
}

const matches: StudentMatch[] = []
const decisions: ReviewDecisions = {
  matchResolutions: new Map([[7, 3]]),
  acknowledgedUnmatched: true,
  acknowledgedBlankScores: true,
  overMaximumOverrides: new Set([3])
}
const review: ReviewModel = {
  rows: [],
  summary: {
    confirmed: 1,
    needsConfirmation: 0,
    unmatched: 0,
    blankCanvasScores: 0,
    blankMyLabScores: 0,
    overMaximum: 0
  },
  blockers: [],
  exportAllowed: true
}

function reviewState(): ReviewStepState {
  return {
    step: "review",
    threshold: 0.8,
    canvasFileName: "canvas.csv",
    canvas,
    selectedAssignmentColumn: 3,
    mylabFileName: "mylab.csv",
    mylab,
    weights: new Map([["1.1", 10]]),
    matches,
    decisions,
    review
  }
}

describe("wizard state", () => {
  it("starts with only the threshold", () => {
    expect(createInitialState(0.85)).toEqual({ step: "canvas", threshold: 0.85 })
  })

  it("loads Canvas, selects an assignment, and loads MyLab", () => {
    const loaded = reduceAppState(createInitialState(0.8), {
      type: "canvas-loaded",
      fileName: "canvas.csv",
      canvas
    })
    const selected = reduceAppState(loaded, { type: "assignment-selected", columnIndex: 3 })
    const configured = reduceAppState(selected, {
      type: "mylab-loaded",
      fileName: "mylab.csv",
      mylab
    })

    expect(configured).toMatchObject({
      step: "configure",
      selectedAssignmentColumn: 3,
      mylabFileName: "mylab.csv"
    })
    expect(configured.step === "configure" && [...configured.weights]).toEqual([["1.1", 10]])
  })

  it("clears downstream review decisions when the threshold changes", () => {
    expect(reduceAppState(reviewState(), { type: "threshold-changed", threshold: 0.9 })).toEqual({
      step: "configure",
      threshold: 0.9,
      canvasFileName: "canvas.csv",
      canvas,
      selectedAssignmentColumn: 3,
      mylabFileName: "mylab.csv",
      mylab,
      weights: new Map([["1.1", 10]])
    })
  })

  it("clears downstream review decisions when a weight changes", () => {
    const result = reduceAppState(reviewState(), {
      type: "weight-changed",
      sectionKey: "1.1",
      weight: 7.5
    })
    expect(result.step).toBe("configure")
    expect(result.step === "configure" && result.weights.get("1.1")).toBe(7.5)
  })

  it("returns to assignment and MyLab selection when the assignment changes", () => {
    const result = reduceAppState(reviewState(), {
      type: "assignment-selected",
      columnIndex: 4
    })
    expect(result).toMatchObject({ step: "assignment-mylab", selectedAssignmentColumn: 4 })
    expect("review" in result).toBe(false)
  })

  it("Canvas and MyLab replacements discard dependent state", () => {
    const canvasResult = reduceAppState(reviewState(), {
      type: "canvas-loaded",
      fileName: "replacement.csv",
      canvas
    })
    const mylabResult = reduceAppState(reviewState(), {
      type: "mylab-loaded",
      fileName: "replacement-mylab.csv",
      mylab
    })
    expect(canvasResult).toMatchObject({ step: "assignment-mylab", selectedAssignmentColumn: null })
    expect(mylabResult).toMatchObject({ step: "configure", mylabFileName: "replacement-mylab.csv" })
    expect("review" in canvasResult).toBe(false)
    expect("review" in mylabResult).toBe(false)
  })

  it("Back moves one step without retaining review-only fields", () => {
    const result = reduceAppState(reviewState(), { type: "back" })
    expect(result.step).toBe("configure")
    expect("decisions" in result).toBe(false)
  })

  it("updates review decisions immutably and recomputes review state", () => {
    const resolved = reduceAppState(reviewState(), {
      type: "match-resolved",
      mylabRowIndex: 8,
      canvasRowIndex: null
    })
    expect(resolved.step).toBe("review")
    expect(resolved.step === "review" && resolved.decisions.matchResolutions.get(8)).toBeNull()
    expect(decisions.matchResolutions.has(8)).toBe(false)

    const acknowledged = reduceAppState(reviewState(), {
      type: "acknowledgement-changed",
      kind: "blank",
      checked: false
    })
    expect(
      acknowledged.step === "review" && acknowledged.decisions.acknowledgedBlankScores
    ).toBe(false)

    const overridden = reduceAppState(reviewState(), {
      type: "maximum-override-changed",
      canvasRowIndex: 4,
      checked: true
    })
    expect(
      overridden.step === "review" && overridden.decisions.overMaximumOverrides.has(4)
    ).toBe(true)
    expect(decisions.overMaximumOverrides.has(4)).toBe(false)
  })

  it("Start over retains only the threshold", () => {
    expect(reduceAppState(reviewState(), { type: "reset" })).toEqual({
      step: "canvas",
      threshold: 0.8
    })
  })

  it("records only a non-sensitive completion summary after download", () => {
    expect(
      reduceAppState(reviewState(), {
        type: "download-completed",
        summary: { updated: 4, unchanged: 2, overrides: 1 }
      })
    ).toEqual({
      step: "download",
      threshold: 0.8,
      summary: { updated: 4, unchanged: 2, overrides: 1 }
    })
  })
})
