import { createRoot } from "react-dom/client"
import "./ui/styles"
import { CrashReportPage } from "./ui/react/info-pages"

const root = document.querySelector<HTMLElement>("#page")
if (!root) throw new Error("Page root is missing")

createRoot(root).render(<CrashReportPage />)
