import { parseCanvasGradebook } from "../csv/canvas"
import { parseCsvFile } from "../csv/parse"
import { parseMyLabGradebook } from "../csv/mylab"
import { buildScoreUpdates, exportCanvasGradebook, makeDownloadFilename } from "../csv/export"
import { matchStudents } from "../domain/matching"
import { buildReviewModel } from "../domain/review-policy"
import type { CanvasGradebook, MyLabGradebook, ReviewDecisions } from "../domain/types"
import { downloadCsv, saveCsvAs } from "../ui/download-file"
import { focusAlert } from "../ui/dom"
import { renderApp } from "../ui/react/app"
import type { AppHandlers, UploadFeedback } from "./handlers"
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
  private uploadVersion = 0
  private renderedStep: AppState["step"] | null = null
  private feedback: UploadFeedback = { message: "", error: "", busy: false, ready: false }

  constructor(private readonly root: HTMLElement) {
    let threshold = 0.8
    try {
      threshold = loadThreshold(window.localStorage)
      saveThreshold(window.localStorage, threshold)
    } catch {
      // Storage can be disabled without preventing local gradebook processing.
    }
    this.state = createInitialState(threshold)
  }

  start(): void {
    this.render()
  }

  async selectCanvasFile(file: File): Promise<void> {
    const version = ++this.uploadVersion
    this.pendingCanvas = null
    this.setFeedback("Checking your Canvas gradebook…", true)
    const parsed = await parseCsvFile(file)
    if (version !== this.uploadVersion || this.state.step !== "canvas") return
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
    const version = ++this.uploadVersion
    this.pendingMyLab = null
    if (this.state.step === "assignment-mylab") this.state = { ...this.state, mylab: null, mylabFileName: null }
    this.setFeedback("Checking your MyLab gradebook…", true)
    const parsed = await parseCsvFile(file)
    if (version !== this.uploadVersion || this.state.step !== "assignment-mylab") return
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
        mylab.errors[0]?.message ?? "Choose a supported MyLab gradebook CSV. Check the export and try again."
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
    if (!Number.isInteger(percent) || !Number.isFinite(threshold) || threshold < 0.01 || threshold > 1) return
    this.state = reduceAppState(this.state, { type: "threshold-changed", threshold })
    try {
      saveThreshold(window.localStorage, threshold)
    } catch {
      // Storage can be unavailable; the in-memory preference still works.
    }
    this.render()
  }

  setWeight(sectionKey: string, weight: number): void {
    this.state = reduceAppState(this.state, { type: "weight-changed", sectionKey, weight })
    this.render()
  }
  resolveMatch(mylabRowIndex: number, canvasRowIndex: number | null): void {
    this.state = reduceAppState(this.state, { type: "match-resolved", mylabRowIndex, canvasRowIndex })
    this.render()
  }

  setAcknowledgement(kind: "unmatched" | "blank", checked: boolean): void {
    this.state = reduceAppState(this.state, { type: "acknowledgement-changed", kind, checked })
    this.render()
  }

  setMaximumOverride(canvasRowIndex: number, checked: boolean): void {
    this.state = reduceAppState(this.state, { type: "maximum-override-changed", canvasRowIndex, checked })
    this.render()
  }
  async download(saveAs = false): Promise<"downloaded" | "saved" | "cancelled"> {
    if (this.state.step !== "download" || !this.state.reviewState.review.exportAllowed) throw new Error("Gradebook is not ready")
    const reviewState = this.state.reviewState
    const assignment = reviewState.canvas.assignments.find(
      ({ columnIndex }) => columnIndex === reviewState.selectedAssignmentColumn
    )
    if (!assignment) throw new Error("Assignment is unavailable")
    const updates = buildScoreUpdates(reviewState.review.rows)
    const contents = () => exportCanvasGradebook(reviewState.canvas, assignment, updates)
    const filename = makeDownloadFilename(new Date())
    if (saveAs) return saveCsvAs(contents, filename)
    downloadCsv(contents(), filename)
    return "downloaded"
  }

  private prepareDownload(): void {
    if (this.state.step !== "review" || !this.state.review.exportAllowed) return
    const reviewState = this.state
    const updates = buildScoreUpdates(reviewState.review.rows)
    this.state = reduceAppState(reviewState, {
      type: "download-completed",
      summary: {
        updated: updates.size,
        unchanged: reviewState.canvas.students.length - updates.size,
        overrides: reviewState.decisions.overMaximumOverrides.size
      }
    })
    this.render()
    this.focusHeading()
  }

  continue = (): void => {
    if (this.state.step === "review") { this.prepareDownload(); return }
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
      this.focusHeading()
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
      this.focusHeading()
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
      this.focusHeading()
    }
  }

  back = (): void => {
    this.uploadVersion++
    this.state = reduceAppState(this.state, { type: "back" })
    if (this.state.step === "canvas") this.pendingMyLab = null
    this.render()
    this.focusHeading()
  }

  reset = (): void => {
    this.uploadVersion++
    this.pendingCanvas = null
    this.pendingMyLab = null
    this.state = reduceAppState(this.state, { type: "reset" })
    this.render()
    this.focusHeading()
  }

  private focusHeading(): void {
    const heading = this.root.querySelector<HTMLElement>("#page-title")
    if (heading) {
      heading.tabIndex = -1
      heading.focus()
    }
  }

  private render(): void {
    if (this.renderedStep !== this.state.step) {
      this.feedback = { message: "", error: "", busy: false, ready: false }
      this.renderedStep = this.state.step
      if (this.state.step === "assignment-mylab" && this.state.mylab) {
        this.feedback.message = `${this.state.mylab.students.length} students and ${this.state.mylab.sections.length} MyLab sections found.`
      }
    }
    const ready = this.state.step === "canvas" ? this.pendingCanvas !== null
      : this.state.step === "assignment-mylab" && this.state.selectedAssignmentColumn !== null && (this.pendingMyLab !== null || this.state.mylab !== null)
    renderApp(this.root, this.state, this, { ...this.feedback, ready: ready && !this.feedback.busy && !this.feedback.error })
  }

  private setFeedback(message: string, busy: boolean): void {
    this.feedback = { message, busy, error: "", ready: false }
    this.render()
  }

  private showError(message: string): void {
    this.feedback = { message: "", error: message, busy: false, ready: false }
    this.render()
    focusAlert(this.root)
  }

  clearFile(kind: "canvas" | "mylab"): void {
    this.uploadVersion++
    if (kind === "canvas") this.pendingCanvas = null
    else {
      this.pendingMyLab = null
      if (this.state.step === "assignment-mylab") this.state = { ...this.state, mylab: null, mylabFileName: null }
    }
    this.setFeedback("", false)
  }
}
