import { describe, expect, it } from "vitest"
import {
  adjustSectionScore,
  calculateCanvasScore,
  calculateMyLabAddOn,
  roundHalfEven
} from "../../src/domain/score"

describe("adjustSectionScore", () => {
  it.each([
    [0.79, 0.8, 10, 10],
    [0.8, 0.8, 10, 10],
    [0.45, 0.8, 10, 7],
    [0, 0.8, 10, 2],
    [0, 0.01, 10, 10],
    [0.79, 1, 10, 8]
  ])("adjusts %s at threshold %s", (raw, threshold, weight, expected) => {
    expect(adjustSectionScore(raw, threshold, weight)).toBe(expected)
  })

  it("keeps fractional section weights", () => {
    expect(adjustSectionScore(0.45, 0.8, 2.5)).toBe(1.75)
  })

  it("rejects scores outside zero through one", () => {
    expect(() => adjustSectionScore(1.01, 0.8, 10)).toThrow(RangeError)
  })
})

describe("totals and final rounding", () => {
  it("sums all detected sections", () => {
    expect(
      calculateMyLabAddOn(
        [
          { sectionKey: "1.1", rawScore: 0.45, weight: 10 },
          { sectionKey: "1.2", rawScore: 0.8, weight: 10 },
          { sectionKey: "1.3", rawScore: 0, weight: 5 }
        ],
        0.8
      )
    ).toBe(18)
  })

  it("uses Python-compatible half-even rounding", () => {
    expect(roundHalfEven(10.25, 1)).toBe(10.2)
    expect(roundHalfEven(10.75, 1)).toBe(10.8)
    expect(calculateCanvasScore(null, 10.25)).toEqual({
      existingUsed: 0,
      usedBlankAsZero: true,
      finalScore: 10.2
    })
  })
})
