import { describe, expect, it } from "vitest"

import {
  matchStudents,
  normalizeNameTokens,
  normalizePsuLogin
} from "../../src/domain/matching"
import type { CanvasStudent, MyLabStudent } from "../../src/domain/types"

function canvasStudent(
  rowIndex: number,
  name: string,
  sisLoginId: string,
  sisUserId = "canvas-user-id"
): CanvasStudent {
  return { rowIndex, name, sisLoginId, sisUserId }
}

function myLabStudent(
  rowIndex: number,
  firstName: string,
  lastName: string,
  email: string,
  login = "mylab-login"
): MyLabStudent {
  return { rowIndex, firstName, lastName, email, login, scores: {} }
}

describe("normalizePsuLogin", () => {
  it("canonicalizes Penn State email and local account forms", () => {
    expect(normalizePsuLogin(" ADL1@psu.edu ")).toBe("adl1")
    expect(normalizePsuLogin("adl1")).toBe("adl1")
  })

  it("keeps a non-PSU email complete", () => {
    expect(normalizePsuLogin("Ada@Example.com")).toBe("ada@example.com")
  })
})

describe("normalizeNameTokens", () => {
  it("removes accents and punctuation without using fuzzy substrings", () => {
    expect(normalizeNameTokens("O'Neil, José A.")).toEqual(["oneil", "jose", "a"])
  })
})

describe("matchStudents", () => {
  it.each(["adl1", "adl1@psu.edu"])("matches a PSU email to Canvas login %s", (login) => {
    const canvas = [canvasStudent(3, "Lovelace, Ada", login)]
    const result = matchStudents(canvas, [
      myLabStudent(7, "Ada", "Lovelace", " ADL1@psu.edu ", "unrelated-login")
    ])
    expect(result[0]).toMatchObject({
      status: "exact",
      canvasRowIndex: 3,
      reason: "identifier"
    })
  })

  it("requires the complete identifier for non-PSU email matching", () => {
    const exact = matchStudents(
      [canvasStudent(3, "Different, Person", "ada@example.com")],
      [myLabStudent(7, "Ada", "Lovelace", "ada@example.com")]
    )
    const localPartOnly = matchStudents(
      [canvasStudent(3, "Different, Person", "ada")],
      [myLabStudent(7, "Ada", "Lovelace", "ada@example.com")]
    )
    expect(exact[0]?.status).toBe("exact")
    expect(localPartOnly[0]?.status).toBe("unmatched")
  })

  it("creates a confirmation-only suggestion for an exact normalized name", () => {
    const result = matchStudents(
      [canvasStudent(3, "O'Neil, José A.", "different@psu.edu")],
      [myLabStudent(7, "Jose A", "ONeil", "unknown@psu.edu")]
    )
    expect(result[0]).toEqual({
      mylabRowIndex: 7,
      status: "suggested",
      canvasRowIndex: null,
      candidateCanvasRowIndices: [3],
      reason: "name"
    })
  })

  it("marks duplicate normalized Canvas logins without selecting a row", () => {
    const result = matchStudents(
      [
        canvasStudent(3, "Lovelace, Ada", "adl1"),
        canvasStudent(4, "Other, Ada", "ADL1@psu.edu")
      ],
      [myLabStudent(7, "Ada", "Lovelace", "adl1@psu.edu")]
    )
    expect(result[0]).toMatchObject({
      status: "duplicate",
      canvasRowIndex: null,
      candidateCanvasRowIndices: [3, 4],
      reason: "duplicate-identifier"
    })
  })

  it("blocks duplicate normalized MyLab emails from targeting one Canvas row", () => {
    const result = matchStudents(
      [canvasStudent(3, "Lovelace, Ada", "adl1")],
      [
        myLabStudent(7, "Ada", "Lovelace", "adl1@psu.edu"),
        myLabStudent(8, "Different", "Student", " ADL1@PSU.EDU ")
      ]
    )
    expect(result).toHaveLength(2)
    for (const match of result) {
      expect(match).toMatchObject({
        status: "duplicate",
        canvasRowIndex: null,
        candidateCanvasRowIndices: [3],
        reason: "duplicate-identifier"
      })
    }
  })

  it("keeps all exact-name candidates as an ambiguous suggestion", () => {
    const result = matchStudents(
      [
        canvasStudent(3, "Lovelace, Ada", "first@psu.edu"),
        canvasStudent(4, "Lovelace, Ada", "second@psu.edu")
      ],
      [myLabStudent(7, "Ada", "Lovelace", "unknown@psu.edu")]
    )
    expect(result[0]).toMatchObject({
      status: "suggested",
      canvasRowIndex: null,
      candidateCanvasRowIndices: [3, 4]
    })
  })

  it("never cross-compares MyLab Log-in with Canvas SIS User ID", () => {
    const result = matchStudents(
      [canvasStudent(3, "Different, Person", "other@psu.edu", "shared-id")],
      [myLabStudent(7, "No", "Match", "unknown@psu.edu", "shared-id")]
    )
    expect(result[0]?.status).toBe("unmatched")
  })

  it("does not let an unmatched row inherit the previous exact Canvas row", () => {
    const result = matchStudents(
      [canvasStudent(3, "Lovelace, Ada", "adl1")],
      [
        myLabStudent(7, "Ada", "Lovelace", "adl1@psu.edu"),
        myLabStudent(8, "No", "Match", "nobody@example.com")
      ]
    )
    expect(result[0]?.canvasRowIndex).toBe(3)
    expect(result[1]).toMatchObject({
      status: "unmatched",
      canvasRowIndex: null,
      candidateCanvasRowIndices: [],
      reason: "none"
    })
  })

  it("supports Canvas names without a comma while ignoring empty identifiers", () => {
    const result = matchStudents(
      [canvasStudent(3, "Ada Lovelace", "")],
      [myLabStudent(7, "Ada", "Lovelace", "")]
    )
    expect(result[0]).toMatchObject({
      status: "suggested",
      canvasRowIndex: null,
      candidateCanvasRowIndices: [3],
      reason: "name"
    })
  })
})
