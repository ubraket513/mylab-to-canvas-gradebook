import { useState, type ReactNode } from "react"
import { Banner } from "@astryxdesign/core/Banner"
import { Button } from "@astryxdesign/core/Button"
import { Link } from "@astryxdesign/core/Link"
import { List, ListItem } from "@astryxdesign/core/List"
import { Selector } from "@astryxdesign/core/Selector"
import { TextInput } from "@astryxdesign/core/TextInput"
import { TextArea } from "@astryxdesign/core/TextArea"
import { DETAILS_LIMIT, REQUEST_TYPES, SUMMARY_LIMIT, issueUrl } from "../../app/issue-report"
import { InfoPage } from "./info-shell"
import { HStack, VStack, Text, Heading } from "./shared"
import { APP_NAME, AUTHOR, DEVELOPED_YEAR, ISSUES_URL, LICENSE_NAME, REPOSITORY_URL } from "../../config"

const privacyUpdated = "6 September 2026"

/** A heading and the prose it introduces, kept together so the page reads as blocks rather than a flat list. */
function Block({ title, children }: { title: string; children: ReactNode }) {
  return <VStack gap={2}>
    <Heading level={2}>{title}</Heading>
    {children}
  </VStack>
}

export function CrashReportPage() {
  const [type, setType] = useState(REQUEST_TYPES[0]!.value)
  const [summary, setSummary] = useState("")
  const [details, setDetails] = useState("")
  return <InfoPage current="crash-report" title="Crash report"
    description="Report something that went wrong, or suggest something that could work better. Nothing is sent
      automatically: this app has no crash reporting and no telemetry.">
    <VStack gap={5}>
      <Banner status="warning" collapsible={false} title="Do not include student data"
        description="Leave out student names, PSU IDs, email addresses, and scores. GitHub issues are public." />
      <VStack gap={3}>
        <Selector label="What kind of report is this?" value={type} onChange={setType}
          options={REQUEST_TYPES.map(({ value, label }) => ({ value, label }))} />
        <TextInput label="Summary" value={summary} onChange={setSummary} isRequired
          placeholder="Short description of the problem or idea" />
        <TextArea label="Details" value={details} onChange={setDetails} rows={5} maxLength={DETAILS_LIMIT}
          placeholder="What you expected, what happened instead, and the steps that led there." />
      </VStack>
      <VStack gap={2}>
        <HStack gap={3} wrap="wrap" vAlign="center">
          <Button label="Continue on GitHub" variant="primary" isDisabled={summary.trim() === ""}
            target="_blank" rel="noopener noreferrer"
            href={issueUrl(type, summary, details, navigator.userAgent)} />
          <Link href={ISSUES_URL.replace("/new", "")} isExternalLink isStandalone>Browse existing reports</Link>
        </HStack>
        <Text type="supporting">
          Opens a prefilled issue in a new tab. Nothing is submitted until you press submit on GitHub, which
          needs a free account.
        </Text>
      </VStack>
    </VStack>
  </InfoPage>
}

export function PrivacyPage() {
  return <InfoPage current="privacy" title="Privacy policy"
    description={`What ${APP_NAME} stores, and what it never collects.`}>
    <VStack gap={5}>
      <Text type="supporting">Last updated {privacyUpdated}</Text>

      <Block title="Gradebook files never leave your device">
        <Text color="secondary">
          The Canvas and MyLab CSV files you add are read and processed entirely inside your browser tab. They
          are not uploaded, copied to a server, or shared with anyone. The downloaded result is produced locally
          by your browser.
        </Text>
        <Text color="secondary">
          The app makes no network requests while you use it. Its Content Security Policy sets connect-src
          'none', so the page is blocked from contacting any server, including ours. Once the page has loaded you
          can disconnect from the network and the whole workflow still works.
        </Text>
      </Block>

      <Block title="What is stored on your device">
        <Text color="secondary">
          One value is saved in your browser's local storage under the key mylab-canvas.threshold: the
          whole-number full-credit threshold you last chose, so it is ready the next time you open the app. It
          contains no student data. Nothing else persists. Uploaded files, computed scores, and review decisions
          are held in memory only and disappear when you close or reload the tab.
        </Text>
      </Block>

      <Block title="No tracking">
        <List listStyle="disc" density="compact">
          <ListItem label="No analytics, telemetry, or crash reporting of any kind." />
          <ListItem label="No cookies." />
          <ListItem label="No advertising or third-party scripts." />
          <ListItem label="No account, sign-in, or identifier of any kind." />
        </List>
      </Block>

      <Block title="Reporting a problem">
        <Text color="secondary">
          The crash report form sends nothing on its own. It assembles the text you typed into a link and opens a
          prefilled issue form on GitHub in a new tab. Nothing is submitted until you press the submit button on
          GitHub, and only what you can see in that form is sent. GitHub issues are public, so leave student
          names, PSU IDs, email addresses, scores, and gradebook files out of a report. Once you leave for
          GitHub, that site's own privacy statement applies.
        </Text>
      </Block>

      <Block title="Hosting">
        <Text color="secondary">
          The app is served as static files. The host that delivers those files may keep ordinary web server
          access logs, such as IP address, timestamp, and requested file. Those logs are produced by the hosting
          provider in the course of serving the page and are not used by this app.
        </Text>
      </Block>

      <Block title="Your responsibilities as an instructor">
        <Text color="secondary">
          Student grade records are protected under FERPA. Use this tool on a device you control, review every
          proposed change before accepting it, and always check Canvas's own import preview before confirming a
          grade upload. This app is an unofficial helper and is not a Penn State, Instructure, or Pearson
          product.
        </Text>
      </Block>
    </VStack>
  </InfoPage>
}

export function LicensePage() {
  return <InfoPage current="license" title="License"
    description="The terms this app is published under, and the components it is built from.">
    <VStack gap={5}>
      <VStack gap={1}>
        <Text type="supporting">{LICENSE_NAME}</Text>
        <Text color="secondary">
          {APP_NAME} is free software released under the MIT License. Copyright © {DEVELOPED_YEAR} {AUTHOR}.
        </Text>
      </VStack>

      <Block title="What this means">
        <List listStyle="disc" density="compact">
          <ListItem label="You may use, copy, modify, merge, publish, distribute, sublicense, and sell this software." />
          <ListItem label="Keep the copyright notice and the permission notice in any copy you distribute." />
          <ListItem label="The software is provided without warranty of any kind." />
        </List>
        <Text type="supporting">
          This summary is for orientation only and has no legal effect. The license text is what applies.
        </Text>
      </Block>

      <Block title="Source and full text">
        <List hasDividers density="compact">
          <ListItem label="MIT License" description="Repository file LICENSE"
            href={`${REPOSITORY_URL}/blob/master/LICENSE`} target="_blank" />
          <ListItem label="Source code" description="Everything needed to build the JavaScript your browser ran"
            href={REPOSITORY_URL} target="_blank" />
        </List>
      </Block>

      <Block title="Third-party components">
        <List listStyle="disc" density="compact">
          <ListItem label="React and React DOM — MIT" />
          <ListItem label="Astryx design system (@astryxdesign/core, @astryxdesign/theme-neutral)" />
          <ListItem label="Lucide icons (lucide-react) — ISC" />
          <ListItem label="Papa Parse (papaparse) — MIT" />
          <ListItem label="StyleX (@stylexjs/stylex) — MIT" />
          <ListItem label="Google Sans Flex via @fontsource-variable/google-sans-flex" />
        </List>
      </Block>

      <Block title="Trademarks">
        <Text color="secondary">
          Penn State, Canvas, Instructure, MyLab, and Pearson are trademarks of their respective owners. The
          GitHub logo is a trademark of GitHub, Inc. and is shown only to link to the project repository. This is
          an unofficial helper and is not affiliated with, endorsed by, or produced by any of them.
        </Text>
      </Block>
    </VStack>
  </InfoPage>
}
