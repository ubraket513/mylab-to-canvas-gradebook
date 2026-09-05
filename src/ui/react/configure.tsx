import { useEffect, useLayoutEffect, useState, type RefObject } from "react"
import { TextInput } from "@astryxdesign/core/TextInput"
import { Minus, Plus } from "lucide-react"
import { Slider } from "@astryxdesign/core/Slider"
import { IconButton } from "@astryxdesign/core/IconButton"
import { Icon } from "@astryxdesign/core/Icon"
import { Banner } from "@astryxdesign/core/Banner"
import { Button } from "@astryxdesign/core/Button"
import { AppDialog } from "./dialog"
import type { ConfigureStepState } from "../../app/state"
import type { AppHandlers } from "../../app/handlers"
import { adjustSectionScore } from "../../domain/score"
import { readCanvasScore } from "../../csv/canvas"
import { HStack, VStack, Text, PageTitle, numberText } from "./shared"

// TextInput preserves intermediate edits (empty, negative, decimal) so validation
// never silently clamps a grading rule before the instructor can review it.
export function Configure({ state, handlers, onValidity, continueRef }: { state: ConfigureStepState; handlers: AppHandlers; onValidity: (valid: boolean) => void; continueRef: RefObject<(() => void) | null> }) {
  const [threshold, setThreshold] = useState(String(Math.round(state.threshold * 100)))
  const [weights, setWeights] = useState(() => new Map([...state.weights].map(([key, value]) => [key, numberText(value)])))
  const [editingThreshold, setEditingThreshold] = useState(false)
  const [committedThreshold, setCommittedThreshold] = useState(Math.round(state.threshold * 100))
  const [splitOpen, setSplitOpen] = useState(false)
  const thresholdValid = (value: string) => value.trim() !== "" && /^\d+$/.test(value) && Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 100
  const changeThreshold = (value: number) => { setThreshold(numberText(value)); setCommittedThreshold(value); handlers.setThreshold(value) }
  const weightValid = (value: string) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0
  const weightsValid = [...weights.values()].every(weightValid)
  const total = [...weights.values()].reduce((sum, value) => sum + (weightValid(value) ? Number(value) : 0), 0)
  const assignment = state.canvas.assignments.find(item => item.columnIndex === state.selectedAssignmentColumn)!
  const recordedScores = state.canvas.students.map(student => readCanvasScore(state.canvas, assignment, student.rowIndex)).flatMap(score => score.kind === "value" ? [score.value] : score.kind === "blank" ? [0] : [])
  const highestCanvasScore = recordedScores.reduce((highest, score) => Math.max(highest, score), 0)
  const roomForCanvas = assignment.pointsPossible - total
  const mismatch = weightsValid && (roomForCanvas < -0.000001 || highestCanvasScore > roomForCanvas + 0.000001)
  const canContinue = thresholdValid(threshold) && weightsValid
  useEffect(() => { onValidity(canContinue) }, [canContinue, onValidity])
  useLayoutEffect(() => {
    continueRef.current = () => {
      if (!canContinue) return
      if (Number(threshold) !== state.threshold * 100) changeThreshold(Number(threshold))
      if (mismatch) setSplitOpen(true)
      else handlers.continue()
    }
    return () => { continueRef.current = null }
  })
  const finishThresholdEdit = () => {
    if (thresholdValid(threshold)) { changeThreshold(Number(threshold)); setEditingThreshold(false) }
  }
  const firstWeight = [...state.weights.values()].find(value => value > 0) ?? 0
  const adjusted = adjustSectionScore(0.45, committedThreshold / 100, firstWeight)
  return <VStack gap={6}>
    <PageTitle step="Step 3 of 5: Configure grading" title="Set the grading rules" description="Check the full-credit threshold and the point value for each MyLab section." />
    <Banner status="info" title={`${assignment.name}: ${numberText(assignment.pointsPossible)} points possible`} collapsible={false}>
      <VStack gap={2}>
        <Text>Canvas assignment maximum: {numberText(assignment.pointsPossible)} points</Text>
        <Text>MyLab allocation: {weightsValid ? numberText(total) : "—"} points</Text>
        <Text>{!weightsValid ? "Finish entering valid section points to see the split." : roomForCanvas >= 0 ? `Room for existing Canvas scores: ${numberText(roomForCanvas)} points` : `MyLab alone exceeds the maximum by ${numberText(-roomForCanvas)} points.`}</Text>
        <Text color="secondary">Highest recorded Canvas score: {numberText(highestCanvasScore)} points. MyLab points are added to existing scores; those scores are not rescaled.</Text>
      </VStack>
    </Banner>
    <VStack gap={3}>
      <Text weight="semibold">Full-credit threshold</Text>
      <HStack gap={4} vAlign="center">
        <IconButton label="Decrease threshold" tooltip="Decrease by 1 percentage point" icon={<Icon icon={Minus} />} isDisabled={Number(threshold) <= 1} onClick={() => changeThreshold(Math.max(1, (thresholdValid(threshold) ? Number(threshold) : state.threshold * 100) - 1))} />
        <Slider label="Adjust full-credit threshold" isLabelHidden width="100%" min={1} max={100} step={1}
          value={thresholdValid(threshold) ? Number(threshold) : state.threshold * 100} onChange={(value: number) => setThreshold(String(value))} onChangeEnd={changeThreshold}
          valueDisplay="none" formatValue={value => `${numberText(value)}%`} />
        {editingThreshold ? <TextInput label="Full-credit threshold" isLabelHidden hasAutoFocus value={threshold} width="8ch" statusVariant="detached"
          onChange={setThreshold} onBlur={finishThresholdEdit} onEnter={finishThresholdEdit}
          onKeyDown={event => { if (event.key === "Escape") { setThreshold(String(committedThreshold)); setEditingThreshold(false) } }} />
          : <Button label={`${threshold}%`} aria-label="Edit full-credit threshold" variant="ghost"
            style={{ inlineSize: "8ch", flexShrink: 0, textDecorationLine: "underline", fontVariantNumeric: "tabular-nums" }}
            onClick={() => setEditingThreshold(true)} />}
        <IconButton label="Increase threshold" tooltip="Increase by 1 percentage point" icon={<Icon icon={Plus} />} isDisabled={Number(threshold) >= 100} onClick={() => changeThreshold(Math.min(100, (thresholdValid(threshold) ? Number(threshold) : state.threshold * 100) + 1))} />
      </HStack>
      {!thresholdValid(threshold) && <Text role="alert">Enter a whole-number percentage from 1 to 100.</Text>}
      <Text color="secondary">Percent required for full credit (1–100).</Text>
    </VStack>
    <HStack wrap="wrap" gap={5}>
      {state.mylab.sections.map(section => {
        const value = weights.get(section.key) ?? ""
        return <TextInput key={section.key} label={`Points for section ${section.key}`} value={value} width="18ch" statusVariant="detached"
          onChange={next => { const updated = new Map(weights).set(section.key, next); setWeights(updated); handlers.setWeight(section.key, weightValid(next) ? Number(next) : NaN) }}
          {...(!weightValid(value) ? { status: { type: "error" as const, message: "Enter zero or a positive number." } }
            : Number(value) === 0 ? { description: "This section will add no points." } : {})} />
      })}
    </HStack>
    <VStack gap={2}>
      <Text weight="semibold">Maximum MyLab add-on: {weightsValid ? numberText(total) : "—"} points</Text>
      <Text color="secondary">At {numberText(committedThreshold)}%, a MyLab score of 45% receives a {Math.round(100 - committedThreshold)}% bonus, rounds up to {firstWeight ? Math.round(adjusted / firstWeight * 100) : 0}%, and earns {numberText(adjusted)} of {numberText(firstWeight)} points.</Text>
    </VStack>

    <AppDialog title="Is this score split intentional?" open={splitOpen} onOpenChange={setSplitOpen}
      actions={<><Button label="Edit points" onClick={() => setSplitOpen(false)} /><Button label="Use this split" variant="primary" onClick={() => { setSplitOpen(false); handlers.continue() }} /></>}>
      <VStack gap={4}>
        <Text>The highest recorded Canvas score plus full MyLab credit would be {numberText(highestCanvasScore + total)} points, above the {numberText(assignment.pointsPossible)}-point assignment maximum. Actual results depend on each student's scores and match.</Text>
        <Text>Adjust the section points, or confirm to review the results. Above-maximum student scores still require individual approval on step 4.</Text>
      </VStack>
    </AppDialog>
  </VStack>
}
