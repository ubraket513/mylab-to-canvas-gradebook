import { describe, expect, it } from "vitest"
import { DETAILS_LIMIT, REQUEST_TYPES, SUMMARY_LIMIT, issueUrl } from "../../src/app/issue-report"
import { ISSUES_URL } from "../../src/config"

const parse = (url: string) => new URL(url)

describe("issueUrl", () => {
  it("targets the project issue form and carries the chosen label", () => {
    const url = parse(issueUrl("bug", "Continue does nothing", "Pressed Continue twice.", "Firefox/141.0"))
    expect(`${url.origin}${url.pathname}`).toBe(ISSUES_URL)
    expect(url.searchParams.get("labels")).toBe("bug")
    expect(url.searchParams.get("title")).toBe("Continue does nothing")
    expect(url.searchParams.get("body")).toContain("Something is broken")
    expect(url.searchParams.get("body")).toContain("Pressed Continue twice.")
    expect(url.searchParams.get("body")).toContain("Firefox/141.0")
  })

  it("encodes characters that would otherwise break the query string", () => {
    const url = parse(issueUrl("question", "Rounding: 0.5 & 1.5?", "Uses #3 and 100%", "UA"))
    expect(url.searchParams.get("title")).toBe("Rounding: 0.5 & 1.5?")
    expect(url.searchParams.get("body")).toContain("Uses #3 and 100%")
  })

  it("clamps oversized input so the URL stays within server limits", () => {
    const url = parse(issueUrl("suggestion", "s".repeat(400), "d".repeat(9000), "u".repeat(2000)))
    expect(url.searchParams.get("title")).toHaveLength(SUMMARY_LIMIT)
    expect(url.searchParams.get("body")!.length).toBeLessThan(DETAILS_LIMIT + 1024)
    expect(url.toString().length).toBeLessThan(8192)
  })

  it("marks empty details rather than sending a blank section", () => {
    const url = parse(issueUrl("bug", "Title", "   ", "UA"))
    expect(url.searchParams.get("body")).toContain("_Not provided_")
  })

  it("falls back to no label for an unknown request type", () => {
    const url = parse(issueUrl("nonsense", "Title", "Body", "UA"))
    expect(url.searchParams.get("labels")).toBe("")
    expect(url.searchParams.get("body")).toContain("**Type:** nonsense")
  })

  it("keeps every request type mapped to a label", () => {
    for (const type of REQUEST_TYPES) {
      expect(type.issueLabel).not.toBe("")
    }
  })
})
