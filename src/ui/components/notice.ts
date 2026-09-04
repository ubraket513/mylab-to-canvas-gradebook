import { createElement } from "../dom"

export function createNotice(message: string, kind: "error" | "info" = "info"): HTMLElement {
  const notice = createElement("div", {
    className: `notice notice--${kind}`,
    attributes: kind === "error" ? { role: "alert" } : { role: "note" }
  })
  notice.append(
    createElement("p", { className: "notice__title", text: kind === "error" ? "Check this file" : "Good to know" }),
    createElement("p", { text: message })
  )
  return notice
}
