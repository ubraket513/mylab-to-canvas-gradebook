import { useEffect, useRef, useState } from "react"
import { FileInput } from "@astryxdesign/core/FileInput"
import { Selector } from "@astryxdesign/core/Selector"
import { Collapsible } from "@astryxdesign/core/Collapsible"
import { useToast } from "@astryxdesign/core/Toast"
import { MAX_CSV_BYTES } from "../../config"
import type { AppHandlers, UploadFeedback } from "../../app/handlers"
import type { AssignmentMyLabStepState } from "../../app/state"
import { VStack, Text, Heading, PageTitle } from "./shared"

function Picker({ kind, handlers, feedback }: { kind: "canvas" | "mylab"; handlers: AppHandlers; feedback: UploadFeedback }) {
  const [file, setFile] = useState<File | null>(null)
  const toast = useToast()
  const notification = useRef<(() => void) | null>(null)
  const feedbackKey = `${feedback.busy}:${feedback.message}:${feedback.error}`
  const previousFeedback = useRef(feedbackKey)
  useEffect(() => {
    if (previousFeedback.current === feedbackKey) return
    previousFeedback.current = feedbackKey
    notification.current?.()
    notification.current = null
    if (feedback.busy) return
    const body = feedback.error || feedback.message
    if (body) notification.current = toast({ body, type: feedback.error ? "error" : "info", uniqueID: `upload-${kind}` })
  }, [feedbackKey, feedback.busy, feedback.error, feedback.message, kind, toast])
  const selectFile = (selected: File | null) => {
    setFile(selected)
    if (!selected) handlers.clearFile(kind)
    else if (kind === "canvas") void handlers.selectCanvasFile(selected)
    else void handlers.selectMyLabFile(selected)
  }
  // Route rejected files through the same controller validation as CSV parsing,
  // before FileInput can display its own inline error. Keep its native CSV filter.
  const rejected = (selected: File | undefined) => selected && (!selected.name.toLowerCase().endsWith(".csv") || selected.size > MAX_CSV_BYTES)
  return <VStack gap={4}
    onChangeCapture={event => {
      if (!(event.target instanceof HTMLInputElement) || event.target.type !== "file") return
      const selected = event.target.files?.[0]
      if (rejected(selected)) { event.stopPropagation(); event.target.value = ""; selectFile(selected!) }
    }}
    onDropCapture={event => {
      const selected = event.dataTransfer.files[0]
      if (!feedback.busy && rejected(selected)) { event.preventDefault(); event.stopPropagation(); selectFile(selected!) }
    }}>
    <FileInput label={kind === "canvas" ? "Canvas gradebook CSV" : "MyLab gradebook CSV"}
      description={kind === "canvas" ? "Use the complete gradebook export from Penn State Canvas. Maximum file size: 25 MB." : "Choose the detailed MyLab gradebook CSV for this assignment."}
      value={file} accept=".csv" maxSize={MAX_CSV_BYTES} mode="dropzone" placeholder="Choose CSV file"
      {...(feedback.error ? { status: { type: "error" as const } } : {})}
      isLoading={feedback.busy} isDisabled={feedback.busy}
      onChange={files => {
        const selected = Array.isArray(files) ? files[0] ?? null : files
        selectFile(selected)
      }} />
  </VStack>
}

export function CanvasUpload({ handlers, feedback }: { handlers: AppHandlers; feedback: UploadFeedback }) {
  return <VStack gap={6}>
    <PageTitle step="Step 1 of 5: Upload Canvas gradebook" title="Prepare your Canvas gradebook" description="Add MyLab scores to one Canvas assignment without changing the rest of your gradebook." />
    <VStack gap={3}>
      <Heading level={2}>How it works</Heading>
      <Text>1. Upload the gradebook CSV you downloaded from Penn State Canvas.</Text>
      <Text>2. Choose an assignment, upload MyLab, and review every proposed change.</Text>
      <Text>3. Download a new CSV and check Canvas's import preview before accepting it.</Text>
    </VStack>
    <Text color="secondary">Your gradebook stays in this browser tab. It is not uploaded to a server.</Text>
    <Picker kind="canvas" handlers={handlers} feedback={feedback} />
  </VStack>
}

export function AssignmentUpload({ state, handlers, feedback }: { state: AssignmentMyLabStepState; handlers: AppHandlers; feedback: UploadFeedback }) {
  return <VStack gap={6}>
    <PageTitle step="Step 2 of 5: Choose assignment and MyLab file" title="Choose what to update" description="Select one Canvas assignment, then add the matching MyLab gradebook." />
    <Text color="secondary">Canvas file: {state.canvasFileName}</Text>
    <Selector label="Canvas assignment" placeholder="Choose an assignment" value={state.selectedAssignmentColumn === null ? "" : String(state.selectedAssignmentColumn)}
      options={state.canvas.assignments.map(item => ({ value: String(item.columnIndex), label: `${item.name} — ${item.pointsPossible} points` }))}
      onChange={value => handlers.selectAssignment(Number(value))} />
    <Collapsible trigger="How to download these files" defaultIsOpen={false}>
      <VStack gap={2}>
        <Text>Canvas: open Grades, choose Actions, then Export Entire Gradebook.</Text>
        <Text>MyLab: open the gradebook, choose Export Data, and save the detailed CSV.</Text>
      </VStack>
    </Collapsible>
    {state.mylabFileName && <Text color="secondary">MyLab file: {state.mylabFileName}</Text>}
    <Picker kind="mylab" handlers={handlers} feedback={feedback} />
  </VStack>
}
