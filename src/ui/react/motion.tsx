import type { ReactNode } from "react"
import * as stylex from "@stylexjs/stylex"
import { useEntryAnimation, type EntryAnimationPreset } from "@astryxdesign/core/hooks"
import { VStack } from "@astryxdesign/core/VStack"

// Astryx supplies the compiled animation classes, timing tokens, and reduced-
// motion guard. No application StyleX compiler or custom keyframes are needed.
export function MotionRegion({ children, preset = "slideUp" }: {
  children: ReactNode; preset?: EntryAnimationPreset
}) {
  const animation = useEntryAnimation(preset)
  return <VStack {...stylex.props(animation)}>{children}</VStack>
}
