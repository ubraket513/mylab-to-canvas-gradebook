import type { AssignmentMyLabStepState } from "../../app/state"
import { createFilePicker } from "../components/file-picker"
import { createElement, createStatusRegion } from "../dom"
import type { AppHandlers } from "../app-view"

export function createAssignmentMyLabView(
  state: AssignmentMyLabStepState,
  handlers: AppHandlers
): HTMLElement {
  const panel = createElement("section", { className: "work-panel", attributes: { "aria-labelledby": "page-title" } })
  panel.append(
    createElement("p", { className: "eyebrow", text: "Step 2 of 5: Choose assignment and MyLab file" }),
    createElement("h1", { text: "Choose what to update", attributes: { id: "page-title" } }),
    createElement("p", { className: "lede", text: "Select one Canvas assignment, then add the matching MyLab gradebook." })
  )

  const assignmentGroup = createElement("div", { className: "field-group" })
  const assignmentLabel = createElement("label", { text: "Canvas assignment", attributes: { for: "canvas-assignment" } })
  const assignment = createElement("select", { attributes: { id: "canvas-assignment" } })
  const prompt = createElement("option", { text: "Choose an assignment", attributes: { value: "" } })
  assignment.append(prompt)
  for (const item of state.canvas.assignments) {
    const option = createElement("option", {
      text: `${item.name} — ${item.pointsPossible} points`,
      attributes: { value: String(item.columnIndex) }
    })
    if (item.columnIndex === state.selectedAssignmentColumn) option.selected = true
    assignment.append(option)
  }
  assignment.addEventListener("change", () => {
    const columnIndex = Number(assignment.value)
    if (Number.isInteger(columnIndex)) handlers.selectAssignment(columnIndex)
  })
  assignmentGroup.append(assignmentLabel, assignment)

  const guidance = createElement("details", { className: "download-help" })
  guidance.append(createElement("summary", { text: "How to download these files" }))
  const guidanceBody = createElement("div")
  guidanceBody.append(
    createElement("p", { text: "Canvas: open Grades, choose Actions, then Export Entire Gradebook." }),
    createElement("p", { text: "MyLab: open the gradebook, choose Export Data, and save the detailed CSV." })
  )
  guidance.append(guidanceBody)

  const picker = createFilePicker({
    id: "mylab-gradebook",
    label: "MyLab gradebook CSV",
    description: "Choose the detailed MyLab gradebook CSV for this assignment.",
    onFile: (file) => void handlers.selectMyLabFile(file)
  })
  const feedback = createElement("div", { attributes: { id: "app-alert" } })
  const status = createStatusRegion()
  if (state.mylab) {
    status.textContent = `${state.mylab.students.length} students and ${state.mylab.sections.length} MyLab sections found.`
  }
  const actions = createElement("div", { className: "actions actions--between" })
  const back = createElement("button", { className: "button button--secondary", text: "Back", attributes: { type: "button" } })
  back.addEventListener("click", handlers.back)
  const continueButton = createElement("button", {
    className: "button button--primary",
    text: "Continue",
    attributes: {
      id: "continue-button",
      type: "button",
      ...(state.mylab && state.selectedAssignmentColumn !== null ? {} : { disabled: "" })
    }
  })
  continueButton.addEventListener("click", handlers.continue)
  actions.append(back, continueButton)
  panel.append(assignmentGroup, guidance, picker, feedback, status, actions)
  return panel
}
