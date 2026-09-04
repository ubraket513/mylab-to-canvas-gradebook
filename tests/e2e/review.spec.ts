import { expect, test, type Page } from "@playwright/test"

async function reachReview(page: Page): Promise<void> {
  await page.goto("/")
  await page.getByLabel("Canvas gradebook CSV").setInputFiles("tests/fixtures/anonymized/canvas-valid.csv")
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByLabel("MyLab gradebook CSV").setInputFiles("tests/fixtures/anonymized/mylab-review.csv")
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByRole("button", { name: "Continue to review" }).click()
}

test("requires every safety decision before download", async ({ page }) => {
  await reachReview(page)
  await expect(page.getByText("Step 4 of 5: Review scores")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Review before downloading" })).toBeVisible()
  await expect(page.getByText("1 match needs confirmation")).toBeVisible()
  const continueButton = page.getByRole("button", { name: "Download gradebook" })
  await expect(continueButton).toBeDisabled()

  await page.getByRole("radio", { name: "Match Grace Hopper to Hopper, Grace" }).check()
  await page.getByLabel("I understand unmatched students will remain unchanged").check()
  await page.getByLabel("I understand blank scores are treated as zero").check()
  await expect(continueButton).toBeDisabled()
  await page.getByLabel("Include Ada Lovelace score above the assignment maximum").check()
  await expect(continueButton).toBeEnabled()
})

test("rejects a suggestion and clears decisions after a grading change", async ({ page }) => {
  await reachReview(page)
  await page.getByRole("radio", { name: "Leave Grace Hopper unchanged" }).check()
  await expect(page.getByText("0 matches need confirmation")).toBeVisible()

  await page.getByRole("button", { name: "Back" }).click()
  await page.getByLabel("Full-credit threshold").fill("90")
  await page.getByRole("button", { name: "Continue to review" }).click()
  await expect(page.getByText("1 match needs confirmation")).toBeVisible()
  await expect(page.getByRole("radio", { name: "Leave Grace Hopper unchanged" })).not.toBeChecked()
})
