import type { AppState } from "../app/state"
import { createStepIndicator } from "./components/step-indicator"
import { createCanvasUploadView } from "./views/canvas-upload"
import { createAssignmentMyLabView } from "./views/assignment-mylab"
import { createConfigureView } from "./views/configure"
import { createReviewView } from "./views/review"
import { createDownloadView } from "./views/download"
import { createElement, createStatusRegion } from "./dom"

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

const stepNumber: Record<AppState["step"], number> = {
  canvas: 1,
  "assignment-mylab": 2,
  configure: 3,
  review: 4,
  download: 5
}

function createPlaceholder(
  state: Exclude<AppState, { step: "canvas" }>,
  handlers: AppHandlers
): HTMLElement {
  const panel = createElement("section", { className: "work-panel" })
  panel.append(
    createElement("p", { className: "eyebrow", text: `Step ${stepNumber[state.step]} of 5` }),
    createElement("h1", { text: "Your Canvas gradebook is ready for the next step" }),
    createElement("p", { text: "Assignment and MyLab controls are added in the next implementation step." }),
    createStatusRegion()
  )
  const back = createElement("button", {
    className: "button button--secondary",
    text: "Back",
    attributes: { type: "button" }
  })
  back.addEventListener("click", handlers.back)
  panel.append(back)
  return panel
}

export function renderApp(root: HTMLElement, state: AppState, handlers: AppHandlers): void {
  const header = createElement("header", {
    className: "app-header",
    attributes: { "aria-label": "Application header" }
  })
  const brand = createElement("div", { className: "app-header__inner" })
  brand.append(
    createElement("span", { className: "brand-mark", text: "M", attributes: { "aria-hidden": "true" } }),
    createElement("span", { className: "brand-name", text: "MyLab → Canvas" }),
    createElement("span", { className: "brand-context", text: "Penn State gradebook helper" })
  )
  header.append(brand)
  const shell = createElement("div", { className: "app-shell" })
  shell.append(createStepIndicator(stepNumber[state.step]))
  const main = createElement("main", { attributes: { id: "main-content", tabindex: "-1" } })
  if (state.step === "canvas") main.append(createCanvasUploadView(handlers))
  else if (state.step === "assignment-mylab") main.append(createAssignmentMyLabView(state, handlers))
  else if (state.step === "configure") main.append(createConfigureView(state, handlers))
  else if (state.step === "review") main.append(createReviewView(state, handlers))
  else if (state.step === "download") main.append(createDownloadView(state, handlers))
  else main.append(createPlaceholder(state, handlers))
  shell.append(main)
  root.replaceChildren(header, shell)
}
