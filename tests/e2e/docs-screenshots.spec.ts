import { mkdir } from "node:fs/promises"

import { test, type Page } from "@playwright/test"

const screenshotDirectory = "docs/images"

async function settleForScreenshot(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    window.scrollTo(0, 0)
  })
}

async function reachReview(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByLabel("MyLab gradebook CSV").setInputFiles("tests/fixtures/anonymized/mylab-review.csv")
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByRole("button", { name: "Continue to review" }).click()
}

test("captures the anonymized browser workflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Documentation screenshots use Chromium.")

  await mkdir(screenshotDirectory, { recursive: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/")
  await page.getByLabel("Canvas gradebook CSV").setInputFiles("tests/fixtures/anonymized/canvas-valid.csv")
  await settleForScreenshot(page)
  await page.screenshot({
    path: `${screenshotDirectory}/web-upload-canvas.png`,
    animations: "disabled",
    fullPage: true
  })

  await reachReview(page)
  await settleForScreenshot(page)
  await page.screenshot({
    path: `${screenshotDirectory}/web-review-scores.png`,
    animations: "disabled",
    fullPage: true
  })

  await page.getByRole("radio", { name: "Match Grace Hopper to Hopper, Grace" }).check()
  await page.getByLabel("I understand unmatched students will remain unchanged").check()
  await page.getByLabel("I understand blank scores are treated as zero").check()
  await page.getByLabel("Include Ada Lovelace score above the assignment maximum").check()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download gradebook" }).click()
  await downloadPromise
  await settleForScreenshot(page)
  await page.screenshot({
    path: `${screenshotDirectory}/web-download-complete.png`,
    animations: "disabled",
    fullPage: true
  })
})
