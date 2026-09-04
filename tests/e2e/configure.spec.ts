import { expect, test } from "@playwright/test"

test("selects an assignment, loads MyLab, and configures grading", async ({ page }) => {
  await page.goto("/")
  await page.getByLabel("Canvas gradebook CSV").setInputFiles(
    "tests/fixtures/anonymized/canvas-valid.csv"
  )
  await page.getByRole("button", { name: "Continue" }).click()

  await page.getByRole("combobox", { name: "Canvas assignment" }).selectOption("5")
  await page.getByLabel("MyLab gradebook CSV").setInputFiles(
    "tests/fixtures/anonymized/mylab-three-sections.csv"
  )
  await expect(page.getByRole("status")).toContainText("2 students and 3 MyLab sections found")
  await page.getByRole("button", { name: "Continue" }).click()

  await expect(page.getByText("Step 3 of 5: Configure grading")).toBeVisible()
  await expect(page.getByLabel("Full-credit threshold")).toHaveValue("80")
  await expect(page.getByLabel("Points for section 1.2")).toHaveValue("2.5")
  await expect(page.getByText("Maximum MyLab add-on: 17.5 points")).toBeVisible()

  await page.getByRole("button", { name: "Back" }).click()
  await expect(page.getByRole("status")).toContainText("2 students and 3 MyLab sections found")
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled()
  await page.getByRole("button", { name: "Continue" }).click()

  await page.getByLabel("Full-credit threshold").fill("90")
  await expect(page.getByText(/At 90%.*receives a 10% bonus.*earns 6 of 10 points/)).toBeVisible()

  await page.getByLabel("Points for section 1.2").fill("-1")
  await expect(page.getByText("Enter zero or a positive number.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Continue to review" })).toBeDisabled()

  await page.getByLabel("Points for section 1.2").fill("0")
  await expect(page.getByText("This section will add no points.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Continue to review" })).toBeEnabled()
})
