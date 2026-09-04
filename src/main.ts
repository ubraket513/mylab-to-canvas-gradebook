import { AppController } from "./app/controller"
import "./ui/styles.css"

const root = document.querySelector<HTMLElement>("#app")
if (!root) throw new Error("Application root is missing")

new AppController(root).start()
