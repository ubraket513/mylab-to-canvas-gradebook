import type { DownloadStepState } from "../../app/state"
import type { AppHandlers } from "../app-view"
import { createElement } from "../dom"

export function createDownloadView(state: DownloadStepState, handlers: AppHandlers): HTMLElement {
  const panel = createElement("section", { className: "work-panel", attributes: { "aria-labelledby": "page-title" } })
  panel.append(
    createElement("p", { className: "eyebrow", text: "Step 5 of 5: Download complete" }),
    createElement("h1", { text: "Your updated gradebook is ready", attributes: { id: "page-title" } }),
    createElement("p", { className: "lede", text: "The CSV was created on this device. Your gradebook data has been cleared from the app." })
  )
  const summary = createElement("div", { className: "completion-summary", attributes: { "aria-label": "Download summary" } })
  ;[
    ["Updated", state.summary.updated],
    ["Unchanged", state.summary.unchanged],
    ["Above-maximum approvals", state.summary.overrides]
  ].forEach(([label, value]) => {
    const item = createElement("div")
    item.append(createElement("span", { text: String(label) }), createElement("strong", { text: String(value) }))
    summary.append(item)
  })
  const instructions = createElement("div", { className: "import-instructions" })
  instructions.append(createElement("h2", { text: "Import it into Penn State Canvas" }))
  const list = createElement("ol")
  ;[
    "Open Grades in your Canvas course and choose Import.",
    "Select the downloaded canvas-gradebook-updated CSV file.",
    "Review Canvas's import preview carefully, then accept the changes."
  ].forEach((text) => list.append(createElement("li", { text })))
  instructions.append(list)
  const reset = createElement("button", { className: "button button--primary", text: "Start over", attributes: { type: "button" } })
  reset.addEventListener("click", handlers.reset)
  panel.append(summary, instructions, reset)
  return panel
}
