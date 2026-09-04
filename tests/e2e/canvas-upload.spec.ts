import { expect, test } from "@playwright/test"

test("validates and accepts a Canvas gradebook", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Prepare your Canvas gradebook" })).toBeVisible()
  await expect(page.getByText("Step 1 of 5: Upload Canvas gradebook")).toBeVisible()

  await page
    .getByLabel("Canvas gradebook CSV")
    .setInputFiles("tests/fixtures/anonymized/canvas-valid.csv")

  await expect(page.getByRole("status")).toContainText("3 students and 1 assignment found")
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled()
})

test("focuses a useful error for the wrong file", async ({ page }) => {
  await page.goto("/")
  await page.getByLabel("Canvas gradebook CSV").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a gradebook")
  })

  const alert = page.getByRole("alert")
  await expect(alert).toContainText("Choose a Canvas gradebook CSV")
  await expect(alert).toBeFocused()
})
