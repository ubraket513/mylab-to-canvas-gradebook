import type { ReviewStepState } from "../../app/state"
import { createReviewTable } from "../components/review-table"
import { createElement } from "../dom"
import type { AppHandlers } from "../app-view"

function summaryText(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`
}

export function createReviewView(state: ReviewStepState, handlers: AppHandlers): HTMLElement {
  const panel = createElement("section", { className: "work-panel work-panel--wide", attributes: { "aria-labelledby": "page-title" } })
  panel.append(
    createElement("p", { className: "eyebrow", text: "Step 4 of 5: Review scores" }),
    createElement("h1", { text: "Review before downloading", attributes: { id: "page-title" } }),
    createElement("p", { className: "lede", text: "Nothing changes in Canvas yet. Confirm every warning, then download a new gradebook." })
  )

  const summary = createElement("div", { className: "summary-grid", attributes: { "aria-label": "Review summary" } })
  const items: Array<readonly [string, string, string]> = [
    ["✓", "Confirmed", summaryText(state.review.summary.confirmed, "student", "students")],
    ["?", "Needs confirmation", summaryText(state.review.summary.needsConfirmation, "match needs confirmation", "matches need confirmation")],
    ["—", "Unmatched", summaryText(state.review.summary.unmatched, "student", "students")],
    ["○", "Blank scores", summaryText(state.review.summary.blankCanvasScores + state.review.summary.blankMyLabScores, "student", "students")],
    ["!", "Above maximum", summaryText(state.review.summary.overMaximum, "score", "scores")]
  ]
  for (const [icon, label, value] of items) {
    const card = createElement("div", { className: "summary-card" })
    card.append(
      createElement("span", { className: "summary-card__icon", text: icon, attributes: { "aria-hidden": "true" } }),
      createElement("span", { className: "summary-card__label", text: label }),
      createElement("strong", { text: value })
    )
    summary.append(card)
  }

  const tools = createElement("div", { className: "review-tools" })
  const searchLabel = createElement("label", { text: "Find a student", attributes: { for: "review-search" } })
  const search = createElement("input", { attributes: { id: "review-search", type: "search", placeholder: "Type a name" } })
  const filterGroup = createElement("div", { className: "filter-group", attributes: { "aria-label": "Filter review rows" } })
  const all = createElement("button", { className: "filter-button", text: "All", attributes: { type: "button", "aria-pressed": "true" } })
  const attention = createElement("button", { className: "filter-button", text: "Needs attention", attributes: { type: "button", "aria-pressed": "false" } })
  filterGroup.append(all, attention)
  tools.append(searchLabel, search, filterGroup)

  const table = createReviewTable(state, handlers)
  let attentionOnly = false
  const applyFilter = (): void => {
    const query = search.value.trim().toLocaleLowerCase("en-US")
    table.querySelectorAll<HTMLElement>("[data-review-row]").forEach((row) => {
      const matchesName = (row.dataset.name ?? "").includes(query)
      const matchesStatus = !attentionOnly || row.dataset.attention === "true"
      row.hidden = !matchesName || !matchesStatus
    })
  }
  search.addEventListener("input", applyFilter)
  all.addEventListener("click", () => {
    attentionOnly = false
    all.setAttribute("aria-pressed", "true")
    attention.setAttribute("aria-pressed", "false")
    applyFilter()
  })
  attention.addEventListener("click", () => {
    attentionOnly = true
    all.setAttribute("aria-pressed", "false")
    attention.setAttribute("aria-pressed", "true")
    applyFilter()
  })

  const acknowledgements = createElement("div", { className: "acknowledgements" })
  if (state.review.summary.unmatched > 0) {
    acknowledgements.append(
      createCheckbox(
        "ack-unmatched",
        "I understand unmatched students will remain unchanged",
        state.decisions.acknowledgedUnmatched,
        (checked) => handlers.setAcknowledgement("unmatched", checked)
      )
    )
  }
  const blanks = state.review.summary.blankCanvasScores + state.review.summary.blankMyLabScores
  if (blanks > 0) {
    acknowledgements.append(
      createCheckbox(
        "ack-blank",
        "I understand blank scores are treated as zero",
        state.decisions.acknowledgedBlankScores,
        (checked) => handlers.setAcknowledgement("blank", checked)
      )
    )
  }

  const blockers = createElement("div", {
    className: "blocker-summary",
    attributes: { role: "alert", "aria-live": "polite" }
  })
  if (state.review.blockers.length > 0) {
    blockers.append(createElement("p", { className: "notice__title", text: "Before you can continue" }))
    const list = createElement("ul")
    state.review.blockers.forEach((blocker) => list.append(createElement("li", { text: blocker })))
    blockers.append(list)
  }

  const actions = createElement("div", { className: "actions actions--between" })
  const back = createElement("button", { className: "button button--secondary", text: "Back", attributes: { type: "button" } })
  back.addEventListener("click", handlers.back)
  const continueButton = createElement("button", {
    className: "button button--primary",
    text: "Continue to download",
    attributes: { type: "button", ...(state.review.exportAllowed ? {} : { disabled: "" }) }
  })
  continueButton.addEventListener("click", handlers.continue)
  actions.append(back, continueButton)
  panel.append(summary, tools, table, acknowledgements, blockers, actions)
  return panel
}

function createCheckbox(
  id: string,
  labelText: string,
  checked: boolean,
  onChange: (checked: boolean) => void
): HTMLElement {
  const option = createElement("div", { className: "check-option check-option--large" })
  const input = createElement("input", { attributes: { id, type: "checkbox" } })
  input.checked = checked
  input.addEventListener("change", () => onChange(input.checked))
  option.append(input, createElement("label", { text: labelText, attributes: { for: id } }))
  return option
}
