# MyLab to Canvas Gradebook Web App Design

**Date:** 2026-09-05  
**Status:** Approved for implementation planning
**Working product name:** MyLab to Canvas Gradebook

## Summary

Convert the existing Python grading utility into a small, static web application for Penn State mathematics instructors. The application accepts a Canvas gradebook CSV and a MyLab gradebook CSV, applies the existing bonus-and-round-up calculation with a user-selected threshold, lets the instructor review every match and warning, and downloads an updated Canvas-compatible gradebook CSV.

The application will not connect to Canvas, request credentials, or contain authentication. All uploaded data and grade calculations remain in the browser. Vercel serves only static HTML, CSS, and JavaScript.

## Goals

- Make the workflow comfortable for instructors who are unfamiliar with technical tools, including users over age 60.
- Replace command-line prompts and fixed filenames with a guided five-step browser workflow.
- Preserve the current grade adjustment formula while making the full-credit threshold editable.
- Detect MyLab sections and their weights, then allow the instructor to correct those weights before calculation.
- Protect grades by requiring review of uncertain matches, unmatched students, blank scores, and scores above the Canvas assignment maximum.
- Produce a Canvas-compatible CSV without changing unrelated gradebook content.
- Keep the application lightweight, fast, and suitable for static Vercel deployment.

## Non-goals

- Canvas API access, Penn State login, personal access tokens, OAuth, or direct grade submission.
- Support for institutions other than Penn State.
- User accounts, databases, cloud file storage, analytics, or server-side processing.
- Supporting every historical or future MyLab export layout in the first release.
- Editing unrelated Canvas assignments or acting as a general-purpose gradebook editor.
- Reproducing Penn State branding or implying that the application is an official Penn State service.

## Existing Behavior to Preserve

The existing `grading-script.py` performs four domain operations that the web application must preserve:

1. Read a Canvas gradebook export and identify a target assignment column.
2. Read the current MyLab export layout and obtain section weights.
3. Match MyLab students to Canvas students, primarily through Penn State email identifiers.
4. Add the adjusted MyLab total to the existing Canvas assignment score and round the result to one decimal place.

The web version replaces the current hard-coded 80% threshold with one instructor-selected global threshold, defaulting to 80%.

### Score Formula

For each MyLab section:

- `r` is the student's raw section score as a decimal from 0 through 1.
- `t` is the selected full-credit threshold as a decimal from 0 through 1.
- `b = 1 - t` is the bonus.
- `w` is the section's maximum point weight.

The adjusted section score is:

```text
if r >= t:
    adjusted = w
otherwise:
    adjusted = w * ceil((r + b) * 10) / 10
```

The student's MyLab add-on is the sum of all adjusted section scores. The exported Canvas score is:

```text
round(existing Canvas score + MyLab add-on, 1)
```

This intentionally preserves the current behavior: the bonus is applied before rounding up to the next tenth. A raw zero therefore receives the formula's bonus; the review screen must make that result visible rather than silently changing it.

## Product Flow

The application uses a linear five-step wizard. Each screen has one clear primary action, a visible Back action after the first step, and a labeled progress indicator.

### 1. Upload Canvas Gradebook

The first screen explains the whole task in three short lines and states that files stay on the user's device.

The user selects or drops a CSV exported from the Penn State Canvas Gradebook. File selection cannot depend on drag and drop; a large **Choose Canvas CSV** button is always available.

The application validates:

- the file can be parsed as CSV;
- Canvas identity columns such as `Student` and `SIS Login ID` exist;
- at least one editable assignment column exists;
- Canvas metadata rows needed for a safe round trip are present;
- duplicate student identifiers are called out;
- the file is no larger than 25 MB.

After validation, the screen shows the filename, student count, assignment count, and a clear success message. It does not display student names at this stage.

### 2. Choose Assignment and Upload MyLab

The user selects the Canvas assignment to update from a large labeled control. Each choice includes the assignment name and points possible when that information is available in the Canvas export.

The same screen then asks for the MyLab CSV. It includes a short expandable guide showing where to download the file and what kind of export is expected.

The application initially supports the MyLab layout represented by the repository's existing files. It validates the expected identity, score, and weight metadata before continuing. An unsupported layout produces a specific explanation and does not attempt a best-effort import that could change grades incorrectly.

### 3. Configure Grading

The application detects MyLab sections and their point weights. The instructor can edit each detected weight using a numeric text field.

The full-credit threshold is one global percentage:

- default: 80%;
- valid range: 1% through 100%;
- step: 1%;
- entered through a numeric field, not a slider alone;
- remembered on the same browser as a non-sensitive preference.

The screen explains the calculation in plain language and shows one live example using the selected threshold. It also displays the maximum possible MyLab add-on, equal to the sum of the section weights.

Invalid or negative weights block continuation. A zero weight is allowed but receives a warning. The detected weights do not have to sum to 100 because they represent points added to the selected Canvas assignment rather than percentages of a standalone course grade.

### 4. Review Scores

This is the safety-critical screen. It begins with summary cards for:

- confirmed matches;
- matches needing confirmation;
- unmatched MyLab students;
- blank Canvas scores treated as zero;
- calculated scores above the Canvas assignment maximum.

Student matching follows this order:

1. Exact normalized Penn State email or SIS Login ID match.
2. A normalized name comparison may create a suggestion only.
3. Every suggested name match requires explicit instructor confirmation.
4. Unmatched students remain unchanged in the Canvas output.

The detailed table shows the student, match status, existing Canvas score, adjusted MyLab total, new Canvas score, and any warning. Raw section details are available through an expandable row so the default table remains readable.

Review rules are explicit:

- A blank Canvas score is treated as `0.0` and visibly flagged.
- A blank numeric MyLab score is treated as zero, receives the normal formula bonus, and is visibly flagged.
- Non-numeric MyLab score content is an error and blocks export for that row until the file is corrected.
- Duplicate Canvas or MyLab identifiers block automatic matching.
- An unmatched student does not alter the Canvas file.
- A new score above the Canvas assignment's points possible is blocked by default. The instructor may include it only through a separate, explicit override after reviewing the affected students.
- The instructor must acknowledge all remaining unmatched students and blank-score warnings before download is enabled.

No score is written back to the uploaded Canvas representation until the review rules pass.

### 5. Download Updated Canvas Gradebook

The final screen summarizes the number of updated, unchanged, and overridden rows. The primary action downloads an updated full Canvas gradebook CSV named:

```text
canvas-gradebook-updated-YYYY-MM-DD.csv
```

The exporter preserves the original Canvas column order, metadata rows, unrelated assignment values, and student rows. It changes only the selected assignment cells for confirmed matches. The output preserves every cell value and remains valid CSV, although the serializer may normalize optional quote placement and line endings.

The screen provides brief steps for importing the CSV back into Canvas and reminds the instructor to review Canvas's import preview before accepting changes. A **Start over** action clears all in-memory file data and returns to step one.

## Information Architecture and Visual Direction

The primary Mobbin reference is [Toggl Track's CSV import flow](https://mobbin.com/flows/6e48fb04-4d0a-46ef-b7dd-c30dc2fc1eeb). Its useful qualities are the single-purpose work surface, short explanation before upload, generous drop zone, and explicit count before confirmation.

[Bonsai's CSV import flow](https://mobbin.com/flows/75528a02-5c95-4904-abb0-4859948a3906) is a secondary reference for file requirements, sample data preview, and row-specific validation errors. Its full application sidebar and dense settings shell will not be copied.

The web application uses:

- one centered task panel rather than a dashboard or sidebar;
- a restrained Penn State-inspired navy and blue palette without official marks;
- a system font stack with at least 18px body text;
- controls at least 44px tall with generous spacing;
- high-contrast status text and icons, never color alone;
- persistent step labels such as **1 of 5: Upload Canvas Gradebook**;
- plain-language labels such as **Choose file**, **Review warnings**, and **Download gradebook**;
- restrained motion and no decorative animation that delays work;
- a usable tablet layout, while optimizing the grade review table for desktop Chrome and Edge.

## Technical Architecture

### Deployment Model

The application is a fully static client application built with:

- semantic HTML;
- modern CSS;
- vanilla TypeScript;
- Vite for development and production builds;
- Papa Parse as the only planned runtime dependency for robust CSV parsing and generation.

There is no Vercel Function, backend, authentication service, database, or API proxy. Vercel serves the generated static assets from `dist/`.

No external font, icon, analytics, or telemetry request is required. Small interface icons should be inline SVGs or CSS so uploaded grade data cannot be exposed through third-party browser requests.

### Proposed Module Boundaries

```text
src/
  app/
    controller.ts          Wizard transitions and orchestration
    state.ts               In-memory session state and reset behavior
  domain/
    types.ts               Parsed rows, matches, warnings, and results
    score-calculator.ts    Pure bonus, rounding, and total functions
    student-matcher.ts     Exact matches and review-only suggestions
  csv/
    canvas-parser.ts       Canvas layout detection and validation
    mylab-parser.ts        Supported MyLab layout detection and validation
    canvas-exporter.ts     Structure-preserving Canvas CSV generation
  ui/
    views/                 One focused view per wizard step
    components/            File picker, notices, summary cards, review table
    styles/                Tokens, layout, components, and accessibility states
  main.ts                  Browser entry point
```

Each domain and CSV module exposes typed inputs and outputs and does not access the DOM. This keeps calculations testable and prevents the interface from becoming coupled to a particular CSV layout.

### Data Flow

```text
Canvas CSV ──> Canvas parser ──> preserved original rows + normalized students
                                                │
MyLab CSV ───> MyLab parser ──> sections + normalized students
                                                │
                                    matcher + score calculator
                                                │
                                         review model
                                                │
                                  confirmed updates only
                                                │
                                      Canvas CSV exporter
```

The original parsed Canvas structure is retained separately from normalized calculation data. The exporter applies a small update map to that preserved structure; it does not reconstruct the entire gradebook from normalized objects.

### Browser Storage and Privacy

- Canvas and MyLab file contents exist only in JavaScript memory for the open page.
- File contents, student names, identifiers, and grades are never placed in `localStorage`, `sessionStorage`, IndexedDB, URLs, logs, or error-reporting services.
- Reloading or closing the page discards the uploaded data.
- Only non-sensitive interface preferences, initially the last threshold value, may be stored in `localStorage`.
- A strict Content Security Policy should permit only same-origin application resources.
- The production page must state accurately that processing happens locally in the browser.

### Performance

- Keep production JavaScript small by avoiding a component framework and large UI libraries.
- Parse CSV files asynchronously; use Papa Parse's worker mode when supported so large gradebooks do not freeze the page.
- Render the review table progressively if necessary, while keeping search and status filters responsive.
- Do not load the detailed per-section view until a row is expanded.
- Establish a measurable production bundle budget during implementation planning.

## Error Handling

Errors appear next to the affected control and in a short summary at the top of the current step. Focus moves to the summary after a failed Continue action. Messages identify what happened and what the instructor can do next.

Examples:

- **This does not look like a Canvas gradebook.** Download a new CSV from Canvas Gradebook and try again.
- **We could not find MyLab section weights.** This version supports the MyLab layout shown in the download guide.
- **Three students need your review.** Confirm the suggested matches or leave those Canvas grades unchanged.
- **Two calculated scores are above 25 points.** Review those students before choosing whether to include the higher scores.

The application never reports a partial download as successful. Unexpected parser or calculation failures preserve the selected files in memory so the instructor can read the error without starting over.

## Accessibility Requirements

- Meet WCAG 2.2 AA color contrast and interaction requirements.
- Complete the entire workflow with a keyboard.
- Use native form controls and semantic landmarks wherever possible.
- Provide visible focus states and a skip link.
- Associate every input, table, status, error, and help disclosure with a programmatic label.
- Announce upload, validation, and calculation status through a restrained live region.
- Do not auto-advance steps, reset inputs unexpectedly, or rely on time-limited messages.
- Keep instructions short, concrete, and available again at the point of need.
- Provide a responsive alternative to the wide review table on tablets.

## Testing Strategy

### Unit Tests

- Formula boundaries below, at, and above the selected threshold.
- Dynamic bonus values for several thresholds.
- Upward tenth rounding and final one-decimal rounding.
- Blank and zero score behavior.
- Section weight totals and validation.
- Exact email/SIS matching, normalized identifiers, name suggestions, duplicates, and unmatched users.
- Assignment maximum checks and override rules.
- CSV quoting and preservation of untouched cells.

### Fixture and Golden-File Tests

- Use the existing Canvas, MyLab, and comparison files locally to establish parity with the Python output.
- Do not publish those files or copy their student data into committed tests.
- Create anonymized fixtures that retain the same row and metadata structure.
- Use historical generated files only to investigate numeric score parity. They are not whole-file golden outputs because some contain Pandas-generated identifier and index-column changes that the web exporter must not reproduce.
- Compare exported files against approved anonymized fixtures cell-for-cell, requiring that only confirmed cells in the selected assignment differ. Byte-for-byte comparison is not required because optional CSV quote placement and line endings may be normalized.

### Browser Tests

- Exercise the complete five-step upload, configure, review, and download workflow in Chrome and Edge.
- Cover keyboard navigation, focus placement, validation messages, file replacement, Back behavior, and Start over.
- Intercept network activity during file processing and assert that no uploaded content is transmitted.
- Test the desktop layout and a representative tablet viewport.

### Canvas Compatibility Check

The application no longer needs a Canvas token and can be tested end to end through CSV generation. Automated tests can verify the exported structure, but the final import-preview check in a real Penn State Canvas course remains a manual release check when an authorized test course is available.

## Documentation Changes

After implementation:

- Rewrite `README.md` around the browser workflow rather than Python installation and token prompts.
- Add screenshots of the new five-step interface.
- Retain only safe, non-sensitive images from the historical slide deck.
- Document how to download a Canvas gradebook, download a MyLab gradebook, select the threshold, review warnings, and import the result.
- State prominently that the application is unofficial and that uploaded files are processed locally.
- Remove token-generation instructions from user-facing documentation.

## Migration and Code Polish

The current Python script remains a behavioral reference while the pure TypeScript domain modules are built and tested. The web implementation should correct known structural weaknesses rather than transliterate them:

- separate parsing, matching, scoring, export, and UI concerns;
- replace broad exception handling with typed validation results;
- remove hard-coded filenames and row assumptions from calculation code;
- prevent unmatched MyLab rows from reusing a previous student's Canvas score;
- make cancellation and invalid-file states explicit;
- avoid executing application behavior on module import;
- preserve original CSV structure through an update map rather than positional mutation;
- make every inferred match visible and reversible.

After parity and acceptance testing, the legacy script can be labeled as deprecated. Removing it is a separate decision and is not required for the first web release.

## Acceptance Criteria

The design is implemented successfully when:

1. An instructor can complete the workflow without installing software or entering Canvas credentials.
2. Both uploaded CSV files remain entirely in the browser.
3. The default 80% calculation matches the existing Python formula on approved fixtures.
4. The instructor can select a different global threshold and see recalculated results before download.
5. Exact matches are automatic; suggested name matches require confirmation; unmatched students remain unchanged.
6. Blank scores and over-maximum results cannot pass unnoticed.
7. Only confirmed cells in the selected Canvas assignment change in the exported gradebook.
8. The output passes automated structure checks and a manual Canvas import-preview check before release.
9. The workflow is keyboard-accessible, readable at increased zoom, and usable by the target professor audience.
10. The production build deploys as static assets on Vercel without a backend or authentication configuration.

## Explicitly Removed from the Earlier Design

- Canvas personal access tokens and token instructions.
- OAuth and Penn State login.
- Course and assignment discovery through the Canvas API.
- Vercel serverless functions and credential cookies.
- Any server-side handling of rosters or grades.

The manual Canvas gradebook upload is now the sole source of Canvas students, assignment metadata, current scores, and the structure used for export.
