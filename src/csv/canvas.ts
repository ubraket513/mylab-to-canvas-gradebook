import type {
  CanvasAssignment,
  CanvasGradebook,
  CanvasStudent,
  CsvMatrix,
  ParsedNumber,
  ValidationIssue,
  ValidationResult
} from "../domain/types"

const STUDENT_HEADER = "Student"
const SIS_USER_ID_HEADER = "SIS User ID"
const SIS_LOGIN_ID_HEADER = "SIS Login ID"
const assignmentPattern = /^(.*?)\s+\((\d+)\)\s*$/

interface HeaderLocation {
  headerRowIndex: number
  studentColumn: number
  sisUserIdColumn: number
  sisLoginIdColumn: number
}

function findHeader(matrix: CsvMatrix): HeaderLocation | null {
  for (let rowIndex = 0; rowIndex < matrix.rows.length; rowIndex += 1) {
    const cells = matrix.rows[rowIndex]?.map((cell) => cell.trim()) ?? []
    const studentColumn = cells.indexOf(STUDENT_HEADER)
    const sisUserIdColumn = cells.indexOf(SIS_USER_ID_HEADER)
    const sisLoginIdColumn = cells.indexOf(SIS_LOGIN_ID_HEADER)
    if (studentColumn >= 0 && sisUserIdColumn >= 0 && sisLoginIdColumn >= 0) {
      return { headerRowIndex: rowIndex, studentColumn, sisUserIdColumn, sisLoginIdColumn }
    }
  }
  return null
}

function isTestStudent(name: string): boolean {
  const normalized = name.trim().toLocaleLowerCase("en-US")
  return normalized === "student, test" || normalized === "test student"
}

function normalizedLogin(value: string): string {
  return value.trim().toLocaleLowerCase("en-US")
}

function collectStudents(
  matrix: CsvMatrix,
  pointsRowIndex: number,
  header: HeaderLocation
): { students: CanvasStudent[]; warnings: ValidationIssue[] } {
  const students: CanvasStudent[] = []
  const warnings: ValidationIssue[] = []

  for (let rowIndex = pointsRowIndex + 1; rowIndex < matrix.rows.length; rowIndex += 1) {
    const row = matrix.rows[rowIndex] ?? []
    if (row.every((cell) => cell.trim() === "")) continue

    const name = row[header.studentColumn]?.trim() ?? ""
    if (isTestStudent(name)) continue

    const sisLoginId = row[header.sisLoginIdColumn]?.trim() ?? ""
    if (sisLoginId === "") {
      warnings.push({
        code: "canvas-missing-login",
        severity: "warning",
        message: "A Canvas row has no SIS Login ID and will remain unchanged.",
        row: rowIndex + 1,
        column: header.sisLoginIdColumn + 1
      })
      continue
    }

    students.push({
      rowIndex,
      name,
      sisUserId: row[header.sisUserIdColumn]?.trim() ?? "",
      sisLoginId
    })
  }

  const rowsByLogin = new Map<string, number[]>()
  for (const student of students) {
    const key = normalizedLogin(student.sisLoginId)
    const rowIndices = rowsByLogin.get(key) ?? []
    rowIndices.push(student.rowIndex)
    rowsByLogin.set(key, rowIndices)
  }

  for (const rowIndices of rowsByLogin.values()) {
    if (rowIndices.length < 2) continue
    warnings.push({
      code: "canvas-duplicate-login",
      severity: "warning",
      message: "More than one Canvas row has the same SIS Login ID and requires review.",
      row: rowIndices[0]! + 1,
      column: header.sisLoginIdColumn + 1
    })
  }

  return { students, warnings }
}

export function parseCanvasGradebook(matrix: CsvMatrix): ValidationResult<CanvasGradebook> {
  const header = findHeader(matrix)
  if (!header) {
    return {
      ok: false,
      errors: [
        {
          code: "canvas-header-missing",
          severity: "error",
          message: "This does not look like a Canvas gradebook. Required identity columns are missing."
        }
      ]
    }
  }

  const pointsRowIndex = matrix.rows.findIndex(
    (row, rowIndex) =>
      rowIndex > header.headerRowIndex &&
      row[header.studentColumn]?.trim().toLocaleLowerCase("en-US") === "points possible"
  )
  if (pointsRowIndex < 0) {
    return {
      ok: false,
      errors: [
        {
          code: "canvas-points-row-missing",
          severity: "error",
          message: "This Canvas gradebook is missing its Points Possible row."
        }
      ]
    }
  }

  const headerRow = matrix.rows[header.headerRowIndex] ?? []
  const pointsRow = matrix.rows[pointsRowIndex] ?? []
  const assignments: CanvasAssignment[] = []
  for (let columnIndex = 0; columnIndex < headerRow.length; columnIndex += 1) {
    const match = assignmentPattern.exec((headerRow[columnIndex] ?? "").trim())
    const rawPoints = (pointsRow[columnIndex] ?? "").trim()
    const points = Number(rawPoints)
    if (!match || rawPoints === "" || !Number.isFinite(points) || points < 0) continue
    assignments.push({
      name: match[1]!.trim(),
      assignmentId: match[2]!,
      columnIndex,
      pointsPossible: points
    })
  }

  if (assignments.length === 0) {
    return {
      ok: false,
      errors: [
        {
          code: "canvas-assignment-missing",
          severity: "error",
          message: "No editable Canvas assignment columns were found."
        }
      ]
    }
  }

  const { students, warnings } = collectStudents(matrix, pointsRowIndex, header)
  return {
    ok: true,
    value: {
      matrix,
      headerRowIndex: header.headerRowIndex,
      pointsRowIndex,
      studentColumn: header.studentColumn,
      sisUserIdColumn: header.sisUserIdColumn,
      sisLoginIdColumn: header.sisLoginIdColumn,
      assignments,
      students
    },
    warnings
  }
}

export function readCanvasScore(
  gradebook: CanvasGradebook,
  assignment: CanvasAssignment,
  rowIndex: number
): ParsedNumber {
  const raw = gradebook.matrix.rows[rowIndex]?.[assignment.columnIndex] ?? ""
  if (raw.trim() === "") return { kind: "blank" }

  const value = Number(raw.trim())
  return Number.isFinite(value) ? { kind: "value", value } : { kind: "invalid", raw }
}
