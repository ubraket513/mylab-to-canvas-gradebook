import type { CanvasStudent, MyLabStudent, StudentMatch } from "./types"

export function normalizePsuLogin(value: string): string {
  const normalized = value.normalize("NFKC").trim().toLocaleLowerCase("en-US")
  return normalized.endsWith("@psu.edu") ? normalized.slice(0, -"@psu.edu".length) : normalized
}

export function normalizeNameTokens(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\p{P}/gu, "")
    .toLocaleLowerCase("en-US")
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
}

function canvasNameTokens(name: string): string[] {
  const commaIndex = name.indexOf(",")
  if (commaIndex < 0) return normalizeNameTokens(name)
  const last = name.slice(0, commaIndex)
  const first = name.slice(commaIndex + 1)
  return normalizeNameTokens(`${first} ${last}`)
}

function sameTokenSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length === 0 || left.length !== right.length) return false
  const sortedLeft = [...left].sort()
  const sortedRight = [...right].sort()
  return sortedLeft.every((token, index) => token === sortedRight[index])
}

function findExactTokenSetCandidates(
  student: MyLabStudent,
  canvas: readonly CanvasStudent[]
): number[] {
  const myLabTokens = normalizeNameTokens(`${student.firstName} ${student.lastName}`)
  return canvas.flatMap((candidate) =>
    sameTokenSet(myLabTokens, canvasNameTokens(candidate.name)) ? [candidate.rowIndex] : []
  )
}

function exactMatch(student: MyLabStudent, canvasRowIndex: number): StudentMatch {
  return {
    mylabRowIndex: student.rowIndex,
    status: "exact",
    canvasRowIndex,
    candidateCanvasRowIndices: [canvasRowIndex],
    reason: "identifier"
  }
}

function duplicateMatch(student: MyLabStudent, candidates: readonly number[]): StudentMatch {
  return {
    mylabRowIndex: student.rowIndex,
    status: "duplicate",
    canvasRowIndex: null,
    candidateCanvasRowIndices: [...candidates],
    reason: "duplicate-identifier"
  }
}

function suggestedMatch(student: MyLabStudent, candidates: readonly number[]): StudentMatch {
  return {
    mylabRowIndex: student.rowIndex,
    status: "suggested",
    canvasRowIndex: null,
    candidateCanvasRowIndices: [...candidates],
    reason: "name"
  }
}

function unmatched(student: MyLabStudent): StudentMatch {
  return {
    mylabRowIndex: student.rowIndex,
    status: "unmatched",
    canvasRowIndex: null,
    candidateCanvasRowIndices: [],
    reason: "none"
  }
}

export function matchStudents(
  canvas: readonly CanvasStudent[],
  mylab: readonly MyLabStudent[]
): StudentMatch[] {
  const canvasByLogin = new Map<string, number[]>()
  for (const student of canvas) {
    const key = normalizePsuLogin(student.sisLoginId)
    if (key === "") continue
    const candidates = canvasByLogin.get(key) ?? []
    candidates.push(student.rowIndex)
    canvasByLogin.set(key, candidates)
  }

  const myLabLoginCounts = new Map<string, number>()
  for (const student of mylab) {
    const key = normalizePsuLogin(student.email)
    if (key !== "") myLabLoginCounts.set(key, (myLabLoginCounts.get(key) ?? 0) + 1)
  }

  return mylab.map((student) => {
    const key = normalizePsuLogin(student.email)
    const exactCandidates = key === "" ? [] : (canvasByLogin.get(key) ?? [])
    if ((myLabLoginCounts.get(key) ?? 0) > 1 && exactCandidates.length > 0) {
      return duplicateMatch(student, exactCandidates)
    }
    if (exactCandidates.length === 1) return exactMatch(student, exactCandidates[0]!)
    if (exactCandidates.length > 1) return duplicateMatch(student, exactCandidates)

    const nameCandidates = findExactTokenSetCandidates(student, canvas)
    if (nameCandidates.length > 0) return suggestedMatch(student, nameCandidates)
    return unmatched(student)
  })
}
