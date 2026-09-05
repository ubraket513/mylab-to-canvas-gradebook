import type { ReactNode } from "react"
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog"
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout"
import { HStack } from "./shared"

export function AppDialog({ title, open, onOpenChange, children, actions }: {
  title: string; open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode; actions: ReactNode
}) {
  return <Dialog isOpen={open} onOpenChange={onOpenChange} purpose="form" width={640}>
    <Layout header={<DialogHeader title={title} onOpenChange={onOpenChange} />}
      content={<LayoutContent>{children}</LayoutContent>}
      footer={<LayoutFooter><HStack gap={3} wrap="wrap" hAlign="end">{actions}</HStack></LayoutFooter>} />
  </Dialog>
}
