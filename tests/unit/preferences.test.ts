import { describe, expect, it } from "vitest"

import { DEFAULT_THRESHOLD } from "../../src/config"
import { loadThreshold, saveThreshold } from "../../src/app/preferences"

class FakeStorage {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

describe("threshold preferences", () => {
  it.each([null, "not-a-number", "0", "1.01", "Infinity"])(
    "uses the default for invalid stored value %s",
    (stored) => {
      const storage = new FakeStorage()
      if (stored !== null) storage.values.set("mylab-canvas.threshold", stored)

      expect(loadThreshold(storage)).toBe(DEFAULT_THRESHOLD)
    }
  )

  it("loads a valid threshold", () => {
    const storage = new FakeStorage()
    storage.values.set("mylab-canvas.threshold", "0.85")
    expect(loadThreshold(storage)).toBe(0.85)
  })

  it("stores only the threshold preference", () => {
    const storage = new FakeStorage()
    saveThreshold(storage, 0.9)
    expect([...storage.values]).toEqual([["mylab-canvas.threshold", "0.9"]])
  })

  it("rejects an invalid threshold instead of persisting it", () => {
    const storage = new FakeStorage()
    expect(() => saveThreshold(storage, 0)).toThrow(RangeError)
    expect(storage.values.size).toBe(0)
  })
})
