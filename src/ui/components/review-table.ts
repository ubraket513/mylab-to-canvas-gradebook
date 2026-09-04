import type { ReviewStepState } from "../../app/state"
import type { ReviewRow, ReviewWarningCode } from "../../domain/types"
import type { AppHandlers } from "../app-view"
import { createElement } from "../dom"

const warningLabels: Record<ReviewWarningCode, string> = {
  unmatched: "Unmatched",
  "ambiguous-match": "Confirm match",
  "blank-canvas-score": "Blank Canvas score",
  "blank-mylab-score": "Blank MyLab score",
  "invalid-canvas-score": "Invalid Canvas score",
  "invalid-mylab-score": "Invalid MyLab score",
  "over-assignment-maximum": "Above maximum"
}

function numberText(value: number | null): string {
  return value === null ? "—" : Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function createStudentCell(row: ReviewRow): HTMLTableCellElement {
  const cell = createElement("th", { attributes: { scope: "row" } })
  cell.append(createElement("span", { className: "student-name", text: row.studentDisplayName }))
  const details = createElement("details", { className: "score-details" })
  details.append(createElement("summary", { text: "Score details" }))
  const list = createElement("ul")
  for (const section of row.sectionResults) {
    const raw = section.raw.kind === "value" ? section.raw.value : section.raw.kind
    list.append(
      createElement("li", {
        text: `${section.sectionKey}: raw ${raw}; adjusted ${numberText(section.adjusted)} of ${numberText(section.weight)}`
      })
    )
  }
  details.append(list)
  cell.append(details)
  return cell
}

function createMatchCell(
  row: ReviewRow,
  state: ReviewStepState,
  handlers: AppHandlers
): HTMLTableCellElement {
  const cell = createElement("td", { attributes: { "data-label": "Match" } })
  if (row.matchStatus === "exact") {
    cell.append(createElement("span", { className: "status-chip status-chip--good", text: "Penn State ID match" }))
    return cell
  }
  if (row.matchStatus === "unmatched") {
    cell.append(createElement("span", { className: "status-chip", text: "No Canvas match" }))
    return cell
  }

  const match = state.matches.find(({ mylabRowIndex }) => mylabRowIndex === row.mylabRowIndex)
  const fieldset = createElement("fieldset", { className: "match-options" })
  fieldset.append(createElement("legend", { text: `Choose a Canvas match for ${row.studentDisplayName}` }))
  for (const canvasRowIndex of match?.candidateCanvasRowIndices ?? []) {
    const candidate = state.canvas.students.find(({ rowIndex }) => rowIndex === canvasRowIndex)
    if (!candidate) continue
    const id = `match-${row.mylabRowIndex}-${canvasRowIndex}`
    const input = createElement("input", { attributes: { id, type: "radio", name: `match-${row.mylabRowIndex}` } })
    input.checked = state.decisions.matchResolutions.get(row.mylabRowIndex) === canvasRowIndex
    input.addEventListener("change", () => handlers.resolveMatch(row.mylabRowIndex, canvasRowIndex))
    const label = createElement("label", {
      text: `Match ${row.studentDisplayName} to ${candidate.name}`,
      attributes: { for: id }
    })
    const option = createElement("div", { className: "radio-option" })
    option.append(input, label)
    fieldset.append(option)
  }
  const leaveId = `match-${row.mylabRowIndex}-unchanged`
  const leave = createElement("input", {
    attributes: { id: leaveId, type: "radio", name: `match-${row.mylabRowIndex}` }
  })
  leave.checked = state.decisions.matchResolutions.has(row.mylabRowIndex) &&
    state.decisions.matchResolutions.get(row.mylabRowIndex) === null
  leave.addEventListener("change", () => handlers.resolveMatch(row.mylabRowIndex, null))
  const leaveOption = createElement("div", { className: "radio-option" })
  leaveOption.append(
    leave,
    createElement("label", { text: `Leave ${row.studentDisplayName} unchanged`, attributes: { for: leaveId } })
  )
  fieldset.append(leaveOption)
  cell.append(fieldset)
  return cell
}

export function createReviewTable(state: ReviewStepState, handlers: AppHandlers): HTMLElement {
  const wrap = createElement("div", { className: "review-table-wrap" })
  const table = createElement("table", { className: "review-table" })
  const caption = createElement("caption", { text: "Proposed Canvas gradebook changes" })
  const head = createElement("thead")
  const headingRow = createElement("tr")
  ;["Student", "Match", "Current Canvas", "MyLab add-on", "New Canvas", "Status"].forEach((text) =>
    headingRow.append(createElement("th", { text, attributes: { scope: "col" } }))
  )
  head.append(headingRow)
  const body = createElement("tbody")

  for (const row of state.review.rows) {
    const tr = createElement("tr", {
      className: row.warnings.length > 0 ? "review-row review-row--attention" : "review-row",
      attributes: {
        "data-review-row": "",
        "data-name": row.studentDisplayName.toLocaleLowerCase("en-US"),
        "data-attention": String(row.warnings.length > 0)
      }
    })
    tr.append(
      createStudentCell(row),
      createMatchCell(row, state, handlers),
      createElement("td", { text: row.existingCanvasScore?.kind === "value" ? numberText(row.existingCanvasScore.value) : "—", attributes: { "data-label": "Current Canvas" } }),
      createElement("td", { text: numberText(row.myLabAddOn), attributes: { "data-label": "MyLab add-on" } }),
      createElement("td", { text: numberText(row.newCanvasScore), attributes: { "data-label": "New Canvas" } })
    )
    const status = createElement("td", { attributes: { "data-label": "Status" } })
    if (row.warnings.length === 0) status.append(createElement("span", { className: "status-chip status-chip--good", text: "Ready" }))
    else {
      const list = createElement("ul", { className: "warning-list" })
      row.warnings.forEach((warning) => list.append(createElement("li", { text: warningLabels[warning] })))
      status.append(list)
    }
    if (row.warnings.includes("over-assignment-maximum") && row.canvasRowIndex !== null) {
      const id = `maximum-${row.canvasRowIndex}`
      const input = createElement("input", { attributes: { id, type: "checkbox" } })
      input.checked = state.decisions.overMaximumOverrides.has(row.canvasRowIndex)
      input.addEventListener("change", () => handlers.setMaximumOverride(row.canvasRowIndex!, input.checked))
      const option = createElement("div", { className: "check-option" })
      option.append(
        input,
        createElement("label", {
          text: `Include ${row.studentDisplayName} score above the assignment maximum`,
          attributes: { for: id }
        })
      )
      status.append(option)
    }
    tr.append(status)
    body.append(tr)
  }
  table.append(caption, head, body)
  wrap.append(table)
  return wrap
}
