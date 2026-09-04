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
