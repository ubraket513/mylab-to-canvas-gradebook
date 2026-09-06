import { APP_NAME, ISSUES_URL } from "../config"

export interface RequestType { value: string; label: string; issueLabel: string }

export const REQUEST_TYPES: RequestType[] = [
  { value: "bug", label: "Something is broken", issueLabel: "bug" },
  { value: "suggestion", label: "Suggestion or feature request", issueLabel: "enhancement" },
  { value: "question", label: "Question about using the app", issueLabel: "question" }
]

export const SUMMARY_LIMIT = 120
export const DETAILS_LIMIT = 4000

/**
 * Builds a prefilled GitHub issue URL. Nothing is transmitted by this app: the instructor reviews the
 * issue on GitHub and decides whether to submit it. Fields are clamped so the URL stays well inside the
 * roughly 8 KiB that servers and browsers accept.
 */
export function issueUrl(type: string, summary: string, details: string, userAgent: string): string {
  const requestType = REQUEST_TYPES.find((option) => option.value === type)
  const body = [
    `**Type:** ${requestType?.label ?? type}`,
    "",
    "**What happened**",
    details.trim().slice(0, DETAILS_LIMIT) || "_Not provided_",
    "",
    "**Browser**",
    userAgent.slice(0, 512),
    "",
    `_Filed from ${APP_NAME}. No gradebook data is included._`
  ].join("\n")
  const query = new URLSearchParams({
    title: summary.trim().slice(0, SUMMARY_LIMIT),
    body,
    labels: requestType?.issueLabel ?? ""
  })
  return `${ISSUES_URL}?${query.toString()}`
}
