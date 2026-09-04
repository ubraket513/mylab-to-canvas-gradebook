export interface ElementOptions {
  className?: string
  text?: string
  attributes?: Readonly<Record<string, string>>
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options: ElementOptions = {}
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName)
  if (options.className) element.className = options.className
  if (options.text !== undefined) element.textContent = options.text
  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    element.setAttribute(name, value)
  }
  return element
}

export function createStatusRegion(): HTMLParagraphElement {
  return createElement("p", {
    className: "status-region",
    attributes: { id: "app-status", role: "status", "aria-live": "polite", "aria-atomic": "true" }
  })
}

export function focusAlert(container: ParentNode): void {
  const alert = container.querySelector<HTMLElement>("[role='alert']")
  if (!alert) return
  alert.tabIndex = -1
  alert.focus()
}
