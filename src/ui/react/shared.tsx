import { HStack } from "@astryxdesign/core/HStack"
import { VStack } from "@astryxdesign/core/VStack"
import { Text, Heading } from "@astryxdesign/core/Text"
import { Tooltip } from "@astryxdesign/core/Tooltip"
import pennStateMark from "../assets/penn-state-mark.png"
import canvasMark from "../assets/canvas-mark.png"

export { HStack, VStack, Text, Heading }
export { pennStateMark, canvasMark }
export const numberText = (value: number | null): string => value === null ? "—" : String(Number(value.toFixed(4)))

export function MatchLogo({ matched }: { matched: boolean }) {
  const label = matched ? "Penn State ID match" : "No Canvas match"
  return <Tooltip content={label} placement="above" focusTrigger="always">
    <img src={matched ? pennStateMark : canvasMark} alt={label} tabIndex={0}
      style={{ inlineSize: "var(--spacing-6)", blockSize: "var(--spacing-6)", objectFit: "contain", filter: matched ? undefined : "grayscale(1)", opacity: matched ? 1 : 0.4 }} />
  </Tooltip>
}

export function PageTitle({ step, title, description }: { step: string; title: string; description: string }) {
  return <VStack gap={2}>
    <Text type="supporting">{step}</Text>
    <Heading level={1} id="page-title" tabIndex={-1}>{title}</Heading>
    <Text color="secondary">{description}</Text>
  </VStack>
}
