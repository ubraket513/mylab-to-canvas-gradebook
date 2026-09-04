import { DEFAULT_THRESHOLD, MAX_THRESHOLD, MIN_THRESHOLD } from "../config"

const THRESHOLD_KEY = "mylab-canvas.threshold"

function isValidThreshold(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_THRESHOLD && value <= MAX_THRESHOLD
}

export function loadThreshold(storage: Pick<Storage, "getItem">): number {
  const value = Number(storage.getItem(THRESHOLD_KEY))
  return isValidThreshold(value) ? value : DEFAULT_THRESHOLD
}

export function saveThreshold(
  storage: Pick<Storage, "setItem">,
  threshold: number
): void {
  if (!isValidThreshold(threshold)) {
    throw new RangeError("Threshold must be between 0.01 and 1.")
  }
  storage.setItem(THRESHOLD_KEY, String(threshold))
}
