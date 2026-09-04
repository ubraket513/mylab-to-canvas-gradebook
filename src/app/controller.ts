import { parseCanvasGradebook } from "../csv/canvas"
import { parseCsvFile } from "../csv/parse"
import { parseMyLabGradebook } from "../csv/mylab"
import { matchStudents } from "../domain/matching"
import { buildReviewModel } from "../domain/review-policy"
import type { CanvasGradebook, MyLabGradebook, ReviewDecisions } from "../domain/types"
import { createNotice } from "../ui/components/notice"
import { focusAlert } from "../ui/dom"
import { renderApp, type AppHandlers } from "../ui/app-view"
import { loadThreshold, saveThreshold } from "./preferences"
import { createInitialState, reduceAppState, type AppState } from "./state"

interface PendingCanvas {
  fileName: string
  canvas: CanvasGradebook
}

interface PendingMyLab {
  fileName: string
  mylab: MyLabGradebook
}

export class AppController implements AppHandlers {
  private state: AppState
  private pendingCanvas: PendingCanvas | null = null
  private pendingMyLab: PendingMyLab | null = null

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

  selectAssignment(columnIndex: number): void {
    this.state = reduceAppState(this.state, { type: "assignment-selected", columnIndex })
    this.render()
    const availableMyLab = this.pendingMyLab?.mylab ??
      (this.state.step === "assignment-mylab" ? this.state.mylab : null)
    if (availableMyLab) {
      this.setFeedback(
        `${availableMyLab.students.length} students and ${availableMyLab.sections.length} MyLab sections found.`,
        false
      )
    }
  }

  async selectMyLabFile(file: File): Promise<void> {
    this.pendingMyLab = null
    this.setFeedback("Checking your MyLab gradebook…", true)
    const parsed = await parseCsvFile(file)
    if (!parsed.ok) {
      this.showError(
        parsed.errors[0]?.code === "invalid-file-type"
          ? "Choose a MyLab gradebook CSV (.csv file)."
          : (parsed.errors[0]?.message ?? "Choose a MyLab gradebook CSV.")
      )
      return
    }
    const mylab = parseMyLabGradebook(parsed.value)
    if (!mylab.ok) {
      this.showError(
        `This does not look like the supported MyLab gradebook. ${mylab.errors[0]?.message ?? "Check the export and try again."}`
      )
      return
    }
    this.pendingMyLab = { fileName: file.name, mylab: mylab.value }
    this.setFeedback(
      `${mylab.value.students.length} students and ${mylab.value.sections.length} MyLab sections found.`,
      false
    )
  }

  setThreshold(percent: number): void {
    const threshold = percent / 100
    if (!Number.isFinite(threshold) || threshold < 0.01 || threshold > 1) return
    this.state = reduceAppState(this.state, { type: "threshold-changed", threshold })
    try {
      saveThreshold(window.localStorage, threshold)
    } catch {
      // Storage can be unavailable; the in-memory preference still works.
    }
    this.render()
    this.root.querySelector<HTMLInputElement>("#threshold")?.focus()
  }

  setWeight(sectionKey: string, weight: number): void {
    this.state = reduceAppState(this.state, { type: "weight-changed", sectionKey, weight })
    this.render()
    if (this.state.step === "configure") {
      const section = this.state.mylab.sections.find(({ key }) => key === sectionKey)
      if (section) this.root.querySelector<HTMLInputElement>(`#weight-${section.columnIndex}`)?.focus()
    }
  }
  resolveMatch(_mylabRowIndex: number, _canvasRowIndex: number | null): void {}
  setAcknowledgement(_kind: "unmatched" | "blank", _checked: boolean): void {}
  setMaximumOverride(_canvasRowIndex: number, _checked: boolean): void {}
  download(): void {}

  continue = (): void => {
    if (this.state.step === "canvas") {
      if (!this.pendingCanvas) return
      const pending = this.pendingCanvas
      this.state = reduceAppState(this.state, { type: "canvas-loaded", ...pending })
      this.pendingCanvas = null
      if (pending.canvas.assignments.length === 1) {
        this.state = reduceAppState(this.state, {
          type: "assignment-selected",
          columnIndex: pending.canvas.assignments[0]!.columnIndex
        })
      }
      this.render()
      return
    }
    if (this.state.step === "assignment-mylab") {
      const availableMyLab = this.pendingMyLab ??
        (this.state.mylab && this.state.mylabFileName
          ? { mylab: this.state.mylab, fileName: this.state.mylabFileName }
          : null)
      if (!availableMyLab || this.state.selectedAssignmentColumn === null) return
      this.state = reduceAppState(this.state, { type: "mylab-loaded", ...availableMyLab })
      this.pendingMyLab = null
      this.render()
      return
    }
    if (this.state.step === "configure") {
      const configured = this.state
      const assignment = configured.canvas.assignments.find(
        ({ columnIndex }) => columnIndex === configured.selectedAssignmentColumn
      )
      if (!assignment || [...configured.weights.values()].some((weight) => weight < 0 || !Number.isFinite(weight))) return
      const matches = matchStudents(configured.canvas.students, configured.mylab.students)
      const decisions: ReviewDecisions = {
        matchResolutions: new Map(),
        acknowledgedUnmatched: false,
        acknowledgedBlankScores: false,
        overMaximumOverrides: new Set()
      }
      const review = buildReviewModel({
        canvas: configured.canvas,
        assignment,
        mylab: configured.mylab,
        weights: configured.weights,
        threshold: configured.threshold,
        matches,
        decisions
      })
      this.state = reduceAppState(this.state, { type: "review-prepared", matches, decisions, review })
      this.render()
    }
  }

  back = (): void => {
    this.state = reduceAppState(this.state, { type: "back" })
    this.render()
  }

  reset = (): void => {
    this.pendingCanvas = null
    this.pendingMyLab = null
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
    const ready =
      this.state.step === "canvas"
        ? this.pendingCanvas !== null
        : this.state.step === "assignment-mylab"
          ? (this.pendingMyLab !== null || this.state.mylab !== null) &&
            this.state.selectedAssignmentColumn !== null
          : false
    if (button) button.disabled = busy || !ready
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
