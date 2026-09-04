export type IssueSeverity = "warning" | "error"

export interface ValidationIssue {
  code: string
  severity: IssueSeverity
  message: string
  row?: number
  column?: number
}

export type ValidationResult<T> =
  | { ok: true; value: T; warnings: ValidationIssue[] }
  | { ok: false; errors: ValidationIssue[] }

export interface CsvMatrix {
  rows: string[][]
  linebreak: "\r\n" | "\n" | "\r"
  hadBom: boolean
}

export type ParsedNumber =
  | { kind: "value"; value: number }
  | { kind: "blank" }
  | { kind: "invalid"; raw: string }

export interface CanvasAssignment {
  assignmentId: string
  columnIndex: number
  name: string
  pointsPossible: number
}

export interface CanvasStudent {
  rowIndex: number
  name: string
  sisUserId: string
  sisLoginId: string
}

export interface CanvasGradebook {
  matrix: CsvMatrix
  headerRowIndex: number
  pointsRowIndex: number
  studentColumn: number
  sisUserIdColumn: number
  sisLoginIdColumn: number
  assignments: CanvasAssignment[]
  students: CanvasStudent[]
}
