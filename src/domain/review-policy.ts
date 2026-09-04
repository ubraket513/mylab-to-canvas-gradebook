import { readCanvasScore } from "../csv/canvas"
import { adjustSectionScore, calculateCanvasScore, calculateMyLabAddOn } from "./score"
import type {
  MyLabStudent,
  ReviewInput,
  ReviewModel,
  ReviewRow,
  ReviewSummary,
  ReviewWarningCode,
  SectionResult,
  StudentMatch
} from "./types"

type MatchResolution =
  | { kind: "resolved"; canvasRowIndex: number }
  | { kind: "unresolved" }
  | { kind: "unmatched" }

function resolveMatch(match: StudentMatch | undefined, input: ReviewInput): MatchResolution {
  if (!match || match.status === "unmatched") return { kind: "unmatched" }
  if (match.status === "exact" && match.canvasRowIndex !== null) {
    return { kind: "resolved", canvasRowIndex: match.canvasRowIndex }
  }

  if (!input.decisions.matchResolutions.has(match.mylabRowIndex)) {
    return { kind: "unresolved" }
  }
  const selected = input.decisions.matchResolutions.get(match.mylabRowIndex)
  if (selected === null) return { kind: "unmatched" }
  if (selected === undefined || !match.candidateCanvasRowIndices.includes(selected)) {
    return { kind: "unresolved" }
  }
  return { kind: "resolved", canvasRowIndex: selected }
}

function calculateSections(
  student: MyLabStudent,
  input: ReviewInput,
  warnings: ReviewWarningCode[]
): { sectionResults: SectionResult[]; myLabAddOn: number | null } {
  let hasBlank = false
  let hasInvalid = false
  const weightedScores: { sectionKey: string; rawScore: number; weight: number }[] = []

  const sectionResults = input.mylab.sections.map((section): SectionResult => {
    const raw = student.scores[section.key] ?? { kind: "blank" as const }
    const weight = input.weights.get(section.key) ?? section.detectedWeight

    if (raw.kind === "invalid") {
      hasInvalid = true
      return { sectionKey: section.key, raw, rawUsed: null, weight, adjusted: null }
    }

    const rawUsed = raw.kind === "blank" ? 0 : raw.value
    if (raw.kind === "blank") hasBlank = true
    weightedScores.push({ sectionKey: section.key, rawScore: rawUsed, weight })
    return {
      sectionKey: section.key,
      raw,
      rawUsed,
      weight,
      adjusted: adjustSectionScore(rawUsed, input.threshold, weight)
    }
  })

  if (hasBlank) warnings.push("blank-mylab-score")
  if (hasInvalid) {
    warnings.push("invalid-mylab-score")
    return { sectionResults, myLabAddOn: null }
  }

  return {
    sectionResults,
    myLabAddOn: calculateMyLabAddOn(weightedScores, input.threshold)
  }
}

function buildRow(student: MyLabStudent, input: ReviewInput, match: StudentMatch | undefined): ReviewRow {
  const warnings: ReviewWarningCode[] = []
  const resolution = resolveMatch(match, input)
  const { sectionResults, myLabAddOn } = calculateSections(student, input, warnings)

  if (resolution.kind === "unresolved") warnings.unshift("ambiguous-match")
  if (resolution.kind === "unmatched") warnings.unshift("unmatched")

  const canvasRowIndex = resolution.kind === "resolved" ? resolution.canvasRowIndex : null
  const existingCanvasScore =
    canvasRowIndex === null ? null : readCanvasScore(input.canvas, input.assignment, canvasRowIndex)

  let newCanvasScore: number | null = null
  if (existingCanvasScore?.kind === "invalid") {
    warnings.push("invalid-canvas-score")
  } else if (existingCanvasScore?.kind === "blank") {
    warnings.push("blank-canvas-score")
  }

  if (
    canvasRowIndex !== null &&
    myLabAddOn !== null &&
    existingCanvasScore !== null &&
    existingCanvasScore.kind !== "invalid"
  ) {
    const existing = existingCanvasScore.kind === "blank" ? null : existingCanvasScore.value
    newCanvasScore = calculateCanvasScore(existing, myLabAddOn).finalScore
  }

  const overMaximum = newCanvasScore !== null && newCanvasScore > input.assignment.pointsPossible
  if (overMaximum) warnings.push("over-assignment-maximum")
  const maximumApproved =
    !overMaximum ||
    (canvasRowIndex !== null && input.decisions.overMaximumOverrides.has(canvasRowIndex))

  return {
    key: `mylab-${student.rowIndex}`,
    mylabRowIndex: student.rowIndex,
    canvasRowIndex,
    studentDisplayName: `${student.firstName} ${student.lastName}`.trim(),
    matchStatus: match?.status ?? "unmatched",
    existingCanvasScore,
    sectionResults,
    myLabAddOn,
    newCanvasScore,
    warnings,
    includeInExport: canvasRowIndex !== null && newCanvasScore !== null && maximumApproved
  }
}

function summarize(rows: readonly ReviewRow[]): ReviewSummary {
  return {
    confirmed: rows.filter(({ canvasRowIndex }) => canvasRowIndex !== null).length,
    needsConfirmation: rows.filter(({ warnings }) => warnings.includes("ambiguous-match")).length,
    unmatched: rows.filter(({ warnings }) => warnings.includes("unmatched")).length,
    blankCanvasScores: rows.filter(({ warnings }) => warnings.includes("blank-canvas-score")).length,
    blankMyLabScores: rows.filter(({ warnings }) => warnings.includes("blank-mylab-score")).length,
    overMaximum: rows.filter(({ warnings }) => warnings.includes("over-assignment-maximum")).length
  }
}

export function buildReviewModel(input: ReviewInput): ReviewModel {
  const matchesByMyLabRow = new Map(input.matches.map((match) => [match.mylabRowIndex, match]))
  const rows = input.mylab.students.map((student) =>
    buildRow(student, input, matchesByMyLabRow.get(student.rowIndex))
  )
  const summary = summarize(rows)

  const hasInvalidScores = rows.some(({ warnings }) =>
    warnings.some((warning) => warning === "invalid-canvas-score" || warning === "invalid-mylab-score")
  )
  const unresolvedCandidateMatches = summary.needsConfirmation
  const unmatched = summary.unmatched
  const blankScoreRows = rows.filter(({ warnings }) =>
    warnings.some((warning) => warning === "blank-canvas-score" || warning === "blank-mylab-score")
  ).length
  const unoverriddenMaximumRows = rows.filter(
    ({ canvasRowIndex, warnings }) =>
      warnings.includes("over-assignment-maximum") &&
      (canvasRowIndex === null || !input.decisions.overMaximumOverrides.has(canvasRowIndex))
  ).length

  const blockers: string[] = []
  if (hasInvalidScores) blockers.push("Fix invalid score values before downloading.")
  if (unresolvedCandidateMatches > 0) blockers.push("Confirm or reject every suggested match.")
  if (unmatched > 0 && !input.decisions.acknowledgedUnmatched) {
    blockers.push("Acknowledge that unmatched students will remain unchanged.")
  }
  if (blankScoreRows > 0 && !input.decisions.acknowledgedBlankScores) {
    blockers.push("Acknowledge how blank scores are handled.")
  }
  if (unoverriddenMaximumRows > 0) {
    blockers.push("Review every score above the assignment maximum.")
  }

  const exportAllowed =
    !hasInvalidScores &&
    unresolvedCandidateMatches === 0 &&
    (unmatched === 0 || input.decisions.acknowledgedUnmatched) &&
    (blankScoreRows === 0 || input.decisions.acknowledgedBlankScores) &&
    unoverriddenMaximumRows === 0

  return { rows, summary, blockers, exportAllowed }
}
