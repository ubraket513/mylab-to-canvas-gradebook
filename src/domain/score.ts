export interface WeightedSectionScore {
  sectionKey: string
  rawScore: number
  weight: number
}

export interface CanvasScoreResult {
  existingUsed: number
  usedBlankAsZero: boolean
  finalScore: number
}

const TIE_EPSILON = 1e-10

function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite.`)
}

function requireThreshold(threshold: number): void {
  requireFinite(threshold, "Threshold")
  if (threshold < 0.01 || threshold > 1) {
    throw new RangeError("Threshold must be between 0.01 and 1.")
  }
}

export function adjustSectionScore(rawScore: number, threshold: number, weight: number): number {
  requireFinite(rawScore, "Raw score")
  requireThreshold(threshold)
  requireFinite(weight, "Weight")

  if (rawScore < 0 || rawScore > 1) {
    throw new RangeError("Raw score must be between 0 and 1.")
  }
  if (weight < 0) throw new RangeError("Weight cannot be negative.")

  const bonus = 1 - threshold
  const roundedUp = Math.ceil((rawScore + bonus) * 10 - TIE_EPSILON) / 10
  return rawScore >= threshold ? weight : weight * roundedUp
}

export function calculateMyLabAddOn(
  scores: readonly WeightedSectionScore[],
  threshold: number
): number {
  requireThreshold(threshold)
  return scores.reduce(
    (total, score) => total + adjustSectionScore(score.rawScore, threshold, score.weight),
    0
  )
}

export function roundHalfEven(value: number, digits: number): number {
  requireFinite(value, "Value")
  if (value < 0) throw new RangeError("Value cannot be negative.")
  if (!Number.isInteger(digits) || digits < 0) {
    throw new RangeError("Digits must be a non-negative integer.")
  }

  const factor = 10 ** digits
  const scaled = value * factor
  requireFinite(scaled, "Scaled value")

  const lower = Math.floor(scaled)
  const fraction = scaled - lower
  const rounded =
    Math.abs(fraction - 0.5) <= TIE_EPSILON
      ? lower % 2 === 0
        ? lower
        : lower + 1
      : Math.round(scaled)

  return rounded / factor
}

export function calculateCanvasScore(
  existingScore: number | null,
  addOn: number
): CanvasScoreResult {
  const existingUsed = existingScore ?? 0
  requireFinite(existingUsed, "Existing score")
  requireFinite(addOn, "Add-on")
  if (existingUsed < 0 || addOn < 0) {
    throw new RangeError("Scores cannot be negative.")
  }

  return {
    existingUsed,
    usedBlankAsZero: existingScore === null,
    finalScore: roundHalfEven(existingUsed + addOn, 1)
  }
}
