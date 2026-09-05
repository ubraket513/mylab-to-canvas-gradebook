import type { DownloadStepState } from "../../app/state"
import { useRef, useState } from "react"
import { Button } from "@astryxdesign/core/Button"
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu"
import { Icon } from "@astryxdesign/core/Icon"
import { ButtonGroup } from "@astryxdesign/core/ButtonGroup"
import { useToast } from "@astryxdesign/core/Toast"
import type { AppHandlers } from "../../app/handlers"
import { supportsSaveAs } from "../download-file"
import { AppDialog } from "./dialog"
import { HStack, VStack, Text, Heading, PageTitle } from "./shared"

export function Download({ state }: { state: DownloadStepState }) {
  return <VStack gap={6}>
    <PageTitle step="Step 5 of 5: Save gradebook" title="Your updated gradebook is ready" description="Save the CSV or choose Save as from the arrow menu. You can return to review before or after saving." />
    <HStack gap={6} wrap="wrap" aria-label="Download summary">
      <Text><Text weight="semibold">{state.summary.updated}</Text> updated</Text>
      <Text><Text weight="semibold">{state.summary.unchanged}</Text> unchanged</Text>
      <Text><Text weight="semibold">{state.summary.overrides}</Text> above-maximum approvals</Text>
    </HStack>
    <Text color="secondary">Your files remain only in this tab so you can go back or save again. Start over clears them.</Text>
    <VStack gap={3}>
      <Heading level={2}>Import it into Penn State Canvas</Heading>
      <Text>1. Open Grades in your Canvas course and choose Import.</Text>
      <Text>2. Select the downloaded canvas-gradebook-updated CSV file.</Text>
      <Text>3. Review Canvas's import preview carefully, then accept the changes.</Text>
    </VStack>

  </VStack>
}

export function SaveActions({ handlers }: { handlers: AppHandlers }) {
  const toast = useToast()
  const inFlight = useRef(false)
  const [saving, setSaving] = useState<"download" | "save" | null>(null)
  const [failed, setFailed] = useState(false)
  const save = async (saveAs: boolean) => {
    if (inFlight.current) return
    inFlight.current = true
    setSaving(saveAs ? "save" : "download")
    try {
      const result = await handlers.download(saveAs)
      toast({ body: result === "saved" ? "Gradebook saved to your chosen location." : result === "cancelled" ? "Save cancelled. Your gradebook is still ready." : "Gradebook download started.", uniqueID: "gradebook-save" })
    } catch { setFailed(true) }
    finally { inFlight.current = false; setSaving(null) }
  }
  return <>
    <ButtonGroup label="Save gradebook">
      <Button label="Save" variant="primary" isLoading={saving !== null} onClick={() => void save(false)} />
      <DropdownMenu button={{ label: "Save options", variant: "primary", style: { borderInlineStartColor: "var(--color-on-dark)" }, isIconOnly: true, icon: <Icon icon="chevronDown" color="inherit" /> }}
        hasChevron={false} placement="above" alignment="end" menuWidth={240}
        items={[{ label: "Save as…", onClick: () => void save(true), isDisabled: !supportsSaveAs(),
          description: supportsSaveAs() ? "Choose a name and location" : "Use your browser's download settings to choose a location" }]} />
    </ButtonGroup>
    <AppDialog title="The gradebook could not be saved" open={failed} onOpenChange={setFailed}
      actions={<Button label="Back to save options" onClick={() => setFailed(false)} />}>
      <Text>Your review is still available. Check the destination permissions, choose another location, or use Save.</Text>
    </AppDialog>
  </>
}
