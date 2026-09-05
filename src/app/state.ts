import { buildReviewModel } from "../domain/review-policy"
import type {
  CanvasGradebook,
  MyLabGradebook,
  ReviewDecisions,
  ReviewModel,
  StudentMatch
} from "../domain/types"

interface BaseState {
  threshold: number
}

export interface CanvasStepState extends BaseState {
  step: "canvas"
}

export interface AssignmentMyLabStepState extends BaseState {
  step: "assignment-mylab"
  canvasFileName: string
  canvas: CanvasGradebook
  selectedAssignmentColumn: number | null
  mylabFileName: string | null
  mylab: MyLabGradebook | null
}

interface ConfiguredData extends BaseState {
  canvasFileName: string
  canvas: CanvasGradebook
  selectedAssignmentColumn: number
  mylabFileName: string
  mylab: MyLabGradebook
  weights: ReadonlyMap<string, number>
}

export interface ConfigureStepState extends ConfiguredData {
  step: "configure"
}

export interface ReviewStepState extends ConfiguredData {
  step: "review"
  matches: readonly StudentMatch[]
  decisions: ReviewDecisions
  review: ReviewModel
}

export interface DownloadStepState extends BaseState {
  step: "download"
  reviewState: ReviewStepState
  summary: { updated: number; unchanged: number; overrides: number }
}

export type AppState =
  | CanvasStepState
  | AssignmentMyLabStepState
  | ConfigureStepState
  | ReviewStepState
  | DownloadStepState

export type AppAction =
  | { type: "canvas-loaded"; fileName: string; canvas: CanvasGradebook }
  | { type: "assignment-selected"; columnIndex: number }
  | { type: "mylab-loaded"; fileName: string; mylab: MyLabGradebook }
  | { type: "threshold-changed"; threshold: number }
  | { type: "weight-changed"; sectionKey: string; weight: number }
  | {
      type: "review-prepared"
      matches: readonly StudentMatch[]
      decisions: ReviewDecisions
      review: ReviewModel
    }
  | { type: "match-resolved"; mylabRowIndex: number; canvasRowIndex: number | null }
  | { type: "acknowledgement-changed"; kind: "unmatched" | "blank"; checked: boolean }
  | { type: "maximum-override-changed"; canvasRowIndex: number; checked: boolean }
  | { type: "download-completed"; summary: DownloadStepState["summary"] }
  | { type: "back" }
  | { type: "reset" }

export function createInitialState(threshold: number): AppState {
  return { step: "canvas", threshold }
}

function toAssignmentStep(
  state: AssignmentMyLabStepState | ConfigureStepState | ReviewStepState,
  selectedAssignmentColumn = state.selectedAssignmentColumn
): AssignmentMyLabStepState {
  return {
    step: "assignment-mylab",
    threshold: state.threshold,
    canvasFileName: state.canvasFileName,
    canvas: state.canvas,
    selectedAssignmentColumn,
    mylabFileName: state.mylabFileName,
    mylab: state.mylab
  }
}

function toConfigureStep(
  state: ConfigureStepState | ReviewStepState,
  changes: Partial<Pick<ConfiguredData, "threshold" | "weights">> = {}
): ConfigureStepState {
  return {
    step: "configure",
    threshold: changes.threshold ?? state.threshold,
    canvasFileName: state.canvasFileName,
    canvas: state.canvas,
    selectedAssignmentColumn: state.selectedAssignmentColumn,
    mylabFileName: state.mylabFileName,
    mylab: state.mylab,
    weights: changes.weights ?? state.weights
  }
}

function updateReview(state: ReviewStepState, decisions: ReviewDecisions): ReviewStepState {
  const assignment = state.canvas.assignments.find(
    ({ columnIndex }) => columnIndex === state.selectedAssignmentColumn
  )
  if (!assignment) return state

  return {
    ...state,
    decisions,
    review: buildReviewModel({
      canvas: state.canvas,
      assignment,
      mylab: state.mylab,
      weights: state.weights,
      threshold: state.threshold,
      matches: state.matches,
      decisions
    })
  }
}

export function reduceAppState(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "canvas-loaded":
      return {
        step: "assignment-mylab",
        threshold: state.threshold,
        canvasFileName: action.fileName,
        canvas: action.canvas,
        selectedAssignmentColumn: null,
        mylabFileName: null,
        mylab: null
      }
    case "assignment-selected":
      if (state.step === "canvas" || state.step === "download") return state
      return toAssignmentStep(state, action.columnIndex)
    case "mylab-loaded": {
      if (state.step === "canvas" || state.step === "download") return state
      const selectedAssignmentColumn = state.selectedAssignmentColumn
      if (selectedAssignmentColumn === null) {
        return {
          ...toAssignmentStep(state),
          mylabFileName: action.fileName,
          mylab: action.mylab
        }
      }
      return {
        step: "configure",
        threshold: state.threshold,
        canvasFileName: state.canvasFileName,
        canvas: state.canvas,
        selectedAssignmentColumn,
        mylabFileName: action.fileName,
        mylab: action.mylab,
        weights: new Map(action.mylab.sections.map((section) => [section.key, section.detectedWeight]))
      }
    }
    case "threshold-changed":
      if (state.step === "configure" || state.step === "review") {
        return toConfigureStep(state, { threshold: action.threshold })
      }
      return { ...state, threshold: action.threshold }
    case "weight-changed": {
      if (state.step !== "configure" && state.step !== "review") return state
      const weights = new Map(state.weights)
      weights.set(action.sectionKey, action.weight)
      return toConfigureStep(state, { weights })
    }
    case "review-prepared":
      if (state.step !== "configure") return state
      return {
        ...state,
        step: "review",
        matches: action.matches,
        decisions: action.decisions,
        review: action.review
      }
    case "match-resolved": {
      if (state.step !== "review") return state
      const matchResolutions = new Map(state.decisions.matchResolutions)
      matchResolutions.set(action.mylabRowIndex, action.canvasRowIndex)
      return updateReview(state, { ...state.decisions, matchResolutions })
    }
    case "acknowledgement-changed":
      if (state.step !== "review") return state
      return updateReview(state, {
        ...state.decisions,
        ...(action.kind === "unmatched"
          ? { acknowledgedUnmatched: action.checked }
          : { acknowledgedBlankScores: action.checked })
      })
    case "maximum-override-changed": {
      if (state.step !== "review") return state
      const overMaximumOverrides = new Set(state.decisions.overMaximumOverrides)
      if (action.checked) overMaximumOverrides.add(action.canvasRowIndex)
      else overMaximumOverrides.delete(action.canvasRowIndex)
      return updateReview(state, { ...state.decisions, overMaximumOverrides })
    }
    case "download-completed":
      if (state.step !== "review") return state
      return { step: "download", threshold: state.threshold, summary: action.summary, reviewState: state }
    case "back":
      if (state.step === "download") return state.reviewState
      if (state.step === "assignment-mylab") return createInitialState(state.threshold)
      if (state.step === "configure") return toAssignmentStep(state)
      if (state.step === "review") return toConfigureStep(state)
      return state
    case "reset":
      return createInitialState(state.threshold)
  }
}
