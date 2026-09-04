import { createElement } from "../dom"

const steps = ["Upload Canvas", "Choose files", "Set grading", "Review changes", "Download"] as const

export function createStepIndicator(currentStep: number): HTMLElement {
  const nav = createElement("nav", { className: "progress", attributes: { "aria-label": "Progress" } })
  const list = createElement("ol", { className: "progress__list" })
  steps.forEach((label, index) => {
    const number = index + 1
    const item = createElement("li", {
      className: `progress__item${number === currentStep ? " progress__item--current" : ""}`
    })
    if (number === currentStep) item.setAttribute("aria-current", "step")
    item.append(
      createElement("span", { className: "progress__number", text: String(number) }),
      createElement("span", { className: "progress__label", text: label })
    )
    list.append(item)
  })
  nav.append(list)
  return nav
}
