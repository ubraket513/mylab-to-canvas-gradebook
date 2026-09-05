import { useEffect, useLayoutEffect, useState, type ReactNode, type RefObject } from "react"
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl"
import { TextInput } from "@astryxdesign/core/TextInput"
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput"
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList"
import { useHoverCard } from "@astryxdesign/core/HoverCard"
import { EmptyState } from "@astryxdesign/core/EmptyState"
import { Button } from "@astryxdesign/core/Button"
import { AppDialog } from "./dialog"
import { MotionRegion } from "./motion"
import { StatusDot } from "@astryxdesign/core/StatusDot"
import { Icon } from "@astryxdesign/core/Icon"
import { Tooltip } from "@astryxdesign/core/Tooltip"
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell, type TableColumn } from "@astryxdesign/core/Table"
import type { ReviewStepState } from "../../app/state"
import type { AppHandlers } from "../../app/handlers"
import type { ReviewRow, ReviewWarningCode } from "../../domain/types"
import { HStack, VStack, Text, PageTitle, MatchLogo, numberText } from "./shared"

const warningLabels: Record<ReviewWarningCode, string> = {
  unmatched: "Unmatched", "ambiguous-match": "Confirm match",
  "blank-canvas-score": "Blank Canvas score", "blank-mylab-score": "Blank MyLab score",
  "invalid-canvas-score": "Invalid Canvas score", "invalid-mylab-score": "Invalid MyLab score",
  "over-assignment-maximum": "Above maximum",
}
type StudentRow = ReviewRow & Record<string, unknown>

function ScoreDetails({ row }: { row: ReviewRow }) {
  return <VStack gap={4}>
      <Text weight="semibold">MyLab score details · {row.studentDisplayName}</Text>
      {row.sectionResults.map(section => <VStack key={section.sectionKey} gap={1}>
        <HStack gap={4} hAlign="between">
          <Text weight="semibold">Section {section.sectionKey}</Text>
          <Text hasTabularNumbers>{numberText(section.adjusted)} / {numberText(section.weight)} points</Text>
        </HStack>
        <Text type="supporting" color="secondary">Raw score: {section.raw.kind === "value" ? `${numberText(section.raw.value * 100)}%` : section.raw.kind === "blank" ? "Blank (treated as zero)" : "Invalid"}</Text>
      </VStack>)}
      <Text weight="semibold" hasTabularNumbers>Total add-on: {numberText(row.myLabAddOn)} points</Text>
    </VStack>
}

function StudentTableRow({ row, children }: { row: ReviewRow; children: ReactNode[] }) {
  const hover = useHoverCard({ label: `Score details for ${row.studentDisplayName}`, placement: "above", alignment: "center", focusTrigger: "always", touchTrigger: "tap" })
  return <TableRow aria-label={`Scores for ${row.studentDisplayName}`}>
    {children.map((cell, index) => <TableCell key={index}
      {...(index === 2 ? { ref: hover.ref, tabIndex: 0, "aria-label": `MyLab add-on for ${row.studentDisplayName}` } : {})}
      style={{ textAlign: index >= 1 && index <= 3 ? "end" : "start" }}>
      {cell}
      {index === 2 && hover.renderHoverCard(<ScoreDetails row={row} />)}
    </TableCell>)}
  </TableRow>
}

function needsAction(row: ReviewRow, state: ReviewStepState): boolean {
  return row.warnings.includes("ambiguous-match") || row.warnings.includes("invalid-canvas-score") || row.warnings.includes("invalid-mylab-score") ||
    (row.warnings.includes("over-assignment-maximum") && row.canvasRowIndex !== null && !state.decisions.overMaximumOverrides.has(row.canvasRowIndex))
}

function Match({ row, state, handlers }: { row: ReviewRow; state: ReviewStepState; handlers: AppHandlers }) {
  if (row.matchStatus === "exact") return <MatchLogo matched />
  if (row.matchStatus === "unmatched") return <MatchLogo matched={false} />
  const match = state.matches.find(item => item.mylabRowIndex === row.mylabRowIndex)
  const resolution = state.decisions.matchResolutions.get(row.mylabRowIndex)
  return <RadioList label={`Choose a Canvas match for ${row.studentDisplayName}`}
    value={resolution === undefined ? "" : resolution === null ? "unchanged" : String(resolution)}
    onChange={value => handlers.resolveMatch(row.mylabRowIndex, value === "unchanged" ? null : Number(value))}>
    {(match?.candidateCanvasRowIndices ?? []).map(index => {
      const candidate = state.canvas.students.find(student => student.rowIndex === index)
      return candidate ? <RadioListItem key={index} value={String(index)} label={`Match ${row.studentDisplayName} to ${candidate.name}`} /> : null
    })}
    <RadioListItem value="unchanged" label={`Leave ${row.studentDisplayName} unchanged`} />
  </RadioList>
}

export function Review({ state, handlers, continueRef }: { state: ReviewStepState; handlers: AppHandlers; continueRef: RefObject<(() => void) | null> }) {
  const [query, setQuery] = useState("")
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [decisionsOpen, setDecisionsOpen] = useState(false)
  const [decisionEdited, setDecisionEdited] = useState(false)
  const [decisionRow, setDecisionRow] = useState<number | null>(null)
  const openDecisions = (rowIndex: number | null) => {
    setDecisionEdited(false)
    setDecisionRow(rowIndex)
    setDecisionsOpen(true)
  }
  useLayoutEffect(() => {
    continueRef.current = () => {
      if (state.review.exportAllowed) handlers.continue()
      else openDecisions(null)
    }
    return () => { continueRef.current = null }
  })
  useEffect(() => {
    if (decisionsOpen && decisionEdited && decisionRow !== null && !state.review.rows.some(row => row.mylabRowIndex === decisionRow && needsAction(row, state))) setDecisionsOpen(false)
  }, [decisionsOpen, decisionEdited, decisionRow, state])
  const columns: TableColumn<StudentRow>[] = [
    { key: "studentDisplayName", header: "Student", renderCell: row => <HStack gap={2} vAlign="center">
      {row.matchStatus === "exact" ? <MatchLogo matched /> : !row.warnings.includes("ambiguous-match") ? (row.canvasRowIndex === null ? <MatchLogo matched={false} /> : <Tooltip content="Canvas match confirmed"><Icon icon="check" color="success" label="Canvas match confirmed" /></Tooltip>) : <Tooltip content="Match conflict — confirm the Canvas student" focusTrigger="always"><Icon icon="warning" color="warning" size="sm" label="Match conflict" tabIndex={0} /></Tooltip>}
      <Text weight="semibold">{row.studentDisplayName}</Text>
    </HStack> },
    { key: "existingCanvasScore", header: "Canvas", align: "end", renderCell: row => <Text hasTabularNumbers>{row.existingCanvasScore?.kind === "value" ? numberText(row.existingCanvasScore.value) : "—"}</Text> },
    { key: "myLabAddOn", header: "MyLab", align: "end", renderCell: row => <Text hasTabularNumbers>{numberText(row.myLabAddOn)}</Text> },
    { key: "newCanvasScore", header: "New score", align: "end", renderCell: row => <Text weight="semibold" hasTabularNumbers>{numberText(row.newCanvasScore)}</Text> },
    { key: "warnings", header: "Status", renderCell: row => <VStack gap={3}>
      {row.warnings.includes("ambiguous-match") && <Button label={`Resolve match for ${row.studentDisplayName}`} size="sm" onClick={() => openDecisions(row.mylabRowIndex)} />}
      {row.warnings.length === 0 ? <HStack gap={2} vAlign="center"><StatusDot variant="success" label="Ready" /><Text>Ready</Text></HStack>
        : <Text type="supporting" style={{ whiteSpace: "nowrap" }}>{row.warnings.map(warning => warningLabels[warning]).join(" · ")}</Text>}
      {row.warnings.includes("over-assignment-maximum") && row.canvasRowIndex !== null && <Button size="sm" label={`${state.decisions.overMaximumOverrides.has(row.canvasRowIndex) ? "Review approval" : "Review score"} for ${row.studentDisplayName}`} onClick={() => openDecisions(row.mylabRowIndex)} />}
    </VStack> },
  ]
  const filtered: StudentRow[] = state.review.rows.filter(row => row.studentDisplayName.toLocaleLowerCase("en-US").includes(query.trim().toLocaleLowerCase("en-US")) && (!attentionOnly || needsAction(row, state))).map(row => ({ ...row }))
  const summary = state.review.summary
  return <VStack gap={6}>
    <PageTitle step="Step 4 of 5: Review scores" title="Review before downloading" description="Nothing changes in Canvas yet. Confirm every warning, then download a new gradebook." />
    <HStack gap={6} wrap="wrap" aria-label="Review summary">
      <Text><Text weight="semibold">{summary.confirmed}</Text> confirmed</Text>
      <Text><Text weight="semibold">{summary.needsConfirmation}</Text> need confirmation</Text>
      <Text><Text weight="semibold">{summary.unmatched}</Text> unmatched</Text>
      <Text><Text weight="semibold">{summary.blankCanvasScores + summary.blankMyLabScores}</Text> blank scores</Text>
      <Text><Text weight="semibold">{summary.overMaximum}</Text> above maximum</Text>
    </HStack>
    <HStack hAlign="between" vAlign="end" wrap="wrap" gap={4}>
      <TextInput label="Find a student" placeholder="Search by name" value={query} onChange={setQuery} hasClear width={280} />

      <SegmentedControl label="Filter students" value={attentionOnly ? "attention" : "all"} onChange={value => setAttentionOnly(value === "attention")}>
        <SegmentedControlItem value="all" label="All students" />
        <SegmentedControlItem value="attention" label="Needs attention" />
      </SegmentedControl>
    </HStack>
    <MotionRegion key={attentionOnly ? "attention" : "all"} preset="fadeIn">
    {filtered.length > 0 ? <Table density="balanced" dividers="rows" verticalAlign="middle" hasHover aria-label="Proposed Canvas gradebook changes"
      style={{ backgroundColor: "var(--color-background-surface)", tableLayout: "fixed", inlineSize: "100%", minInlineSize: "calc(var(--spacing-8) * 24)" }}>
      <TableHeader><TableRow isHeaderRow>{columns.map((column, index) => <TableHeaderCell key={column.key} style={{ inlineSize: ["25%", "10%", "10%", "12%", "43%"][index], textAlign: index >= 1 && index <= 3 ? "end" : "start" }}>{column.header}</TableHeaderCell>)}</TableRow></TableHeader>
      <TableBody>{filtered.map(row => <StudentTableRow key={row.key} row={row}>{columns.map(column => column.renderCell?.(row))}</StudentTableRow>)}</TableBody>
    </Table>
      : <EmptyState isCompact headingLevel={2} title="No students match this view." description="Try another name or clear the filters to see all students."
        actions={<Button label="Clear filters" onClick={() => { setQuery(""); setAttentionOnly(false) }} />} />}
    </MotionRegion>
    <AppDialog title="Review warnings and confirmations" open={decisionsOpen} onOpenChange={setDecisionsOpen}
      actions={decisionRow === null ? <><Button label="Back to review" onClick={() => setDecisionsOpen(false)} /><Button label="Confirm and continue" variant="primary" isDisabled={!state.review.exportAllowed} onClick={() => { setDecisionsOpen(false); handlers.continue() }} /></> : <Button label="Close" onClick={() => setDecisionsOpen(false)} />}>
      <VStack gap={5}>
      {state.review.rows.filter(row => decisionRow === null ? needsAction(row, state) : row.mylabRowIndex === decisionRow).map(row => <VStack key={row.key} gap={3}>
        <Text weight="semibold">{row.studentDisplayName}</Text>
        <Text color="secondary">{row.warnings.map(warning => warningLabels[warning]).join(" · ")}</Text>
        {row.warnings.includes("ambiguous-match") && <Match row={row} state={state} handlers={{ ...handlers, resolveMatch: (index, match) => { setDecisionEdited(true); handlers.resolveMatch(index, match) } }} />}
        {row.warnings.includes("over-assignment-maximum") && row.canvasRowIndex !== null && <CheckboxInput
          label={`Include ${row.studentDisplayName} score above the assignment maximum`}
          value={state.decisions.overMaximumOverrides.has(row.canvasRowIndex)} onChange={checked => { setDecisionEdited(true); handlers.setMaximumOverride(row.canvasRowIndex!, checked) }} />}
      </VStack>)}
    {decisionRow === null && summary.unmatched > 0 && <CheckboxInput label="I understand unmatched students will remain unchanged" value={state.decisions.acknowledgedUnmatched} onChange={checked => handlers.setAcknowledgement("unmatched", checked)} />}
    {decisionRow === null && summary.blankCanvasScores + summary.blankMyLabScores > 0 && <CheckboxInput label="I understand blank scores are treated as zero" value={state.decisions.acknowledgedBlankScores} onChange={checked => handlers.setAcknowledgement("blank", checked)} />}
    {decisionRow === null && <VStack gap={2}>{state.review.blockers.map(blocker => <Text key={blocker}>{blocker}</Text>)}</VStack>}
      </VStack>
    </AppDialog>
  </VStack>
}
