import type {
  CsvMatrix,
  MyLabGradebook,
  MyLabSection,
  MyLabStudent,
  ParsedNumber,
  ValidationIssue,
  ValidationResult
} from "../domain/types"

interface LogicalRow {
  row: string[]
  physicalRowIndex: number
}

function normalizedCells(row: readonly string[]): string[] {
  return row.map((cell) => cell.trim())
}

function metadataError(code: string, message: string): ValidationResult<MyLabGradebook> {
  return { ok: false, errors: [{ code, severity: "error", message }] }
}

function parseScore(
  raw: string,
  logicalRowIndex: number,
  columnIndex: number,
  issues: ValidationIssue[]
): ParsedNumber {
  const trimmed = raw.trim()
  if (trimmed === "") return { kind: "blank" }

  const value = Number(trimmed)
  if (Number.isFinite(value) && value >= 0 && value <= 1) {
    return { kind: "value", value }
  }

  issues.push({
    code: "mylab-invalid-score",
    severity: "warning",
    message: "A MyLab score is invalid and requires review.",
    row: logicalRowIndex + 1,
    column: columnIndex + 1
  })
  return { kind: "invalid", raw }
}

function looksLikeEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+$/.test(value)
}

export function parseMyLabGradebook(matrix: CsvMatrix): ValidationResult<MyLabGradebook> {
  const logicalRows: LogicalRow[] = matrix.rows.flatMap((row, physicalRowIndex) =>
    row.some((cell) => cell.trim() !== "") ? [{ row, physicalRowIndex }] : []
  )
  const normalized = logicalRows.map(({ row }) => normalizedCells(row))

  const labelsRowIndex = normalized.findIndex(
    (row) => row.includes("Last name") && row.includes("First name") && row.includes("Email")
  )
  if (labelsRowIndex < 0) {
    return metadataError(
      "mylab-labels-row-missing",
      "This does not look like a MyLab gradebook. Student labels are missing."
    )
  }

  const weightRowIndex = normalized.findIndex((row) => row.includes("Weight"))
  if (weightRowIndex < 0) {
    return metadataError(
      "mylab-weight-row-missing",
      "This MyLab gradebook is missing its Weight metadata row."
    )
  }

  const attemptRowIndex = normalized.findIndex((row) => row.includes("Attempt"))
  if (attemptRowIndex < 0) {
    return metadataError(
      "mylab-attempt-row-missing",
      "This MyLab gradebook is missing its Attempt metadata row."
    )
  }

  const labelsRow = normalized[labelsRowIndex]!
  const lastNameColumn = labelsRow.indexOf("Last name")
  const firstNameColumn = labelsRow.indexOf("First name")
  const emailColumn = labelsRow.indexOf("Email")
  const loginColumn = labelsRow.indexOf("Log-in")
  const firstScoreColumn = labelsRow.indexOf("Score")
  if (firstScoreColumn < 0) {
    return metadataError(
      "mylab-score-column-missing",
      "This MyLab gradebook has no section score columns."
    )
  }

  const sectionKeyRow = normalized[0]
  if (!sectionKeyRow) {
    return metadataError(
      "mylab-section-row-missing",
      "This MyLab gradebook is missing its section metadata."
    )
  }

  const weightRow = normalized[weightRowIndex]!
  const sections: MyLabSection[] = []
  for (let columnIndex = firstScoreColumn; columnIndex < sectionKeyRow.length; columnIndex += 1) {
    const key = sectionKeyRow[columnIndex] ?? ""
    if (key === "") continue

    const rawWeight = weightRow[columnIndex] ?? ""
    const detectedWeight = Number(rawWeight)
    if (rawWeight === "" || !Number.isFinite(detectedWeight) || detectedWeight < 0) {
      return metadataError(
        "mylab-invalid-weight",
        "A MyLab section has an invalid detected weight."
      )
    }
    sections.push({ key, columnIndex, detectedWeight })
  }

  if (sections.length === 0) {
    return metadataError(
      "mylab-sections-missing",
      "This MyLab gradebook has no usable section metadata."
    )
  }

  const issues: ValidationIssue[] = []
  const students: MyLabStudent[] = []
  for (let logicalRowIndex = labelsRowIndex + 1; logicalRowIndex < logicalRows.length; logicalRowIndex += 1) {
    const entry = logicalRows[logicalRowIndex]!
    const email = entry.row[emailColumn]?.trim() ?? ""
    if (!looksLikeEmail(email)) continue

    const scores: Record<string, ParsedNumber> = {}
    for (const section of sections) {
      scores[section.key] = parseScore(
        entry.row[section.columnIndex] ?? "",
        logicalRowIndex,
        section.columnIndex,
        issues
      )
    }

    students.push({
      rowIndex: entry.physicalRowIndex,
      firstName: entry.row[firstNameColumn]?.trim() ?? "",
      lastName: entry.row[lastNameColumn]?.trim() ?? "",
      email,
      login: loginColumn >= 0 ? (entry.row[loginColumn]?.trim() ?? "") : "",
      scores
    })
  }

  return {
    ok: true,
    value: { sections, students, issues },
    warnings: issues
  }
}
