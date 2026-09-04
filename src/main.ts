import { APP_NAME } from "./config"
import "./ui/styles.css"

const root = document.querySelector<HTMLElement>("#app")
if (!root) throw new Error("Application root is missing")

const main = document.createElement("main")
main.id = "main-content"
const heading = document.createElement("h1")
heading.textContent = APP_NAME
main.append(heading)
root.append(main)
