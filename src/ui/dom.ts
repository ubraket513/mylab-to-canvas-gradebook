export function focusAlert(container: ParentNode): void {
  const alert = container.querySelector<HTMLElement>("[role='alert']")
  if (!alert) return
  alert.tabIndex = -1
  alert.focus()
}
