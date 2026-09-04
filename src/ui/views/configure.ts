import type { ConfigureStepState } from "../../app/state"
import { adjustSectionScore } from "../../domain/score"
import { createElement } from "../dom"
import type { AppHandlers } from "../app-view"

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)))
}

export function createConfigureView(state: ConfigureStepState, handlers: AppHandlers): HTMLElement {
  const panel = createElement("section", { className: "work-panel", attributes: { "aria-labelledby": "page-title" } })
  panel.append(
    createElement("p", { className: "eyebrow", text: "Step 3 of 5: Configure grading" }),
    createElement("h1", { text: "Set the grading rules", attributes: { id: "page-title" } }),
    createElement("p", { className: "lede", text: "Check the full-credit threshold and the point value for each MyLab section." })
  )

  const form = createElement("div", { className: "configuration" })
  const thresholdGroup = createElement("div", { className: "field-group" })
  const thresholdLabel = createElement("label", { text: "Full-credit threshold", attributes: { for: "threshold" } })
  const thresholdWrap = createElement("div", { className: "number-with-suffix" })
  const threshold = createElement("input", {
    attributes: { id: "threshold", type: "number", min: "1", max: "100", step: "1", value: formatNumber(state.threshold * 100) }
  })
  threshold.addEventListener("input", () => handlers.setThreshold(Number(threshold.value)))
  thresholdWrap.append(threshold, createElement("span", { text: "%", attributes: { "aria-hidden": "true" } }))
  thresholdGroup.append(thresholdLabel, thresholdWrap)
  form.append(thresholdGroup)

  let validWeights = true
  for (const section of state.mylab.sections) {
    const weight = state.weights.get(section.key) ?? section.detectedWeight
    const group = createElement("div", { className: "field-group" })
    const id = `weight-${section.columnIndex}`
    const label = createElement("label", { text: `Points for section ${section.key}`, attributes: { for: id } })
    const input = createElement("input", {
      attributes: { id, type: "number", min: "0", step: "any", value: formatNumber(weight) }
    })
    input.addEventListener("input", () => handlers.setWeight(section.key, Number(input.value)))
    group.append(label, input)
    if (!Number.isFinite(weight) || weight < 0) {
      validWeights = false
      group.append(createElement("p", { className: "field-error", text: "Enter zero or a positive number.", attributes: { role: "alert" } }))
    } else if (weight === 0) {
      group.append(createElement("p", { className: "field-warning", text: "This section will add no points." }))
    }
    form.append(group)
  }

  const total = [...state.weights.values()].reduce((sum, weight) => sum + (Number.isFinite(weight) ? weight : 0), 0)
  const firstWeight = [...state.weights.values()].find((weight) => weight > 0) ?? 0
  const sampleRaw = 0.45
  const sampleAdjusted = adjustSectionScore(sampleRaw, state.threshold, firstWeight)
  const bonus = Math.round((1 - state.threshold) * 100)
  const roundedPercent = firstWeight === 0 ? 0 : Math.round((sampleAdjusted / firstWeight) * 100)
  const explanation = createElement("div", { className: "formula-example" })
  explanation.append(
    createElement("p", { className: "formula-example__total", text: `Maximum MyLab add-on: ${formatNumber(total)} points` }),
    createElement("p", {
      text: `At ${formatNumber(state.threshold * 100)}%, a MyLab score of 45% receives a ${bonus}% bonus, rounds up to ${roundedPercent}%, and earns ${formatNumber(sampleAdjusted)} of ${formatNumber(firstWeight)} points.`
    })
  )

  const actions = createElement("div", { className: "actions actions--between" })
  const back = createElement("button", { className: "button button--secondary", text: "Back", attributes: { type: "button" } })
  back.addEventListener("click", handlers.back)
  const continueButton = createElement("button", {
    className: "button button--primary",
    text: "Continue to review",
    attributes: { type: "button", ...(validWeights ? {} : { disabled: "" }) }
  })
  continueButton.addEventListener("click", handlers.continue)
  actions.append(back, continueButton)
  panel.append(form, explanation, actions)
  return panel
}
