import { createElement } from "../dom"

interface FilePickerOptions {
  id: string
  label: string
  description: string
  onFile(file: File): void
}

export function createFilePicker(options: FilePickerOptions): HTMLElement {
  const wrapper = createElement("div", { className: "file-picker" })
  const input = createElement("input", {
    className: "visually-hidden",
    attributes: {
      id: options.id,
      type: "file",
      accept: ".csv,text/csv",
      "aria-label": options.label,
      "aria-describedby": `${options.id}-description`
    }
  })
  const icon = createElement("span", {
    className: "file-picker__icon",
    text: "CSV",
    attributes: { "aria-hidden": "true" }
  })
  const title = createElement("p", { className: "file-picker__title", text: options.label })
  const description = createElement("p", {
    className: "file-picker__description",
    text: options.description,
    attributes: { id: `${options.id}-description` }
  })
  const choose = createElement("label", {
    className: "button button--secondary",
    text: "Choose CSV file",
    attributes: { for: options.id }
  })
  const dropHint = createElement("span", { className: "file-picker__hint", text: "or drag and drop it here" })
  const deliver = (files: FileList | null): void => {
    const file = files?.[0]
    if (file) options.onFile(file)
  }
  input.addEventListener("change", () => deliver(input.files))
  wrapper.addEventListener("dragover", (event) => {
    event.preventDefault()
    wrapper.classList.add("file-picker--dragging")
  })
  wrapper.addEventListener("dragleave", () => wrapper.classList.remove("file-picker--dragging"))
  wrapper.addEventListener("drop", (event) => {
    event.preventDefault()
    wrapper.classList.remove("file-picker--dragging")
    deliver(event.dataTransfer?.files ?? null)
  })
  wrapper.append(input, icon, title, description, choose, dropHint)
  return wrapper
}
