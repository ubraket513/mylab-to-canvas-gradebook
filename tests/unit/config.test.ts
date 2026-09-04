import { describe, expect, it } from "vitest"
import {
  APP_NAME,
  DEFAULT_THRESHOLD,
  MAX_CSV_BYTES,
  MAX_THRESHOLD,
  MIN_THRESHOLD
} from "../../src/config"

describe("application constants", () => {
  it("uses the approved product limits", () => {
    expect(APP_NAME).toBe("MyLab to Canvas Gradebook")
    expect(DEFAULT_THRESHOLD).toBe(0.8)
    expect(MIN_THRESHOLD).toBe(0.01)
    expect(MAX_THRESHOLD).toBe(1)
    expect(MAX_CSV_BYTES).toBe(25 * 1024 * 1024)
  })
})
