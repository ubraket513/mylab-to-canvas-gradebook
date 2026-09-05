export interface AppHandlers {
  selectCanvasFile(file: File): Promise<void>
  selectAssignment(columnIndex: number): void
  selectMyLabFile(file: File): Promise<void>
  clearFile(kind: "canvas" | "mylab"): void
  setThreshold(percent: number): void
  setWeight(sectionKey: string, weight: number): void
  resolveMatch(mylabRowIndex: number, canvasRowIndex: number | null): void
  setAcknowledgement(kind: "unmatched" | "blank", checked: boolean): void
  setMaximumOverride(canvasRowIndex: number, checked: boolean): void
  continue(): void
  back(): void
  download(saveAs?: boolean): Promise<"downloaded" | "saved" | "cancelled">
  reset(): void
}

export interface UploadFeedback {
  message: string
  error: string
  busy: boolean
  ready: boolean
}
