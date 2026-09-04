import { parseCanvasGradebook } from "../csv/canvas"
import { parseCsvFile } from "../csv/parse"
import type { CanvasGradebook } from "../domain/types"
import { createNotice } from "../ui/components/notice"
import { focusAlert } from "../ui/dom"
import { renderApp, type AppHandlers } from "../ui/app-view"
import { loadThreshold } from "./preferences"
import { createInitialState, reduceAppState, type AppState } from "./state"

interface PendingCanvas {
  fileName: string
  canvas: CanvasGradebook
}

export class AppController implements AppHandlers {
  private state: AppState
  private pendingCanvas: PendingCanvas | null = null

  constructor(private readonly root: HTMLElement) {
    let threshold = 0.8
    try {
      threshold = loadThreshold(window.localStorage)
    } catch {
      // Storage can be disabled without preventing local gradebook processing.
    }
    this.state = createInitialState(threshold)
  }

  start(): void {
    this.render()
  }

  async selectCanvasFile(file: File): Promise<void> {
    this.pendingCanvas = null
    this.setFeedback("Checking your Canvas gradebook…", true)
    const parsed = await parseCsvFile(file)
    if (!parsed.ok) {
      this.showError(
        parsed.errors[0]?.code === "invalid-file-type"
          ? "Choose a Canvas gradebook CSV (.csv file)."
          : (parsed.errors[0]?.message ?? "Choose a Canvas gradebook CSV.")
      )
      return
    }
    const canvas = parseCanvasGradebook(parsed.value)
    if (!canvas.ok) {
      this.showError(canvas.errors[0]?.message ?? "Choose a Canvas gradebook CSV.")
      return
    }
    this.pendingCanvas = { fileName: file.name, canvas: canvas.value }
    const students = canvas.value.students.length
    const assignments = canvas.value.assignments.length
    this.setFeedback(
      `${students} ${students === 1 ? "student" : "students"} and ${assignments} ${assignments === 1 ? "assignment" : "assignments"} found.`,
      false
    )
  }

  selectAssignment(_columnIndex: number): void {}
  async selectMyLabFile(_file: File): Promise<void> {}
  setThreshold(_percent: number): void {}
  setWeight(_sectionKey: string, _weight: number): void {}
  resolveMatch(_mylabRowIndex: number, _canvasRowIndex: number | null): void {}
  setAcknowledgement(_kind: "unmatched" | "blank", _checked: boolean): void {}
  setMaximumOverride(_canvasRowIndex: number, _checked: boolean): void {}
  download(): void {}

  continue = (): void => {
    if (!this.pendingCanvas) return
    this.state = reduceAppState(this.state, { type: "canvas-loaded", ...this.pendingCanvas })
    this.pendingCanvas = null
    this.render()
  }

  back = (): void => {
    this.state = reduceAppState(this.state, { type: "back" })
    this.render()
  }

  reset = (): void => {
    this.pendingCanvas = null
    this.state = reduceAppState(this.state, { type: "reset" })
    this.render()
  }

  private render(): void {
    renderApp(this.root, this.state, this)
  }

  private setFeedback(message: string, busy: boolean): void {
    this.root.querySelector("#app-alert")?.replaceChildren()
    const status = this.root.querySelector<HTMLElement>("#app-status")
    if (status) status.textContent = message
    const button = this.root.querySelector<HTMLButtonElement>("#continue-button")
    if (button) button.disabled = busy || this.pendingCanvas === null
  }

  private showError(message: string): void {
    const host = this.root.querySelector<HTMLElement>("#app-alert")
    if (host) {
      host.replaceChildren(createNotice(message, "error"))
      focusAlert(host)
    }
    const status = this.root.querySelector<HTMLElement>("#app-status")
    if (status) status.textContent = "The selected file was not accepted."
    const button = this.root.querySelector<HTMLButtonElement>("#continue-button")
    if (button) button.disabled = true
  }
}
