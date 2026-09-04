import Papa from "papaparse"

import { MAX_CSV_BYTES } from "../config"
import type { CsvMatrix, ValidationIssue, ValidationResult } from "../domain/types"

type ParsedRows = Papa.ParseResult<string[]>

const parserOptions = {
  header: false,
  dynamicTyping: false,
  delimiter: ",",
  skipEmptyLines: false
} as const

function normalizeLinebreak(value: string): CsvMatrix["linebreak"] {
  if (value === "\n" || value === "\r") return value
  return "\r\n"
}

function parserIssues(errors: readonly Papa.ParseError[]): ValidationIssue[] {
  return errors.map((error) => ({
    code: "csv-parse-error",
    severity: "error",
    message: "This CSV file could not be parsed.",
    ...(typeof error.row === "number" ? { row: error.row + 1 } : {})
  }))
}

function toValidationResult(
  results: ParsedRows,
  hadBom: boolean
): ValidationResult<CsvMatrix> {
  if (results.errors.length > 0) {
    return { ok: false, errors: parserIssues(results.errors) }
  }

  return {
    ok: true,
    value: {
      rows: results.data.map((row) => row.map((cell) => String(cell))),
      linebreak: normalizeLinebreak(results.meta.linebreak),
      hadBom
    },
    warnings: []
  }
}

export function parseCsvText(text: string): ValidationResult<CsvMatrix> {
  const hadBom = text.startsWith("\uFEFF")
  const contents = hadBom ? text.slice(1) : text
  const results = Papa.parse<string[]>(contents, parserOptions)
  return toValidationResult(results, hadBom)
}

function fileReadError(): ValidationResult<CsvMatrix> {
  return {
    ok: false,
    errors: [{ code: "file-read-error", severity: "error", message: "We could not read this CSV file." }]
  }
}

function parseTextInWorker(text: string): Promise<ValidationResult<CsvMatrix>> {
  if (typeof Worker === "undefined") return Promise.resolve(parseCsvText(text))

  return new Promise((resolve) => {
    const worker = new Worker(new URL("./parse-worker.ts", import.meta.url), { type: "module" })
    worker.addEventListener("message", (event: MessageEvent<ValidationResult<CsvMatrix>>) => {
      worker.terminate()
      resolve(event.data)
    }, { once: true })
    worker.addEventListener("error", () => {
      worker.terminate()
      resolve(fileReadError())
    }, { once: true })
    worker.postMessage(text)
  })
}

export async function parseCsvFile(file: File): Promise<ValidationResult<CsvMatrix>> {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return {
      ok: false,
      errors: [
        {
          code: "invalid-file-type",
          severity: "error",
          message: "Choose a CSV file."
        }
      ]
    }
  }

  if (file.size > MAX_CSV_BYTES) {
    return {
      ok: false,
      errors: [
        {
          code: "file-too-large",
          severity: "error",
          message: "Choose a CSV file that is 25 MB or smaller."
        }
      ]
    }
  }

  try {
    return await parseTextInWorker(await file.text())
  } catch {
    return fileReadError()
  }
}
