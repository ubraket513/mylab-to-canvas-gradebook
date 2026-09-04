import { readFile } from "node:fs/promises"

import { expect, test, type Page } from "@playwright/test"
import Papa from "papaparse"

async function prepareDownload(page: Page): Promise<void> {
  await page.getByLabel("Canvas gradebook CSV").setInputFiles("tests/fixtures/anonymized/canvas-valid.csv")
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByLabel("MyLab gradebook CSV").setInputFiles("tests/fixtures/anonymized/mylab-review.csv")
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByRole("button", { name: "Continue to review" }).click()
  await page.getByRole("radio", { name: "Match Grace Hopper to Hopper, Grace" }).check()
  await page.getByLabel("I understand unmatched students will remain unchanged").check()
  await page.getByLabel("I understand blank scores are treated as zero").check()
  await page.getByLabel("Include Ada Lovelace score above the assignment maximum").check()
}

test("downloads only confirmed score changes and clears the session", async ({ page }, testInfo) => {
  await page.goto("/")
  await prepareDownload(page)

  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download gradebook" }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^canvas-gradebook-updated-\d{4}-\d{2}-\d{2}\.csv$/)
  expect(await download.failure()).toBeNull()
  const outputPath = testInfo.outputPath(download.suggestedFilename())
  await download.saveAs(outputPath)

  const original = Papa.parse<string[]>(
    await readFile("tests/fixtures/anonymized/canvas-valid.csv", "utf8")
  ).data
  const updated = Papa.parse<string[]>(await readFile(outputPath, "utf8")).data
  expect(updated[3]?.[5]).toBe("15.2")
  expect(updated[4]?.[5]).toBe("3.5")
  for (let row = 0; row < original.length; row += 1) {
    for (let column = 0; column < (original[row]?.length ?? 0); column += 1) {
      if ((row === 3 || row === 4) && column === 5) continue
      expect(updated[row]?.[column]).toBe(original[row]?.[column])
    }
  }

  await expect(page.getByText("Step 5 of 5: Download complete")).toBeVisible()
  await page.getByRole("button", { name: "Start over" }).click()
  await expect(page.getByText("Step 1 of 5: Upload Canvas gradebook")).toBeVisible()
  await expect(page.getByLabel("Canvas gradebook CSV")).toHaveValue("")
  await expect(page.getByText("Ada Lovelace")).toHaveCount(0)
})

test("keeps gradebook processing offline and persists only the threshold", async ({ page }) => {
  const requests: string[] = []
  const consoleMessages: string[] = []
  page.on("console", (message) => consoleMessages.push(message.text()))
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  page.on("request", (request) => requests.push(request.url()))

  await prepareDownload(page)
  expect(requests.filter((url) => url.startsWith("http://") || url.startsWith("https://"))).toEqual([])
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({
    "mylab-canvas.threshold": "0.8"
  })
  const output = consoleMessages.join("\n")
  expect(output).not.toContain("adl1@psu.edu")
  expect(output).not.toContain("mylab-review.csv")
  expect(output).not.toContain("0.79,0.45")
})
