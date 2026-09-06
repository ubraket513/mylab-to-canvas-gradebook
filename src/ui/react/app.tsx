import { useRef, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { Theme } from "@astryxdesign/core/theme"
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout"
import { Button } from "@astryxdesign/core/Button"
import { Stepper, Step } from "@astryxdesign/core/Stepper"
import { useMediaQuery } from "@astryxdesign/core/hooks"
import { LayerProvider } from "@astryxdesign/core/Layer"
import { pennStateTheme } from "../../themes/neutral/penn-state"
import type { AppState } from "../../app/state"
import type { AppHandlers, UploadFeedback } from "../../app/handlers"
import { HStack, VStack, Text } from "./shared"
import { CanvasUpload, AssignmentUpload } from "./uploads"
import { Configure } from "./configure"
import { Review } from "./review"
import { Download, SaveActions } from "./download"
import { MotionRegion } from "./motion"
import { AppHeader } from "./header"
import { AUTHOR, AUTHOR_AFFILIATION, DEVELOPED_YEAR } from "../../config"

const steps = ["canvas", "assignment-mylab", "configure", "review", "download"] as const
const labels = ["Canvas file", "MyLab file", "Grading rules", "Review scores", "Download"]
interface Props { state: AppState; handlers: AppHandlers; feedback: UploadFeedback }

function App({ state, handlers, feedback }: Props) {
  const continueRef = useRef<(() => void) | null>(null)
  const [valid, setValid] = useState(true)
  const current = steps.indexOf(state.step)
  const isNarrow = useMediaQuery("(max-width: 40rem)")
  return <Theme theme={pennStateTheme} mode="light">
    <LayerProvider toast={{ position: "bottomStart" }}>
    <Layout height="fill" contentWidth={800} padding={6} defaultHasDividers
      style={{ blockSize: "100dvh", backgroundColor: "var(--color-background-body)" }}
      header={<AppHeader page="app" />}
      content={<LayoutContent role="main" id="main-content" tabIndex={-1} isScrollable style={{ scrollbarGutter: "stable" }}>
        <VStack gap={6}>
          <Stepper activeStep={current} label="Progress" orientation={isNarrow ? "vertical" : "horizontal"} density="compact">
            {steps.map((step, index) => <Step key={step} step={index} label={labels[index]!} />)}
          </Stepper>
          <MotionRegion key={state.step}>
          {state.step === "canvas" && <CanvasUpload handlers={handlers} feedback={feedback} />}
          {state.step === "assignment-mylab" && <AssignmentUpload state={state} handlers={handlers} feedback={feedback} />}
          {state.step === "configure" && <Configure state={state} handlers={handlers} onValidity={setValid} continueRef={continueRef} />}
          {state.step === "review" && <Review state={state} handlers={handlers} continueRef={continueRef} />}
          {state.step === "download" && <Download state={state} />}
          </MotionRegion>
        </VStack>
      </LayoutContent>}
      footer={<LayoutFooter aria-label="Workflow actions" style={{ backgroundColor: "var(--color-background-surface)" }}>
        <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
          {state.step === "canvas" ? <Text type="supporting">Developed by {AUTHOR} at {AUTHOR_AFFILIATION}, {DEVELOPED_YEAR}</Text> : <Button label="Back" onClick={() => { setValid(true); handlers.back() }} />}
          {state.step === "download" && <HStack gap={4} vAlign="center"><Button label="Start over" onClick={() => { setValid(true); handlers.reset() }} /><SaveActions handlers={handlers} /></HStack>}
          {state.step !== "download" && <Button label={state.step === "review" ? "Continue to download" : state.step === "configure" ? "Continue to review" : "Continue"} variant="primary"
            isDisabled={state.step === "review" ? false : state.step === "configure" ? !valid : !feedback.ready}
            onClick={() => { if (state.step === "configure" || state.step === "review") continueRef.current?.(); else handlers.continue() }} />}
        </HStack>
      </LayoutFooter>} />
    </LayerProvider>
  </Theme>
}

const roots = new WeakMap<HTMLElement, Root>()
export function renderApp(element: HTMLElement, state: AppState, handlers: AppHandlers, feedback: UploadFeedback): void {
  let root = roots.get(element)
  if (!root) { root = createRoot(element); roots.set(element, root) }
  // The controller focuses headings/alerts after a navigation or parse completes.
  flushSync(() => root.render(<App state={state} handlers={handlers} feedback={feedback} />))
}
