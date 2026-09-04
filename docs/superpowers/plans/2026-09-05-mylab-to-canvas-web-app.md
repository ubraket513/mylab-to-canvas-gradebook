# MyLab to Canvas Gradebook Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight, accessible, browser-only application that combines an uploaded Penn State Canvas gradebook CSV with an uploaded MyLab CSV and downloads a safely reviewed Canvas-compatible gradebook.

**Architecture:** A static Vite application uses small vanilla TypeScript modules for parsing, scoring, matching, review policy, export, state, and DOM rendering. Papa Parse is the only runtime dependency; all grade data stays in browser memory, and Vercel serves static assets with a restrictive Content Security Policy.

**Tech Stack:** Node.js 24.x, TypeScript 7, Vite 8, Papa Parse 5, Vitest 5, Playwright 1.62, axe-core, semantic HTML, and modern CSS.

**Spec:** `docs/superpowers/specs/2026-09-05-mylab-to-canvas-web-app-design.md`

## Global Constraints

- Use `gpt-5.3-codex-spark` for every implementation or fix worker.
- Use a separate `gpt-5.6-sol` reviewer at `max` effort after every task and once more for the completed application. A task is not accepted until that reviewer verifies the spec, tests, privacy, and changed diff.
- Before implementing the main UI and during final visual review, query Mobbin MCP again and inspect the returned images. Use [Toggl Track's CSV import flow](https://mobbin.com/flows/6e48fb04-4d0a-46ef-b7dd-c30dc2fc1eeb) as the primary reference and [Bonsai's CSV import flow](https://mobbin.com/flows/75528a02-5c95-4904-abb0-4859948a3906) for previews and row-specific errors.
- Use Vercel MCP for read-only project/configuration validation when it is exposed in the execution session. If it is unavailable, record that fact and validate against current official Vercel documentation plus the local production build; do not invent MCP access or publish the site.
- Do not deploy to Vercel without a separate explicit user request.
- Use Node.js `24.x`. Commit `package-lock.json` and use `npm ci` for clean verification.
- Keep Papa Parse as the only production dependency. Vite, TypeScript, Vitest, Playwright, coverage, and axe are development dependencies.
- Do not add React, Vue, Svelte, Tailwind, a router, a state library, a backend, a Vercel Function, authentication, analytics, telemetry, or remote fonts.
- Limit each uploaded CSV to 25 MB. Support the currently observed Penn State Canvas export and MyLab layout, including dynamic one-, two-, and three-section MyLab files.
- Keep Canvas and MyLab contents only in memory. Never put names, identifiers, grades, filenames, or CSV contents in storage, URLs, logs, telemetry, or network requests.
- Store only the last valid threshold in `localStorage`, under `mylab-canvas.threshold`.
- Preserve the approved formula exactly, including the bonus awarded to a blank MyLab score and Python-compatible half-even final rounding.
- Automatically match only semantically equivalent identifiers: MyLab `Email` to Canvas `SIS Login ID`. Do not cross-match MyLab `Log-in` to Canvas `SIS User ID`. Name normalization may create confirmation-only suggestions.
- The exporter must preserve every original cell value except confirmed scores in the selected assignment. Valid CSV quoting and row order are required; exact optional quote placement and line-ending bytes are not.
- Optimize for desktop Chrome and Edge and provide a usable 1024-by-768 tablet layout.
- Meet WCAG 2.2 AA, use at least 18px body text and 44px controls, and never communicate status with color alone.
- Retain `grading-script.py` as a behavioral reference during this implementation. Do not publish or commit the private gradebook files.

## Required Execution and Review Protocol

For each task:

1. Start a fresh implementation worker with model `gpt-5.3-codex-spark`, give it this plan, the approved spec, and only the current task.
2. The worker follows the red-green-refactor sequence and commits only that task's files.
3. Start a fresh reviewer with model `gpt-5.6-sol`, reasoning effort `max`, and give it the task requirements, commit diff, spec, and test output.
4. Route every valid finding to a new Spark fix worker; rerun the task tests and request another Sol/max review.
5. Continue only when the reviewer reports no blocking correctness, privacy, accessibility, or spec-compliance findings.

The final Sol/max review must additionally compare the implemented frontend screenshots with fresh Mobbin MCP results and inspect the complete diff from the design-spec commit.

## File and Responsibility Map

```text
.gitignore                         Private fixture and generated-file safety
package.json / package-lock.json   Reproducible scripts and dependencies
tsconfig.json                      Strict browser TypeScript configuration
vite.config.ts                     Static production build to dist/
vitest.config.ts                   Node-based unit and coverage tests
vitest.private.config.ts           Opt-in ignored-fixture parity tests
playwright.config.ts               Chromium, Edge, and tablet browser tests
vercel.json                        Static build settings and security headers
index.html                         Semantic single-page entry document
src/
  config.ts                        Product name, threshold, and file-size constants
  main.ts                          Application composition root
  app/
    controller.ts                  Browser events and wizard orchestration
    state.ts                       Pure state transitions and invalidation rules
    preferences.ts                 Threshold-only localStorage adapter
  domain/
    types.ts                       Shared parsed, matching, review, and export types
    score.ts                       Bonus, upward-tenth, and half-even calculations
    matching.ts                    Identifier matches and confirmation-only suggestions
    review-policy.ts               Review rows, warnings, acknowledgements, and export gate
  csv/
    parse.ts                       Papa Parse text/file wrapper
    canvas.ts                      Canvas structure and assignment parser
    mylab.ts                       Current MyLab layout and dynamic section parser
    export.ts                      Selected-cell update and Canvas serialization
  ui/
    dom.ts                         Safe DOM, focus, and status helpers
    app-view.ts                    Page shell and current-step renderer
    components/
      file-picker.ts               Accessible choose-file/drop target
      notice.ts                    Error, warning, and success notices
      step-indicator.ts            Labeled five-step progress
    review-table.ts              Filterable table and tablet card alternative
    download-file.ts             Blob URL creation and prompt cleanup
    views/
      canvas-upload.ts             Step 1
      assignment-mylab.ts          Step 2
      configure.ts                 Step 3
      review.ts                    Step 4
      download.ts                  Step 5
    styles.css                     One tokenized responsive stylesheet
tests/
  fixtures/anonymized/             Synthetic Canvas/MyLab inputs and expected cells
  unit/                            Pure parser/domain/export tests
  e2e/                             Complete browser, privacy, and accessibility tests
  private/legacy-parity.test.ts    Optional local-only numeric parity checks
scripts/check-bundle-size.mjs      Dependency-free gzip bundle budget check
docs/images/                       Anonymized interface screenshots for README
```

---

### Task 1: Establish the Privacy-Safe Static Toolchain

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `index.html`
- Create: `src/config.ts`
- Create: `src/main.ts`
- Create: `src/ui/styles.css`
- Create: `tests/unit/config.test.ts`
- Stage unchanged: `grading-script.py`
- Stage unchanged: `execute.sh`
- Stage unchanged: `env/math_grader_env.yml`
- Stage unchanged: `README.md`
- Stage unchanged: `docs/images/how-to-use-cover.png`
- Stage unchanged: `docs/images/install-dependencies.png`
- Stage unchanged: `docs/images/run-prompt.png`
- Delete: `templates/index.html`

**Interfaces:**
- Produces: `APP_NAME`, `DEFAULT_THRESHOLD`, `MIN_THRESHOLD`, `MAX_THRESHOLD`, and `MAX_CSV_BYTES` from `src/config.ts`.
- Produces: `npm run dev`, `typecheck`, `build`, `preview`, `test`, `test:coverage`, `test:e2e`, and `test:e2e:edge`.

- [ ] **Step 1: Protect local student data before installing or staging anything**

Create `.gitignore` with these exact private and generated paths:

```gitignore
node_modules/
dist/
coverage/
playwright-report/
test-results/
.vercel/
.env
.env.*
!.env.example
.serena/
.vscode/

/canvas.csv
/mylab.csv
/new_canvas_gradebook.csv
/canvas-old-gradebook-compare/
/canvas-new-gradebook-compare/
/mylab-gradebook-compare/
/How to use the program.pptx
```

Run: `git status --short`

Expected: the private CSV files, comparison directories, PowerPoint deck, `.serena`, and `.vscode` no longer appear as untracked files.

- [ ] **Step 2: Remove the unused authentication form and retain the safe legacy baseline**

Delete `templates/index.html`, which is an untracked orphan API-key form superseded by the approved root `index.html`. Do not delete `grading-script.py`; it remains the behavior oracle. Confirm the three files in `docs/images/` are the previously sanitized slide exports, then stage those images, the current README, the Python script, launcher, and Conda environment file with the first implementation commit. Do not stage the source PowerPoint or any CSV.

- [ ] **Step 3: Install the pinned lightweight stack**

Create the initial `package.json` before running npm:

```json
{
  "name": "mylab-to-canvas-gradebook",
  "private": true,
  "version": "0.1.0",
  "type": "module"
}
```

Run:

```powershell
npm install papaparse@5.7.0
npm install --save-dev vite@8.2.2 typescript@7.0.2 @types/node@24 @types/papaparse@5.5.2 vitest@5.0.0 @vitest/coverage-v8@5.0.0 @playwright/test@1.62.1 @axe-core/playwright@4.13.0
npx playwright install chromium
```

Expected: `package-lock.json` is created and `npm ls --depth=0` reports one production dependency, `papaparse`.

- [ ] **Step 4: Define scripts and strict configuration**

Set the relevant `package.json` fields to:

```json
{
  "name": "mylab-to-canvas-gradebook",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": "24.x" },
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit",
    "build": "npm run typecheck && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "npm run build && playwright test --project=chromium --project=tablet",
    "test:e2e:edge": "npm run build && playwright test --project=edge"
  }
}
```

Use this compiler baseline in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
    "types": ["node", "vitest/globals"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useDefineForClassFields": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from "vite"

export default defineConfig({
  base: "/",
  build: { target: "es2022", outDir: "dist" }
})
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.ts", "src/csv/**/*.ts"],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 }
    }
  }
})
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
    {
      name: "tablet",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } }
    }
  ]
})
```

- [ ] **Step 5: Write the failing configuration test**

Create `tests/unit/config.test.ts`:

```ts
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
```

- [ ] **Step 6: Run the test and verify the red state**

Run: `npm test -- tests/unit/config.test.ts`

Expected: FAIL because `src/config.ts` does not exist.

- [ ] **Step 7: Add the minimal static entry point and constants**

Create `src/config.ts`:

```ts
export const APP_NAME = "MyLab to Canvas Gradebook"
export const DEFAULT_THRESHOLD = 0.8
export const MIN_THRESHOLD = 0.01
export const MAX_THRESHOLD = 1
export const MAX_CSV_BYTES = 25 * 1024 * 1024
```

Create a semantic `index.html` with a skip link, `<div id="app">`, and `<script type="module" src="/src/main.ts"></script>`. In `src/main.ts`, use this temporary DOM-only entry point:

```ts
import { APP_NAME } from "./config"
import "./ui/styles.css"

const root = document.querySelector<HTMLElement>("#app")
if (!root) throw new Error("Application root is missing")

const main = document.createElement("main")
main.id = "main-content"
const heading = document.createElement("h1")
heading.textContent = APP_NAME
main.append(heading)
root.append(main)
```

Establish the 18px system-font baseline and visible `:focus-visible` outline in `src/ui/styles.css`.

- [ ] **Step 8: Verify the foundation**

Run:

```powershell
npm test -- tests/unit/config.test.ts
npm run typecheck
npm run build
```

Expected: the test passes, type checking succeeds, and Vite creates `dist/index.html` plus fingerprinted assets.

- [ ] **Step 9: Commit for Sol/max review**

```powershell
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts playwright.config.ts index.html src/config.ts src/main.ts src/ui/styles.css tests/unit/config.test.ts README.md grading-script.py execute.sh env/math_grader_env.yml docs/images/how-to-use-cover.png docs/images/install-dependencies.png docs/images/run-prompt.png
git commit -m "build: add privacy-safe static web foundation"
```

### Task 2: Add Shared Types and the Papa Parse Boundary

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/csv/parse.ts`
- Create: `tests/unit/parse.test.ts`

**Interfaces:**
- Produces: `ValidationIssue`, `ValidationResult<T>`, `CsvMatrix`, and `ParsedNumber`.
- Produces: `parseCsvText(text: string): ValidationResult<CsvMatrix>`.
- Produces: `parseCsvFile(file: File): Promise<ValidationResult<CsvMatrix>>`.
- Consumes: `MAX_CSV_BYTES` from `src/config.ts`.

- [ ] **Step 1: Define the shared result contracts**

Create these declarations in `src/domain/types.ts`:

```ts
export type IssueSeverity = "warning" | "error"

export interface ValidationIssue {
  code: string
  severity: IssueSeverity
  message: string
  row?: number
  column?: number
}

export type ValidationResult<T> =
  | { ok: true; value: T; warnings: ValidationIssue[] }
  | { ok: false; errors: ValidationIssue[] }

export interface CsvMatrix {
  rows: string[][]
  linebreak: "\r\n" | "\n" | "\r"
  hadBom: boolean
}

export type ParsedNumber =
  | { kind: "value"; value: number }
  | { kind: "blank" }
  | { kind: "invalid"; raw: string }
```

- [ ] **Step 2: Write failing CSV boundary tests**

Create `tests/unit/parse.test.ts` with tests that require quoted commas, leading-zero identifiers, an optional UTF-8 BOM, blank rows, CRLF detection, and syntax errors to remain explicit:

```ts
import { describe, expect, it } from "vitest"
import { parseCsvText } from "../../src/csv/parse"

describe("parseCsvText", () => {
  it("keeps cells as strings and preserves structural blank rows", () => {
    const result = parseCsvText('\uFEFFStudent,SIS Login ID\r\n"Lovelace, Ada",00123\r\n,\r\n')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.hadBom).toBe(true)
    expect(result.value.linebreak).toBe("\r\n")
    expect(result.value.rows[1]).toEqual(["Lovelace, Ada", "00123"])
    expect(result.value.rows[2]).toEqual(["", ""])
  })

  it("returns parser errors instead of throwing or logging rows", () => {
    const result = parseCsvText('Student,SIS Login ID\n"unclosed,abc123')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.code).toBe("csv-parse-error")
  })
})
```

- [ ] **Step 3: Run the tests and verify the red state**

Run: `npm test -- tests/unit/parse.test.ts`

Expected: FAIL because `src/csv/parse.ts` does not exist.

- [ ] **Step 4: Implement the text and browser-file parsers**

Use `Papa.parse<string[]>` with `header: false`, `dynamicTyping: false`, `delimiter: ","`, and `skipEmptyLines: false`. Strip only the leading BOM before parsing, inspect `results.errors`, convert every cell to a string, and derive the linebreak from `results.meta.linebreak` with `"\r\n"` fallback.

Wrap browser file parsing in a Promise with `worker: true`. Reject a non-CSV filename or a file over `MAX_CSV_BYTES` before parsing. The `error` callback returns a `file-read-error`; parser errors from `complete` return `csv-parse-error`. Do not include row contents or filenames in messages or console output.

The worker configuration must have this shape:

```ts
Papa.parse<string[]>(file, {
  worker: true,
  header: false,
  dynamicTyping: false,
  delimiter: ",",
  skipEmptyLines: false,
  complete(results) {
    resolve(toValidationResult(results, false))
  },
  error() {
    resolve({
      ok: false,
      errors: [{ code: "file-read-error", severity: "error", message: "We could not read this CSV file." }]
    })
  }
})
```

- [ ] **Step 5: Verify parsing and types**

Run:

```powershell
npm test -- tests/unit/parse.test.ts
npm run typecheck
```

Expected: all parse tests pass without console output containing fixture cells.

- [ ] **Step 6: Commit for Sol/max review**

```powershell
git add src/domain/types.ts src/csv/parse.ts tests/unit/parse.test.ts
git commit -m "feat: add privacy-safe CSV parsing boundary"
```

### Task 3: Port the Approved Score Formula Exactly

**Files:**
- Create: `src/domain/score.ts`
- Create: `tests/unit/score.test.ts`

**Interfaces:**
- Produces: `adjustSectionScore(rawScore: number, threshold: number, weight: number): number`.
- Produces: `calculateMyLabAddOn(scores: readonly WeightedSectionScore[], threshold: number): number`.
- Produces: `calculateCanvasScore(existingScore: number | null, addOn: number): CanvasScoreResult`.
- Produces: Python-compatible `roundHalfEven(value: number, digits: number): number`.

- [ ] **Step 1: Write failing formula and rounding tests**

Create `tests/unit/score.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  adjustSectionScore,
  calculateCanvasScore,
  calculateMyLabAddOn,
  roundHalfEven
} from "../../src/domain/score"

describe("adjustSectionScore", () => {
  it.each([
    [0.79, 0.8, 10, 10],
    [0.8, 0.8, 10, 10],
    [0.45, 0.8, 10, 7],
    [0, 0.8, 10, 2],
    [0, 0.01, 10, 10],
    [0.79, 1, 10, 8]
  ])("adjusts %s at threshold %s", (raw, threshold, weight, expected) => {
    expect(adjustSectionScore(raw, threshold, weight)).toBe(expected)
  })

  it("keeps fractional section weights", () => {
    expect(adjustSectionScore(0.45, 0.8, 2.5)).toBe(1.75)
  })

  it("rejects scores outside zero through one", () => {
    expect(() => adjustSectionScore(1.01, 0.8, 10)).toThrow(RangeError)
  })
})

describe("totals and final rounding", () => {
  it("sums all detected sections", () => {
    expect(calculateMyLabAddOn([
      { sectionKey: "1.1", rawScore: 0.45, weight: 10 },
      { sectionKey: "1.2", rawScore: 0.8, weight: 10 },
      { sectionKey: "1.3", rawScore: 0, weight: 5 }
    ], 0.8)).toBe(18)
  })

  it("uses Python-compatible half-even rounding", () => {
    expect(roundHalfEven(10.25, 1)).toBe(10.2)
    expect(roundHalfEven(10.75, 1)).toBe(10.8)
    expect(calculateCanvasScore(null, 10.25)).toEqual({
      existingUsed: 0,
      usedBlankAsZero: true,
      finalScore: 10.2
    })
  })
})
```

- [ ] **Step 2: Run the tests and verify the red state**

Run: `npm test -- tests/unit/score.test.ts`

Expected: FAIL because `src/domain/score.ts` does not exist.

- [ ] **Step 3: Implement the pure calculation functions**

Define:

```ts
export interface WeightedSectionScore {
  sectionKey: string
  rawScore: number
  weight: number
}

export interface CanvasScoreResult {
  existingUsed: number
  usedBlankAsZero: boolean
  finalScore: number
}
```

Validate finite values, `rawScore` from 0 through 1, `threshold` from 0.01 through 1, and non-negative `weight`. Preserve the legacy formula exactly:

```ts
const bonus = 1 - threshold
const roundedUp = Math.ceil((rawScore + bonus) * 10 - 1e-10) / 10
return rawScore >= threshold ? weight : weight * roundedUp
```

Implement positive-number half-even rounding by separating the scaled integer and fractional parts, treating a fraction within `1e-10` of `0.5` as a tie, and selecting the even integer. Use it only for the final one-decimal Canvas score; do not round intermediate section results.

- [ ] **Step 4: Verify the formula against JavaScript and a tiny Python oracle**

Run:

```powershell
npm test -- tests/unit/score.test.ts
python -c "print(round(10.25, 1), round(10.75, 1))"
npm run typecheck
```

Expected: Vitest passes and Python prints `10.2 10.8`, demonstrating both even-down and even-up ties with exactly representable quarter values.

- [ ] **Step 5: Commit for Sol/max review**

```powershell
git add src/domain/score.ts tests/unit/score.test.ts
git commit -m "feat: port bonus and rounding calculations"
```

### Task 4: Parse Penn State Canvas Gradebook Exports Safely

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/csv/canvas.ts`
- Create: `tests/fixtures/anonymized/canvas-valid.csv`
- Create: `tests/fixtures/anonymized/canvas-duplicate.csv`
- Create: `tests/unit/canvas.test.ts`

**Interfaces:**
- Produces: `CanvasAssignment`, `CanvasStudent`, and `CanvasGradebook`.
- Produces: `parseCanvasGradebook(matrix: CsvMatrix): ValidationResult<CanvasGradebook>`.
- Produces: `readCanvasScore(gradebook: CanvasGradebook, assignment: CanvasAssignment, rowIndex: number): ParsedNumber`.
- Consumes: `CsvMatrix`, `ParsedNumber`, and `ValidationResult<T>` from `src/domain/types.ts`.

Add these exact types:

```ts
export interface CanvasAssignment {
  assignmentId: string
  columnIndex: number
  name: string
  pointsPossible: number
}

export interface CanvasStudent {
  rowIndex: number
  name: string
  sisUserId: string
  sisLoginId: string
}

export interface CanvasGradebook {
  matrix: CsvMatrix
  headerRowIndex: number
  pointsRowIndex: number
  studentColumn: number
  sisUserIdColumn: number
  sisLoginIdColumn: number
  assignments: CanvasAssignment[]
  students: CanvasStudent[]
}
```

- [ ] **Step 1: Add anonymized Canvas fixtures**

Create `tests/fixtures/anonymized/canvas-valid.csv` with CRLF endings and this logical content:

```csv
Student,ID,SIS User ID,SIS Login ID,Section,H2 (15461093),Homework Current Score
,,,,,Manual Posting,
    Points Possible,,,,,10.00,(read only)
"Lovelace, Ada",11,9001,adl1@psu.edu,MATH 140,2.5,80
"Hopper, Grace",12,9002,gxh2@psu.edu,MATH 140,,90
"Johnson, Katherine",13,9003,kjj3,MATH 140,1.0,95
"Student, Test",14,,,MATH 140,0,0
```

Create `canvas-duplicate.csv` by using two non-test student rows with the same `SIS Login ID` and otherwise valid metadata. These are synthetic identities; do not copy any row from the private files.

- [ ] **Step 2: Write failing Canvas parser tests**

Tests must assert:

```ts
expect(book.assignments).toEqual([{
  assignmentId: "15461093",
  columnIndex: 5,
  name: "H2",
  pointsPossible: 10
}])
expect(book.students).toHaveLength(3)
expect(book.matrix.rows[1]?.[5]).toBe("Manual Posting")
expect(readCanvasScore(book, book.assignments[0]!, 4)).toEqual({ kind: "blank" })
```

Also verify that the read-only aggregate column is not offered, the test-student row stays in `matrix.rows` but not in `students`, a missing Points Possible row fails with `canvas-points-row-missing`, and duplicate normalized SIS Login IDs produce `canvas-duplicate-login` warnings.

- [ ] **Step 3: Run the tests and verify the red state**

Run: `npm test -- tests/unit/canvas.test.ts`

Expected: FAIL because the Canvas types and parser do not exist.

- [ ] **Step 4: Implement structural detection without fixed row counts**

Find required header indexes by exact trimmed label. Find the Points Possible row by a trimmed, case-insensitive match in the `Student` column. Offer an assignment only when its header ends in `(<digits>)` and its Points Possible cell is a finite non-negative number. Derive the display name by removing only the final ID suffix.

Treat rows after Points Possible as students when `SIS Login ID` is nonblank. Preserve rows without that identifier in the matrix and issue a warning; explicitly exclude the Canvas test student from matching. Normalize duplicate checks with `trim().toLocaleLowerCase("en-US")`.

`readCanvasScore` returns `blank` for whitespace, `value` for a finite number, and `invalid` for any other nonblank content. It never mutates the matrix.

Use this structural core rather than fixed physical row numbers:

```ts
const pointsRowIndex = matrix.rows.findIndex(
  (row) => row[studentColumn]?.trim().toLocaleLowerCase("en-US") === "points possible"
)
const assignmentPattern = /^(.*?)\s+\((\d+)\)\s*$/
const assignments = header.flatMap((cell, columnIndex) => {
  const match = assignmentPattern.exec(cell.trim())
  const points = Number(matrix.rows[pointsRowIndex]?.[columnIndex])
  return match && Number.isFinite(points) && points >= 0
    ? [{ name: match[1]!.trim(), assignmentId: match[2]!, columnIndex, pointsPossible: points }]
    : []
})
```

- [ ] **Step 5: Verify all Canvas cases**

Run:

```powershell
npm test -- tests/unit/canvas.test.ts
npm run typecheck
```

Expected: all Canvas tests pass, including metadata preservation and duplicate warnings.

- [ ] **Step 6: Commit for Sol/max review**

```powershell
git add src/domain/types.ts src/csv/canvas.ts tests/fixtures/anonymized/canvas-valid.csv tests/fixtures/anonymized/canvas-duplicate.csv tests/unit/canvas.test.ts
git commit -m "feat: parse Canvas gradebook structure"
```

### Task 5: Parse the Current MyLab Layout with Dynamic Sections

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/csv/mylab.ts`
- Create: `tests/fixtures/anonymized/mylab-three-sections.csv`
- Create: `tests/fixtures/anonymized/mylab-invalid-score.csv`
- Create: `tests/unit/mylab.test.ts`

**Interfaces:**
- Produces: `MyLabSection`, `MyLabStudent`, and `MyLabGradebook`.
- Produces: `parseMyLabGradebook(matrix: CsvMatrix): ValidationResult<MyLabGradebook>`.
- Consumes: `ParsedNumber` for every section score.

Add these exact types:

```ts
export interface MyLabSection {
  key: string
  columnIndex: number
  detectedWeight: number
}

export interface MyLabStudent {
  rowIndex: number
  firstName: string
  lastName: string
  email: string
  login: string
  scores: Record<string, ParsedNumber>
}

export interface MyLabGradebook {
  sections: MyLabSection[]
  students: MyLabStudent[]
  issues: ValidationIssue[]
}
```

- [ ] **Step 1: Add synthetic MyLab fixtures matching the observed layout**

Create `mylab-three-sections.csv`:

```csv
,,,,,1.1,1.2,1.3,
,,,,Chapter Coverage,1,1,1,
,,,,Weight,10,2.5,5,
,,,,Attempt,1,1,1,
Last name,First name,Email,Log-in,,Score,Score,Score,
Lovelace,Ada,adl1@psu.edu,adl1,,0.79,0.45,0,
Hopper,Grace,grace@example.com,grace,,0.8,,0.5,

,,,,Course average,,,,
```

Create `mylab-invalid-score.csv` with the same metadata and one student score cell containing `absent`. Do not include real names, emails, IDs, or grades.

- [ ] **Step 2: Write failing dynamic-layout tests**

Assert that the parser:

```ts
expect(book.sections.map(({ key, detectedWeight }) => ({ key, detectedWeight }))).toEqual([
  { key: "1.1", detectedWeight: 10 },
  { key: "1.2", detectedWeight: 2.5 },
  { key: "1.3", detectedWeight: 5 }
])
expect(book.students[1]?.scores["1.2"]).toEqual({ kind: "blank" })
```

Also test one-section and two-section strings, optional entirely blank physical lines, section scores with four decimals, missing Weight metadata, scores below 0 or above 1, and invalid text represented as `{ kind: "invalid", raw: "absent" }` plus a row-level issue.

- [ ] **Step 3: Run the tests and verify the red state**

Run: `npm test -- tests/unit/mylab.test.ts`

Expected: FAIL because `src/csv/mylab.ts` does not exist.

- [ ] **Step 4: Implement logical-row and dynamic-section detection**

For MyLab interpretation only, remove rows whose cells are all whitespace; Canvas parsing must continue to preserve such rows. Find the logical rows containing `Weight`, `Attempt`, and the labels `Last name`, `First name`, and `Email` rather than dropping a fixed tail count.

Treat nonblank header cells beginning at the first `Score` column as section keys when the corresponding Weight cell is a finite non-negative number. Preserve fractional weights. Treat subsequent rows with an email-like value in the Email column as students; ignore later summary rows without an email. Retain MyLab `Log-in` as display/debug metadata only and never use it for automatic Canvas matching.

Convert score cells to `ParsedNumber`. Blank becomes `blank`; finite values from 0 through 1 become `value`; invalid or out-of-range content becomes `invalid` and adds a non-PII issue containing only logical row and section coordinates.

The implementation begins with these logical-row invariants:

```ts
const logicalRows = matrix.rows.filter((row) => row.some((cell) => cell.trim() !== ""))
const labelsRowIndex = logicalRows.findIndex(
  (row) => row.includes("Last name") && row.includes("First name") && row.includes("Email")
)
const weightRowIndex = logicalRows.findIndex((row) => row.some((cell) => cell.trim() === "Weight"))
const firstScoreColumn = logicalRows[labelsRowIndex]!.findIndex((cell) => cell.trim() === "Score")
```

Build sections from nonblank keys in the first logical row at or after `firstScoreColumn`, paired with numeric cells in `weightRowIndex`. This permits one, two, three, or more sections without restoring the legacy two-section slice.

- [ ] **Step 5: Verify layout coverage**

Run:

```powershell
npm test -- tests/unit/mylab.test.ts
npm run typecheck
```

Expected: all one-, two-, and three-section cases pass; fractional weights are not truncated; summary rows are not students.

- [ ] **Step 6: Commit for Sol/max review**

```powershell
git add src/domain/types.ts src/csv/mylab.ts tests/fixtures/anonymized/mylab-three-sections.csv tests/fixtures/anonymized/mylab-invalid-score.csv tests/unit/mylab.test.ts
git commit -m "feat: parse dynamic MyLab gradebook sections"
```

### Task 6: Match Students Conservatively

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/domain/matching.ts`
- Create: `tests/unit/matching.test.ts`

**Interfaces:**
- Produces: `StudentMatch` with status `exact`, `suggested`, `unmatched`, or `duplicate`.
- Produces: `matchStudents(canvas: readonly CanvasStudent[], mylab: readonly MyLabStudent[]): StudentMatch[]`.
- Produces: `normalizePsuLogin(value: string): string` and `normalizeNameTokens(value: string): string[]` for direct tests.
- Consumes: MyLab email and Canvas SIS Login ID only for automatic matches.

Add this exact match contract:

```ts
export type MatchStatus = "exact" | "suggested" | "unmatched" | "duplicate"

export interface StudentMatch {
  mylabRowIndex: number
  status: MatchStatus
  canvasRowIndex: number | null
  candidateCanvasRowIndices: number[]
  reason: "identifier" | "name" | "none" | "duplicate-identifier"
}
```

- [ ] **Step 1: Write failing conservative matching tests**

Create small in-memory students and assert these cases:

```ts
expect(matchStudents(canvas, [{
  rowIndex: 7,
  firstName: "Ada",
  lastName: "Lovelace",
  email: " ADL1@psu.edu ",
  login: "unrelated-login",
  scores: {}
}])[0]).toMatchObject({ status: "exact", canvasRowIndex: 3 })
```

Add tests proving that:

- `adl1@psu.edu` matches Canvas `adl1` and Canvas `adl1@psu.edu`;
- a non-PSU MyLab email must equal the complete Canvas SIS Login ID to match exactly;
- `O'Neil, José A.` and MyLab first/last `Jose A` / `ONeil` create one suggestion but not an exact match;
- two Canvas rows with the same normalized login produce `duplicate` and no selected row;
- two name candidates produce an ambiguous suggestion with both candidate row indexes;
- MyLab `Log-in` and Canvas `SIS User ID` are never cross-compared;
- an unmatched MyLab student returns `unmatched` and cannot inherit a prior student's Canvas row.

- [ ] **Step 2: Run the tests and verify the red state**

Run: `npm test -- tests/unit/matching.test.ts`

Expected: FAIL because `src/domain/matching.ts` does not exist.

- [ ] **Step 3: Implement exact identity matching and name suggestions**

Normalize identifiers with Unicode normalization, trim, and lowercase. `normalizePsuLogin` returns the account prefix for a value ending in `@psu.edu`, so MyLab `adl1@psu.edu`, Canvas `adl1@psu.edu`, and Canvas `adl1` share the canonical key `adl1`. All non-PSU values retain their complete normalized value.

Normalize names by applying `NFKD`, removing combining marks and punctuation, lowercasing, and splitting on whitespace. Parse Canvas's `Last, First` display order, then compare the sorted token sets with the combined MyLab first and last names. Do not use substring or edit-distance matching.

An identifier with exactly one Canvas row is `exact`. Multiple identifier rows are `duplicate`. Name comparison with one candidate is `suggested`; multiple candidates remain `suggested` with all candidates and no selected row. No candidate is `unmatched`. Suggestions are data for the review UI and are never silently promoted.

Keep the decision order explicit:

```ts
const exactCandidates = canvasByLogin.get(normalizePsuLogin(student.email)) ?? []
if (exactCandidates.length === 1) return exactMatch(student, exactCandidates[0]!)
if (exactCandidates.length > 1) return duplicateMatch(student, exactCandidates)

const nameCandidates = findExactTokenSetCandidates(student, canvas)
if (nameCandidates.length > 0) return suggestedMatch(student, nameCandidates)
return unmatched(student)
```

- [ ] **Step 4: Verify matching behavior and stale-score regression**

Run:

```powershell
npm test -- tests/unit/matching.test.ts
npm run typecheck
```

Expected: all matching tests pass, including the regression proving an unmatched row has `canvasRowIndex: null` after an exact match.

- [ ] **Step 5: Commit for Sol/max review**

```powershell
git add src/domain/types.ts src/domain/matching.ts tests/unit/matching.test.ts
git commit -m "feat: add conservative student matching"
```

### Task 7: Build Review Rows and the Export Safety Gate

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/domain/review-policy.ts`
- Create: `tests/unit/review-policy.test.ts`

**Interfaces:**
- Produces: `ReviewDecisions`, `SectionResult`, `ReviewRow`, `ReviewSummary`, and `ReviewModel`.
- Produces: `buildReviewModel(input: ReviewInput): ReviewModel`.
- Consumes: parsed gradebooks, selected assignment, editable weights, threshold, matches, uncertain-match resolutions, acknowledgements, and over-maximum overrides.

- [ ] **Step 1: Define explicit decision and review types**

Add these decision semantics to `src/domain/types.ts`:

```ts
export interface ReviewDecisions {
  matchResolutions: ReadonlyMap<number, number | null>
  acknowledgedUnmatched: boolean
  acknowledgedBlankScores: boolean
  overMaximumOverrides: ReadonlySet<number>
}

export type ReviewWarningCode =
  | "unmatched"
  | "ambiguous-match"
  | "blank-canvas-score"
  | "blank-mylab-score"
  | "invalid-canvas-score"
  | "invalid-mylab-score"
  | "over-assignment-maximum"

export interface SectionResult {
  sectionKey: string
  raw: ParsedNumber
  rawUsed: number | null
  weight: number
  adjusted: number | null
}

export interface ReviewRow {
  key: string
  mylabRowIndex: number
  canvasRowIndex: number | null
  studentDisplayName: string
  matchStatus: MatchStatus
  existingCanvasScore: ParsedNumber | null
  sectionResults: SectionResult[]
  myLabAddOn: number | null
  newCanvasScore: number | null
  warnings: ReviewWarningCode[]
  includeInExport: boolean
}

export interface ReviewSummary {
  confirmed: number
  needsConfirmation: number
  unmatched: number
  blankCanvasScores: number
  blankMyLabScores: number
  overMaximum: number
}

export interface ReviewModel {
  rows: ReviewRow[]
  summary: ReviewSummary
  blockers: string[]
  exportAllowed: boolean
}

export interface ReviewInput {
  canvas: CanvasGradebook
  assignment: CanvasAssignment
  mylab: MyLabGradebook
  weights: ReadonlyMap<string, number>
  threshold: number
  matches: readonly StudentMatch[]
  decisions: ReviewDecisions
}
```

Map keys are MyLab row indexes for uncertain-match resolutions and Canvas row indexes for over-maximum overrides. A match value of `null` means the instructor explicitly rejected the candidates and chose to leave Canvas unchanged.

- [ ] **Step 2: Write failing review-policy tests**

Create test builders with synthetic rows, then require:

```ts
expect(model.summary).toMatchObject({
  confirmed: 1,
  needsConfirmation: 1,
  unmatched: 1,
  blankCanvasScores: 1,
  blankMyLabScores: 1,
  overMaximum: 1
})
expect(model.exportAllowed).toBe(false)
```

Add independent tests for:

- exact matches included automatically;
- suggested-name and duplicate-identifier matches excluded until the selected candidate is explicitly stored;
- rejected uncertain matches becoming acknowledged unmatched rows;
- a blank Canvas score becoming zero and adding `blank-canvas-score`;
- each blank MyLab section becoming raw zero, receiving its normal bonus, and adding one row warning;
- invalid Canvas or MyLab numeric text blocking export with no calculated final score;
- a calculated score above points possible blocked until that Canvas row is in `overMaximumOverrides`;
- unmatched and blank warnings requiring their respective acknowledgements;
- all blockers clearing only when every condition is satisfied.

- [ ] **Step 3: Run the tests and verify the red state**

Run: `npm test -- tests/unit/review-policy.test.ts`

Expected: FAIL because `src/domain/review-policy.ts` does not exist.

- [ ] **Step 4: Implement a pure, row-local review engine**

For every MyLab student, resolve the match independently. Read the selected Canvas cell only after a unique exact match or explicitly confirmed candidate exists. Convert blanks as approved, call the pure score functions, and attach warnings without including identifiers in exception messages.

Set `newCanvasScore` to `null` for invalid numeric content. A valid unmatched or rejected row has no Canvas score and produces no update. Count warnings by affected student, not by individual section cells, so the summary matches the number of people requiring attention.

Compute `exportAllowed` from these exact rules:

```ts
const exportAllowed =
  !hasInvalidScores &&
  unresolvedCandidateMatches === 0 &&
  (unmatched === 0 || decisions.acknowledgedUnmatched) &&
  (blankScoreRows === 0 || decisions.acknowledgedBlankScores) &&
  unoverriddenMaximumRows === 0
```

- [ ] **Step 5: Verify the safety matrix**

Run:

```powershell
npm test -- tests/unit/review-policy.test.ts
npm run test:coverage -- tests/unit/score.test.ts tests/unit/matching.test.ts tests/unit/review-policy.test.ts
```

Expected: all tests pass and every branch of `src/domain/score.ts`, `matching.ts`, and `review-policy.ts` is exercised. Treat uncovered defensive branches as prompts for explicit tests, not as a reason to exclude files.

- [ ] **Step 6: Commit for Sol/max review**

```powershell
git add src/domain/types.ts src/domain/review-policy.ts tests/unit/review-policy.test.ts
git commit -m "feat: add score review and export safety policy"
```

### Task 8: Export Only Confirmed Canvas Assignment Cells

**Files:**
- Create: `src/csv/export.ts`
- Create: `tests/fixtures/anonymized/canvas-expected.csv`
- Create: `tests/unit/export.test.ts`

**Interfaces:**
- Produces: `buildScoreUpdates(rows: readonly ReviewRow[]): ReadonlyMap<number, string>`.
- Produces: `exportCanvasGradebook(gradebook: CanvasGradebook, assignment: CanvasAssignment, updates: ReadonlyMap<number, string>): string`.
- Produces: `makeDownloadFilename(now: Date): string`.
- Consumes: only review rows already admitted by `ReviewModel.exportAllowed`.

- [ ] **Step 1: Write failing selected-cell invariant tests**

Create `tests/fixtures/anonymized/canvas-expected.csv` with only Ada's selected assignment cell changed from `2.5` to `9.0` and Grace's changed from blank to `10.0`:

```csv
Student,ID,SIS User ID,SIS Login ID,Section,H2 (15461093),Homework Current Score
,,,,,Manual Posting,
    Points Possible,,,,,10.00,(read only)
"Lovelace, Ada",11,9001,adl1@psu.edu,MATH 140,9.0,80
"Hopper, Grace",12,9002,gxh2@psu.edu,MATH 140,10.0,90
"Johnson, Katherine",13,9003,kjj3,MATH 140,1.0,95
"Student, Test",14,,,MATH 140,0,0
```

Parse `canvas-valid.csv`, apply updates only to Ada and Grace in column 5, export, parse the result again, and compare every cell:

```ts
for (let row = 0; row < original.rows.length; row += 1) {
  for (let column = 0; column < original.rows[row]!.length; column += 1) {
    const isApprovedChange = (row === 3 || row === 4) && column === 5
    if (!isApprovedChange) {
      expect(exported.rows[row]![column]).toBe(original.rows[row]![column])
    }
  }
}
```

Also assert that:

- ID, SIS User ID, SIS Login ID, metadata, aggregate scores, unrelated assignments, and the test-student row are unchanged;
- scores are written with exactly one decimal digit;
- the original matrix object is not mutated;
- an update for a row not in `gradebook.students` throws before serialization;
- a target column different from the selected assignment cannot be supplied;
- BOM presence and the detected linebreak are retained where supported;
- `makeDownloadFilename(new Date("2026-09-05T12:00:00Z"))` returns `canvas-gradebook-updated-2026-09-05.csv`.

- [ ] **Step 2: Run the tests and verify the red state**

Run: `npm test -- tests/unit/export.test.ts`

Expected: FAIL because `src/csv/export.ts` does not exist.

- [ ] **Step 3: Implement update-map serialization**

Clone each row before replacing cells. Validate every row key against the parsed Canvas students. Write finite scores using `score.toFixed(1)`. Serialize with:

```ts
Papa.unparse(rows, {
  header: false,
  delimiter: ",",
  newline: gradebook.matrix.linebreak || "\r\n",
  quoteChar: '"',
  escapeChar: '"',
  quotes: false,
  skipEmptyLines: false,
  escapeFormulae: false
})
```

Prepend a BOM only when `gradebook.matrix.hadBom` is true. `escapeFormulae` remains false because enabling it would mutate unrelated Canvas cells; the application creates only numeric score values.

- [ ] **Step 4: Verify semantic preservation**

Run:

```powershell
npm test -- tests/unit/export.test.ts
npm run typecheck
```

Expected: all cell-level invariants pass. Do not assert byte-identical optional quoting.

- [ ] **Step 5: Commit for Sol/max review**

```powershell
git add src/csv/export.ts tests/fixtures/anonymized/canvas-expected.csv tests/unit/export.test.ts
git commit -m "feat: export confirmed Canvas score updates"
```

### Task 9: Add an Optional Private Legacy-Parity Harness

**Files:**
- Create: `tests/private/legacy-parity.test.ts`
- Create: `vitest.private.config.ts`
- Modify: `package.json`
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: the local ignored `canvas-old-gradebook-compare`, `mylab-gradebook-compare`, and `canvas-new-gradebook-compare` directories when present.
- Produces: `npm run test:private` for numeric investigation only; it is not part of CI or `npm test`.

- [ ] **Step 1: Add a private-test script without exposing data**

Add:

```json
"test:private": "vitest run --config vitest.private.config.ts"
```

Create `vitest.private.config.ts` and keep private tests outside the normal Vitest include:

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/private/**/*.test.ts"],
    testTimeout: 30_000
  }
})
```

- [ ] **Step 2: Write the local parity test**

The test enumerates common assignment-ID prefixes across the three ignored directories, parses each old Canvas and MyLab pair, selects the Canvas assignment with that exact ID, and compares only exact-identifier matched students' calculated selected-assignment numbers with the historical new file.

It must skip with a single count-only message when the directories are absent, never print a filename containing a course ID, and never print names, identifiers, scores, rows, or diffs. It must explicitly avoid whole-file comparison because historical outputs contain Pandas-coerced ID cells and extra index columns.

The core assertion shape is:

```ts
expect(actualScore, `numeric mismatch in private case ${caseIndex + 1}`).toBeCloseTo(
  expectedScore,
  10
)
```

Unique name-only matches are excluded from this harness because the approved web workflow requires human confirmation.

- [ ] **Step 3: Run private parity locally**

Run: `npm run test:private`

Expected: exact-identifier score comparisons pass, or the test reports only aggregate failing case numbers. Any mismatch is investigated with local tools that do not echo student content; private data is never added to a commit.

- [ ] **Step 4: Verify the public suite remains independent**

Run:

```powershell
npm test
git status --short
```

Expected: public unit tests pass and no ignored private gradebook appears in Git status.

- [ ] **Step 5: Commit for Sol/max review**

```powershell
git add package.json package-lock.json vitest.config.ts vitest.private.config.ts tests/private/legacy-parity.test.ts
git commit -m "test: add local legacy score parity harness"
```

### Task 10: Implement Wizard State and Threshold-Only Persistence

**Files:**
- Create: `src/app/preferences.ts`
- Create: `src/app/state.ts`
- Create: `tests/unit/preferences.test.ts`
- Create: `tests/unit/state.test.ts`

**Interfaces:**
- Produces: discriminated `AppState` for `canvas`, `assignment-mylab`, `configure`, `review`, and `download` steps.
- Produces: `createInitialState(threshold: number): AppState` and `reduceAppState(state: AppState, action: AppAction): AppState`.
- Produces: `loadThreshold(storage: Pick<Storage, "getItem">): number` and `saveThreshold(storage: Pick<Storage, "setItem">, threshold: number): void`.
- Consumes: parsed documents and review decisions from prior tasks.

Use these state names and ownership boundaries:

```ts
interface BaseState { threshold: number }
export interface CanvasStepState extends BaseState { step: "canvas" }
export interface AssignmentMyLabStepState extends BaseState {
  step: "assignment-mylab"
  canvasFileName: string
  canvas: CanvasGradebook
  selectedAssignmentColumn: number | null
  mylabFileName: string | null
  mylab: MyLabGradebook | null
}
interface ConfiguredData extends BaseState {
  canvasFileName: string
  canvas: CanvasGradebook
  selectedAssignmentColumn: number
  mylabFileName: string
  mylab: MyLabGradebook
  weights: ReadonlyMap<string, number>
}
export interface ConfigureStepState extends ConfiguredData { step: "configure" }
export interface ReviewStepState extends ConfiguredData {
  step: "review"
  matches: readonly StudentMatch[]
  decisions: ReviewDecisions
  review: ReviewModel
}
export interface DownloadStepState extends BaseState {
  step: "download"
  summary: { updated: number; unchanged: number; overrides: number }
}
export type AppState =
  | CanvasStepState
  | AssignmentMyLabStepState
  | ConfigureStepState
  | ReviewStepState
  | DownloadStepState
```

- [ ] **Step 1: Write failing preference tests**

Use a map-backed fake implementing only `getItem` and `setItem`. Assert that missing, nonnumeric, 0, and values over 1 return `DEFAULT_THRESHOLD`; valid `"0.85"` returns `0.85`; and saving writes only key `mylab-canvas.threshold` with no filenames or document data.

- [ ] **Step 2: Write failing state-invalidation tests**

Build a review state with resolved uncertain matches, acknowledgements, and maximum overrides. Require each result-affecting action to return to the appropriate earlier step and discard downstream review/export state:

```ts
expect(reduceAppState(reviewState, {
  type: "threshold-changed",
  threshold: 0.9
})).toMatchObject({
  step: "configure",
  threshold: 0.9
})
```

Cover Canvas replacement, assignment change, MyLab replacement, weight change, threshold change, Back, and Start over. Start over retains only the saved threshold value; it clears filenames, matrices, matches, warnings, acknowledgements, overrides, object URLs, and completion counts.

- [ ] **Step 3: Run the tests and verify the red state**

Run: `npm test -- tests/unit/preferences.test.ts tests/unit/state.test.ts`

Expected: FAIL because the state and preferences modules do not exist.

- [ ] **Step 4: Implement the smallest valid state machine**

Use a discriminated union so later-step fields cannot exist before their inputs. `AppAction` must explicitly represent successful file parse, assignment selection, configuration change, review decisions, download completion, Back, and Reset. Do not store `File` objects after parsing; retain only the display filename in memory and the parsed document.

Every action affecting calculation calls one shared `clearReviewState` helper before returning. No state reducer accesses the DOM or browser storage directly.

Model result-affecting actions explicitly and route them through one invalidation branch:

```ts
export type AppAction =
  | { type: "canvas-loaded"; fileName: string; canvas: CanvasGradebook }
  | { type: "assignment-selected"; columnIndex: number }
  | { type: "mylab-loaded"; fileName: string; mylab: MyLabGradebook }
  | { type: "threshold-changed"; threshold: number }
  | { type: "weight-changed"; sectionKey: string; weight: number }
  | { type: "review-prepared"; matches: readonly StudentMatch[]; decisions: ReviewDecisions; review: ReviewModel }
  | { type: "match-resolved"; mylabRowIndex: number; canvasRowIndex: number | null }
  | { type: "acknowledgement-changed"; kind: "unmatched" | "blank"; checked: boolean }
  | { type: "maximum-override-changed"; canvasRowIndex: number; checked: boolean }
  | { type: "download-completed"; summary: DownloadStepState["summary"] }
  | { type: "back" }
  | { type: "reset" }

case "threshold-changed":
case "weight-changed":
  return clearReviewState(applyConfigurationChange(state, action))
```

- [ ] **Step 5: Verify state and storage isolation**

Run:

```powershell
npm test -- tests/unit/preferences.test.ts tests/unit/state.test.ts
npm run typecheck
```

Expected: all state transitions pass and no test state survives Reset except threshold.

- [ ] **Step 6: Commit for Sol/max review**

```powershell
git add src/app/preferences.ts src/app/state.ts tests/unit/preferences.test.ts tests/unit/state.test.ts
git commit -m "feat: add safe wizard state transitions"
```

### Task 11: Build the Accessible Shell and Canvas Upload Step

**Files:**
- Modify: `src/main.ts`
- Modify: `src/ui/styles.css`
- Create: `src/app/controller.ts`
- Create: `src/ui/dom.ts`
- Create: `src/ui/app-view.ts`
- Create: `src/ui/components/file-picker.ts`
- Create: `src/ui/components/notice.ts`
- Create: `src/ui/components/step-indicator.ts`
- Create: `src/ui/views/canvas-upload.ts`
- Create: `tests/e2e/canvas-upload.spec.ts`

**Interfaces:**
- Produces: `AppController.start(): void` as the single composition entry.
- Produces: `renderApp(root: HTMLElement, state: AppState, handlers: AppHandlers): void`.
- Produces: reusable file-picker, notice, and step-indicator elements built with safe DOM APIs.
- Consumes: `parseCsvFile`, `parseCanvasGradebook`, state transitions, and threshold preferences.

Use one stable handler contract across all views:

```ts
export interface AppHandlers {
  selectCanvasFile(file: File): Promise<void>
  selectAssignment(columnIndex: number): void
  selectMyLabFile(file: File): Promise<void>
  setThreshold(percent: number): void
  setWeight(sectionKey: string, weight: number): void
  resolveMatch(mylabRowIndex: number, canvasRowIndex: number | null): void
  setAcknowledgement(kind: "unmatched" | "blank", checked: boolean): void
  setMaximumOverride(canvasRowIndex: number, checked: boolean): void
  continue(): void
  back(): void
  download(): void
  reset(): void
}
```

- [ ] **Step 1: Refresh and record the Mobbin UI reference before coding**

Call Mobbin MCP `search_flows` twice with platform `web`, JPEG images, and the same task intent:

```text
Design an accessible Penn State Canvas gradebook web app for older professors using manual Canvas and MyLab CSV uploads, score review, and Canvas CSV download.
```

Use queries `Toggl Track importing data with CSV upload and confirmation` and `Bonsai importing a CSV with file requirements preview and row errors`. Inspect the returned images rather than relying on metadata. Record implementation notes in the task commentary: one centered work surface, short “How it works” text, a large file target with a visible choose-file button, generous whitespace, and no product sidebar.

- [ ] **Step 2: Write the failing browser test for step one**

Create `tests/e2e/canvas-upload.spec.ts`:

```ts
import { expect, test } from "@playwright/test"

test("validates and accepts a Canvas gradebook", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Prepare your Canvas gradebook" })).toBeVisible()
  await expect(page.getByText("Step 1 of 5: Upload Canvas gradebook")).toBeVisible()

  await page.getByLabel("Canvas gradebook CSV").setInputFiles(
    "tests/fixtures/anonymized/canvas-valid.csv"
  )

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
```

- [ ] **Step 3: Run the browser test and verify the red state**

Run: `npm run test:e2e -- tests/e2e/canvas-upload.spec.ts`

Expected: FAIL because the wizard UI and controller do not exist.

- [ ] **Step 4: Implement safe DOM helpers and the shell**

`src/ui/dom.ts` must expose helpers that assign untrusted text only through `textContent`. It may set known static attributes, but it must not accept or assign HTML strings. Add `focusAlert(container)` and a polite status live-region helper.

The shell contains:

```html
<header aria-label="Application header">...</header>
<nav aria-label="Progress">...</nav>
<main id="main-content" tabindex="-1">...</main>
<p role="status" aria-live="polite" aria-atomic="true"></p>
```

Render all five step names in the progress component, marking the current item with `aria-current="step"`. Use `Step 1 of 5: Upload Canvas gradebook` as visible text; do not use an unlabeled row of dots.

- [ ] **Step 5: Implement Canvas selection and validation**

The file picker uses both `<input type="file" accept=".csv,text/csv">` and a drop target, with the label `Canvas gradebook CSV`. Dropping is an additional option, not the only path. While the worker parses, disable Continue and show `Checking your Canvas gradebook…` in the status region.

On success, render only the filename and aggregate counts; do not list student names. On failure, render the parser's plain-language message in a focusable `role="alert"`. The controller dispatches `canvas-loaded` only after generic and Canvas validation both succeed.

Use these CSS tokens as the initial visual baseline:

```css
:root {
  color: #172033;
  background: #f5f7fa;
  font: 18px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif;
  --navy: #001e44;
  --blue: #1e407c;
  --focus: #f2b900;
  --danger: #b42318;
  --surface: #ffffff;
  --border: #c8d1dc;
}

button,
input,
select {
  min-height: 44px;
  font: inherit;
}

:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 3px;
}
```

Keep the task surface centered at a readable maximum width and avoid a dashboard sidebar.

- [ ] **Step 6: Verify step one in the production build**

Run:

```powershell
npm run test:e2e -- tests/e2e/canvas-upload.spec.ts
npm run typecheck
```

Expected: both browser cases pass against Vite preview, and the page has no console errors.

- [ ] **Step 7: Commit for Sol/max review**

```powershell
git add src/main.ts src/app/controller.ts src/ui tests/e2e/canvas-upload.spec.ts
git commit -m "feat: add accessible Canvas upload step"
```

The Sol/max reviewer must inspect a screenshot and compare it with the refreshed Toggl and Bonsai images before accepting this task.

### Task 12: Add Assignment, MyLab, and Grading Configuration Steps

**Files:**
- Modify: `src/app/controller.ts`
- Modify: `src/ui/app-view.ts`
- Modify: `src/ui/styles.css`
- Create: `src/ui/views/assignment-mylab.ts`
- Create: `src/ui/views/configure.ts`
- Create: `tests/e2e/configure.spec.ts`

**Interfaces:**
- Produces: step-two assignment selection and MyLab upload callbacks.
- Produces: step-three threshold and section-weight callbacks.
- Consumes: parsed Canvas assignments, `parseMyLabGradebook`, detected weights, score functions, and state invalidation.

- [ ] **Step 1: Write the failing step-two and step-three workflow test**

Create `tests/e2e/configure.spec.ts` and upload the anonymized Canvas fixture. Then require:

```ts
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
```

Change the threshold to 90 and verify the plain-language example and calculated preview update. Enter a negative weight and verify Continue is disabled with an adjacent error. Set a weight to zero and verify a warning appears while Continue remains available.

- [ ] **Step 2: Run the test and verify the red state**

Run: `npm run test:e2e -- tests/e2e/configure.spec.ts`

Expected: FAIL because steps two and three are not rendered.

- [ ] **Step 3: Implement assignment selection and MyLab upload**

Render each Canvas option as `Assignment name — N points`; its value is the decimal column index. When the uploaded Canvas file has one assignment, preselect it but keep the control visible. Include an expandable `How to download this file` disclosure with concise Penn State Canvas and MyLab export directions; it must not mention tokens or API access.

Use the shared file picker for MyLab. Show section and student counts on success. For an unsupported layout, focus an alert beginning `This does not look like the supported MyLab gradebook.` Replacing either file dispatches the appropriate state action and removes later decisions.

- [ ] **Step 4: Implement editable weights and threshold**

Use `<input type="number">` controls with visible labels. The threshold has `min="1"`, `max="100"`, and `step="1"`; convert the displayed percentage to the decimal domain value. Weight inputs have `min="0"` and `step="any"`.

Below the controls, show:

```text
At 80%, a MyLab score of 45% receives a 20% bonus, rounds up to 70%, and earns 7 of 10 points.
```

Generate the sentence from the actual threshold and the first nonzero section weight; do not hard-code its numeric result. Show the maximum add-on as the unrounded sum of current weights. Save only a valid threshold through `preferences.ts`.

- [ ] **Step 5: Verify input, Back, and replacement behavior**

Run:

```powershell
npm run test:e2e -- tests/e2e/configure.spec.ts
npm test -- tests/unit/state.test.ts tests/unit/mylab.test.ts tests/unit/score.test.ts
```

Expected: the browser test and affected unit suites pass. Back preserves valid earlier files; replacing an earlier file clears later selections and decisions.

- [ ] **Step 6: Commit for Sol/max review**

```powershell
git add src/app/controller.ts src/ui/app-view.ts src/ui/styles.css src/ui/views/assignment-mylab.ts src/ui/views/configure.ts tests/e2e/configure.spec.ts
git commit -m "feat: add MyLab grading configuration"
```

### Task 13: Implement the Score Review and Safety Decisions

**Files:**
- Modify: `src/app/controller.ts`
- Modify: `src/ui/app-view.ts`
- Modify: `src/ui/styles.css`
- Create: `src/ui/components/review-table.ts`
- Create: `src/ui/views/review.ts`
- Create: `tests/e2e/review.spec.ts`

**Interfaces:**
- Produces: status summary cards, filter controls, expandable score details, match-resolution controls, acknowledgements, and over-maximum overrides.
- Consumes: `buildReviewModel` and dispatches only explicit `ReviewDecisions` changes.

- [ ] **Step 1: Write a failing safety-critical browser test**

Use a purpose-built anonymized fixture set containing an exact match, one unique name suggestion, one unmatched student, blank Canvas and MyLab scores, and an over-maximum result. Assert:

```ts
await expect(page.getByText("Step 4 of 5: Review scores")).toBeVisible()
await expect(page.getByRole("heading", { name: "Review before downloading" })).toBeVisible()
await expect(page.getByText("1 match needs confirmation")).toBeVisible()
await expect(page.getByRole("button", { name: "Continue to download" })).toBeDisabled()
```

Confirm the suggested Canvas student through a labeled radio control, acknowledge unmatched and blank-score warnings, and verify the button remains disabled until the specific over-maximum row's `Include this score above the assignment maximum` checkbox is selected.

Add a test rejecting the suggestion and proving the corresponding original Canvas cell remains unchanged. Add a test that changing threshold after review clears all confirmations, acknowledgements, and overrides.

- [ ] **Step 2: Run the test and verify the red state**

Run: `npm run test:e2e -- tests/e2e/review.spec.ts`

Expected: FAIL because the review view does not exist.

- [ ] **Step 3: Render summaries and progressive row details**

Show five labeled summary cards: Confirmed, Needs confirmation, Unmatched, Blank scores, and Above maximum. Each card includes an icon plus text; color is supplementary. Add status filter buttons with `aria-pressed` and a search field that filters only already-rendered display names without logging the query.

The desktop table columns are Student, Match, Current Canvas, MyLab add-on, New Canvas, and Status. Put per-section raw/adjusted values inside a native `<details>` region in the Student cell. At tablet width, render the same semantics as stacked labeled cards instead of requiring a viewport-wide horizontal scroll.

- [ ] **Step 4: Render explicit decisions and focus behavior**

Unique and ambiguous name suggestions, plus duplicate-identifier matches, list candidate Canvas names as radio controls plus `Leave unchanged`. A unique exact identifier match needs no confirmation. Unmatched rows have no match selector.

Use one checkbox for acknowledging all unmatched/rejected rows and one for all blank-score rows. Place the over-maximum checkbox inside each affected row. Updating any control rebuilds the pure review model and rerenders while restoring focus to the triggering control by stable row key.

If Continue is attempted with blockers, focus a `role="alert"` summary containing links to the first unresolved section. Never insert a student value through `innerHTML`; every cell uses `textContent`.

Construct untrusted cells only through the safe helper:

```ts
const nameCell = document.createElement("th")
nameCell.scope = "row"
nameCell.textContent = reviewRow.studentDisplayName
rowElement.append(nameCell)
```

- [ ] **Step 5: Verify every safety path**

Run:

```powershell
npm run test:e2e -- tests/e2e/review.spec.ts
npm test -- tests/unit/review-policy.test.ts tests/unit/state.test.ts
```

Expected: all review paths pass, including reject/unchanged behavior and stale-decision invalidation.

- [ ] **Step 6: Commit for Sol/max review**

```powershell
git add src/app/controller.ts src/ui/app-view.ts src/ui/styles.css src/ui/components/review-table.ts src/ui/views/review.ts tests/fixtures/anonymized tests/e2e/review.spec.ts
git commit -m "feat: add guarded score review workflow"
```

### Task 14: Add Download, Reset, Privacy Enforcement, and Vercel Configuration

**Files:**
- Modify: `src/app/controller.ts`
- Modify: `src/ui/app-view.ts`
- Modify: `src/ui/styles.css`
- Create: `src/ui/download-file.ts`
- Create: `src/ui/views/download.ts`
- Create: `vercel.json`
- Create: `tests/unit/vercel-config.test.ts`
- Create: `tests/e2e/workflow.spec.ts`

**Interfaces:**
- Produces: `downloadCsv(contents: string, filename: string): void` with object-URL cleanup.
- Produces: step-five completion summary, Canvas import guidance, and Start over.
- Consumes: the allowed review model, score-update map, and Canvas exporter.

- [ ] **Step 1: Write the failing complete-workflow download test**

Drive both fixture uploads, configuration, and every required review decision. Start waiting before clicking:

```ts
const downloadPromise = page.waitForEvent("download")
await page.getByRole("button", { name: "Download gradebook" }).click()
const download = await downloadPromise

expect(download.suggestedFilename()).toMatch(
  /^canvas-gradebook-updated-\d{4}-\d{2}-\d{2}\.csv$/
)
expect(await download.failure()).toBeNull()
await download.saveAs(testInfo.outputPath(download.suggestedFilename()))
```

Parse the saved download and assert only the selected assignment cells for confirmed rows differ. Click Start over and assert the UI returns to Step 1, file inputs are empty, and the prior student's name is absent from the DOM.

- [ ] **Step 2: Write the failing browser privacy test**

After initial page assets finish loading, observe requests while uploading and processing both files. Assert there are no requests at all after the files are selected. Inspect `localStorage` and assert:

```ts
expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({
  "mylab-canvas.threshold": "0.8"
})
```

Also collect console events and fail if a fixture name, synthetic email, numeric grade row, or CSV fragment appears.

- [ ] **Step 3: Run the tests and verify the red state**

Run: `npm run test:e2e -- tests/e2e/workflow.spec.ts`

Expected: FAIL because download and completion are not implemented.

- [ ] **Step 4: Implement safe download and reset**

Create a Blob with MIME type `text/csv;charset=utf-8`, create an object URL, click a temporary anchor with the approved filename, remove the anchor, and revoke the object URL on the next macrotask. Do not retain the CSV string after the state transitions to completion.

Implement the download primitive as:

```ts
export function downloadCsv(contents: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
```

The final screen displays aggregate Updated, Unchanged, and Overrides counts, then concise Canvas import steps. Start over revokes any remaining URL, dispatches Reset, and focuses the Step 1 heading.

- [ ] **Step 5: Add deterministic Vercel settings and restrictive headers**

Create `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; worker-src 'self' blob:; manifest-src 'self'"
        },
        { "key": "Referrer-Policy", "value": "no-referrer" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

The `worker-src 'self' blob:` exception is required for Papa Parse worker mode. `connect-src 'none'` enforces the no-upload promise. No SPA rewrite is needed because all steps share one URL and reload intentionally clears state.

Create `tests/unit/vercel-config.test.ts` to parse `vercel.json` and assert `framework`, `outputDirectory`, `connect-src 'none'`, `worker-src 'self' blob:`, `X-Frame-Options`, and the absence of rewrites/functions.

- [ ] **Step 6: Validate with Vercel MCP when available**

Search the execution session's available tools for Vercel MCP. If present, use it read-only to verify that the project is recognized as Vite, build command is `npm run build`, output is `dist`, and no Functions or environment secrets are configured. Do not deploy.

If Vercel MCP is not exposed, record `Vercel MCP unavailable in this session` in the review evidence, run the local production build, and have the Sol/max reviewer compare `vercel.json` with current official Vercel Vite documentation obtained through Context7.

- [ ] **Step 7: Verify download, privacy, and configuration**

Run:

```powershell
npm test -- tests/unit/export.test.ts tests/unit/vercel-config.test.ts
npm run test:e2e -- tests/e2e/workflow.spec.ts
npm run build
```

Expected: selected-cell checks, privacy assertions, reset behavior, configuration assertions, and the production build all pass.

- [ ] **Step 8: Commit for Sol/max review**

```powershell
git add src/app/controller.ts src/ui/app-view.ts src/ui/styles.css src/ui/download-file.ts src/ui/views/download.ts vercel.json tests/unit/vercel-config.test.ts tests/e2e/workflow.spec.ts
git commit -m "feat: add private gradebook download workflow"
```

### Task 15: Complete Accessibility, Mobbin Fidelity, Bundle Budget, and Documentation

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `src/ui/styles.css`
- Create: `scripts/check-bundle-size.mjs`
- Create: `tests/e2e/accessibility.spec.ts`
- Create: `tests/e2e/docs-screenshots.spec.ts`
- Create: `docs/images/web-upload-canvas.png`
- Create: `docs/images/web-review-scores.png`
- Create: `docs/images/web-download-complete.png`

**Interfaces:**
- Produces: `npm run check:size` with a 150 KiB gzipped JavaScript budget.
- Produces: repeatable anonymized documentation screenshots.
- Produces: final user and developer instructions with no authentication path.

- [ ] **Step 1: Write failing automated accessibility checks**

Create `tests/e2e/accessibility.spec.ts` and run every populated wizard step through axe:

```ts
const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
  .analyze()

expect(results.violations).toEqual([])
```

Add keyboard-only tests for skip link, file controls, Back/Continue, disclosures, match radio controls, warning acknowledgements, and Download. Verify focus reaches the alert after errors and the heading after step changes. At 200% browser zoom and at 1024-by-768, assert no primary control is clipped and the review card alternative remains operable.

- [ ] **Step 2: Run the accessibility tests and verify the red state**

Run: `npm run test:e2e -- tests/e2e/accessibility.spec.ts`

Expected: at least one assertion exposes remaining semantics, focus, target-size, contrast, or responsive defects.

- [ ] **Step 3: Fix the concrete accessibility and responsive failures**

Modify semantic markup or the single stylesheet only in response to the failing assertions. Maintain 18px body text, 44px minimum controls, a three-pixel visible focus ring, text-plus-icon statuses, reduced-motion support, and a card alternative below the table breakpoint. Add `@media (prefers-reduced-motion: reduce)` that removes nonessential transitions.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

Run: `npm run test:e2e -- tests/e2e/accessibility.spec.ts`

Expected: all automated and keyboard checks pass. Record manual checks for reading order, warning comprehension, 200% zoom, and screen-reader announcements because axe cannot prove those qualities alone.

- [ ] **Step 4: Enforce the lightweight bundle budget**

Create a dependency-free Node script that recursively reads `dist/assets/*.js`, gzip-compresses each file with `node:zlib`, totals the byte lengths, prints only the aggregate, and exits nonzero above `150 * 1024` bytes.

```js
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return javascriptFiles(path)
    return entry.isFile() && entry.name.endsWith(".js") ? [path] : []
  }))
  return nested.flat()
}

const limit = 150 * 1024
const files = await javascriptFiles("dist/assets")
const total = (await Promise.all(files.map(async (file) =>
  gzipSync(await readFile(file)).byteLength
))).reduce((sum, bytes) => sum + bytes, 0)

console.log(`JavaScript gzip total: ${(total / 1024).toFixed(1)} KiB (limit: 150 KiB)`)
if (total > limit) process.exitCode = 1
```

Add:

```json
"check:size": "npm run build && node scripts/check-bundle-size.mjs"
```

Run: `npm run check:size`

Expected: `JavaScript gzip total: N KiB (limit: 150 KiB)` and exit code 0.

- [ ] **Step 5: Recheck the finished frontend against Mobbin**

Call the same two Mobbin MCP searches and identical task intent from Task 11. Inspect the images again. Capture local screenshots at 1440-by-1000 for the populated upload, review, and completion steps. The Spark worker records a short comparison in the task handoff covering:

- Toggl: one calm task surface, concise explanation, large upload target, explicit counts before continuing.
- Bonsai: file requirements before upload, sample/score preview, row-specific actionable errors.
- Deliberate deviations: larger type and controls, persistent five-step labels, stronger warning review, and no sidebar for the older professor audience.

The Sol/max reviewer must use Mobbin MCP itself, inspect the actual returned images, inspect the three local screenshots, and reject the task if the UI has drifted into a dense dashboard, tiny controls, unclear hierarchy, or decorative complexity.

- [ ] **Step 6: Generate safe screenshots and rewrite the README**

`tests/e2e/docs-screenshots.spec.ts` loads only anonymized fixtures and writes the three named PNG files. Add this script and ensure no screenshot includes a private file path or real data:

```json
"docs:screenshots": "npm run build && playwright test tests/e2e/docs-screenshots.spec.ts --project=chromium"
```

Capture each stable state with animations disabled:

```ts
await page.screenshot({
  path: "docs/images/web-upload-canvas.png",
  animations: "disabled",
  fullPage: true
})
```

Repeat with the approved anonymized review and completion states for the other two filenames.

Rewrite `README.md` to include:

- purpose and privacy promise;
- the five-step workflow with the new screenshots;
- Canvas and MyLab download prerequisites;
- threshold, weight, blank-score, match, and over-maximum behavior;
- Canvas import-preview guidance;
- local Node 24 setup and every test/build command;
- static Vercel configuration without deploying;
- current format limitations and the manual Canvas import release check;
- a clear unofficial-project disclaimer.

Retain the already-sanitized historical slide images only if they support a short Legacy CLI Guide section. Remove all token, API-key, authentication, Conda, and CLI-as-primary-workflow instructions.

- [ ] **Step 7: Run the complete verification matrix**

Run:

```powershell
npm ci
npm run typecheck
npm test
npm run test:coverage
npm run test:e2e
npm run test:e2e:edge
npm run check:size
npm run docs:screenshots
npm run build
rg -n -i "access token|api key|oauth|canvas api|inquirer" README.md src index.html vercel.json
git status --short
```

Expected:

- all type, unit, coverage, Chromium, Edge, tablet, accessibility, workflow, privacy, bundle, screenshot, and build commands pass;
- the final `rg` command finds no authentication guidance in the web application or README;
- Git status contains only the intended documentation and screenshot changes;
- no private CSV, comparison directory, or PowerPoint file is staged.

- [ ] **Step 8: Commit for final Sol/max review**

```powershell
git add package.json package-lock.json README.md src/ui/styles.css scripts/check-bundle-size.mjs tests/e2e/accessibility.spec.ts tests/e2e/docs-screenshots.spec.ts docs/images/web-upload-canvas.png docs/images/web-review-scores.png docs/images/web-download-complete.png
git commit -m "docs: complete accessible browser workflow"
```

The final Sol/max reviewer must inspect the full diff from commit `00f5988`, rerun the complete verification matrix, compare frontend screenshots to fresh Mobbin results, confirm that only threshold preference is persisted, confirm no post-upload requests occur, and verify selected-cell-only CSV output before declaring implementation complete.

## Current Documentation References

- [Vite guide](https://github.com/vitejs/vite/blob/main/docs/guide/index.md)
- [Vitest guide](https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md)
- [Papa Parse documentation](https://www.papaparse.com/docs)
- [Playwright web server documentation](https://playwright.dev/docs/test-webserver)
- [Playwright download documentation](https://playwright.dev/docs/downloads)
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)
- [Vercel Vite documentation](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json)
