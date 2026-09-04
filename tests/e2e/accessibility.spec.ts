import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(
    results.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length }))
  ).toEqual([])
}

async function reachReview(page: Page): Promise<void> {
  await page.getByLabel("Canvas gradebook CSV").setInputFiles("tests/fixtures/anonymized/canvas-valid.csv")
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByLabel("MyLab gradebook CSV").setInputFiles("tests/fixtures/anonymized/mylab-review.csv")
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByRole("button", { name: "Continue to review" }).click()
}

test("all populated wizard steps pass WCAG automated checks", async ({ page }) => {
  await page.goto("/")
  await expectNoViolations(page)
  await page.getByLabel("Canvas gradebook CSV").setInputFiles("tests/fixtures/anonymized/canvas-valid.csv")
  await page.getByRole("button", { name: "Continue" }).click()
  await expectNoViolations(page)
  await page.getByLabel("MyLab gradebook CSV").setInputFiles("tests/fixtures/anonymized/mylab-review.csv")
  await page.getByRole("button", { name: "Continue" }).click()
  await expectNoViolations(page)
  await page.getByRole("button", { name: "Continue to review" }).click()
  await expectNoViolations(page)
  await page.getByRole("radio", { name: "Match Grace Hopper to Hopper, Grace" }).check()
  await page.getByLabel("I understand unmatched students will remain unchanged").check()
  await page.getByLabel("I understand blank scores are treated as zero").check()
  await page.getByLabel("Include Ada Lovelace score above the assignment maximum").check()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download gradebook" }).click()
  await downloadPromise
  await expectNoViolations(page)
})

test("keyboard focus and narrow reflow remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto("/")
  await page.keyboard.press("Tab")
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused()

  await page.getByLabel("Canvas gradebook CSV").setInputFiles("tests/fixtures/anonymized/canvas-valid.csv")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByRole("heading", { name: "Choose what to update" })).toBeFocused()

  await page.getByLabel("MyLab gradebook CSV").setInputFiles("tests/fixtures/anonymized/mylab-review.csv")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByRole("heading", { name: "Set the grading rules" })).toBeFocused()

  await page.setViewportSize({ width: 512, height: 768 })
  await expect(page.getByRole("button", { name: "Continue to review" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.getByRole("button", { name: "Continue to review" }).click()
  await expect(page.locator(".review-table tbody")).toHaveCSS("display", "block")
  await expect(page.getByRole("radio", { name: "Match Grace Hopper to Hopper, Grace" })).toBeVisible()
})
