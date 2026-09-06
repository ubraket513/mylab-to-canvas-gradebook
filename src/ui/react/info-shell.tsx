import type { ReactNode } from "react"
import { Layout, LayoutContent, LayoutFooter, LayoutPanel } from "@astryxdesign/core/Layout"
import { Theme } from "@astryxdesign/core/theme"
import { List, ListItem } from "@astryxdesign/core/List"
import { useMediaQuery } from "@astryxdesign/core/hooks"
import { pennStateTheme } from "../../themes/neutral/penn-state"
import { AppHeader } from "./header"
import { HStack, VStack, Text, Heading } from "./shared"
import { AUTHOR, AUTHOR_AFFILIATION, DEVELOPED_YEAR } from "../../config"

export type InfoPageId = "crash-report" | "privacy" | "license"

const pages: { id: InfoPageId; label: string; href: string }[] = [
  { id: "crash-report", label: "Crash report", href: "/crash-report.html" },
  { id: "privacy", label: "Privacy policy", href: "/privacy.html" },
  { id: "license", label: "License", href: "/license.html" }
]

/**
 * Frame shared by the three information pages. Same header and footer treatment as the workflow, with a
 * link rail for the routes between them; the footer credits the author and carries no controls.
 */
export function InfoPage({ current, title, description, children }: {
  current: InfoPageId; title: string; description: string; children: ReactNode
}) {
  const isNarrow = useMediaQuery("(max-width: 60rem)")
  // A List, not SideNav: three static links need rows, and SideNav carries its own 260px rail width,
  // which overflows any panel narrower than that.
  const nav = <List density="compact">
    {pages.map((page) =>
      <ListItem key={page.id} label={page.label} href={page.href} isSelected={page.id === current}
        aria-current={page.id === current ? "page" : undefined} />)}
  </List>
  return <Theme theme={pennStateTheme} mode="light">
    <Layout height="fill" contentWidth={900} padding={6} defaultHasDividers
      style={{ blockSize: "100dvh", backgroundColor: "var(--color-background-body)" }}
      header={<AppHeader page="info" />}
      start={isNarrow ? undefined
        : <LayoutPanel width={180} role="navigation" label="Help pages">{nav}</LayoutPanel>}
      content={<LayoutContent role="main" id="main-content" tabIndex={-1} isScrollable
        style={{ scrollbarGutter: "stable" }}>
        <VStack gap={5}>
          {isNarrow ? nav : null}
          <VStack gap={1}>
            <Heading level={1} id="page-title" tabIndex={-1}>{title}</Heading>
            <Text color="secondary">{description}</Text>
          </VStack>
          {children}
        </VStack>
      </LayoutContent>}
      footer={<LayoutFooter aria-label="Credit"
        style={{ backgroundColor: "var(--color-background-surface)" }}>
        <HStack vAlign="center">
          <Text type="supporting">
            Developed by {AUTHOR} at {AUTHOR_AFFILIATION}, {DEVELOPED_YEAR}
          </Text>
        </HStack>
      </LayoutFooter>} />
  </Theme>
}
