import { ArrowLeft, Info } from "lucide-react"
import { LayoutHeader } from "@astryxdesign/core/Layout"
import { Button } from "@astryxdesign/core/Button"
import { HStack, Text, pennStateMark } from "./shared"
import { REPOSITORY_URL } from "../../config"

// GitHub's own mark; lucide-react dropped brand glyphs, so the path is inlined here.
function GitHubMark() {
  return <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true">
    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
  </svg>
}

/**
 * The header every document shares. The trailing control differs by page: the workflow offers the
 * information pages, and those offer the way back, because a control that reopens the page you are on is
 * a dead control.
 */
export function AppHeader({ page }: { page: "app" | "info" }) {
  return <LayoutHeader label="Gradebook application" style={{ backgroundColor: "var(--color-background-surface)" }}>
    <HStack hAlign="between" vAlign="center" gap={3}>
      <HStack gap={3} vAlign="center">
        <img src={pennStateMark} alt="Penn State"
          style={{ inlineSize: "var(--spacing-8)", blockSize: "var(--spacing-8)", objectFit: "contain" }} />
        <Text type="large" weight="semibold" color="accent">MyLab to Canvas</Text>
      </HStack>
      <HStack gap={1} vAlign="center">
        <Button label="View the project on GitHub" isIconOnly variant="ghost" icon={<GitHubMark />}
          href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" />
        {page === "app"
          ? <Button label="Help, privacy, and license" isIconOnly variant="ghost"
              icon={<Info size="1em" aria-hidden="true" />} href="/crash-report.html" target="_blank" />
          : <Button label="Back to the app" isIconOnly variant="ghost"
              icon={<ArrowLeft size="1em" aria-hidden="true" />} href="/" />}
      </HStack>
    </HStack>
  </LayoutHeader>
}
