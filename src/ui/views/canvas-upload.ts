import type { AppHandlers } from "../app-view"
import { createElement, createStatusRegion } from "../dom"
import { createFilePicker } from "../components/file-picker"
import { createNotice } from "../components/notice"

export function createCanvasUploadView(handlers: AppHandlers): HTMLElement {
  const panel = createElement("section", {
    className: "work-panel",
    attributes: { "aria-labelledby": "page-title" }
  })
  const intro = createElement("div", { className: "intro" })
  intro.append(
    createElement("p", { className: "eyebrow", text: "Step 1 of 5: Upload Canvas gradebook" }),
    createElement("h1", { text: "Prepare your Canvas gradebook", attributes: { id: "page-title" } }),
    createElement("p", {
      className: "lede",
      text: "Add MyLab scores to one Canvas assignment without changing the rest of your gradebook."
    })
  )
  const how = createElement("div", { className: "how-it-works" })
  how.append(createElement("h2", { text: "How it works" }))
  const steps = createElement("ol")
  ;[
    "Upload the gradebook CSV you downloaded from Penn State Canvas.",
    "Choose an assignment, upload MyLab, and review every proposed change.",
    "Download a new CSV and check Canvas's import preview before accepting it."
  ].forEach((text) => steps.append(createElement("li", { text })))
  how.append(steps)
  const privacy = createNotice(
    "Your gradebook stays in this browser tab. It is not uploaded to a server.",
    "info"
  )
  privacy.classList.add("notice--privacy")
  const picker = createFilePicker({
    id: "canvas-gradebook",
    label: "Canvas gradebook CSV",
    description: "Use the complete gradebook export from Penn State Canvas. Maximum file size: 25 MB.",
    onFile: (file) => void handlers.selectCanvasFile(file)
  })
  const feedback = createElement("div", { attributes: { id: "app-alert" } })
  const status = createStatusRegion()
  const actions = createElement("div", { className: "actions actions--end" })
  const continueButton = createElement("button", {
    className: "button button--primary",
    text: "Continue",
    attributes: { id: "continue-button", type: "button", disabled: "" }
  })
  continueButton.addEventListener("click", handlers.continue)
  actions.append(continueButton)
  panel.append(intro, how, privacy, picker, feedback, status, actions)
  return panel
}
