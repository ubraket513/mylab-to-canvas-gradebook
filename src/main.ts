import { AppController } from "./app/controller"
import "@astryxdesign/core/reset.css"
import "@astryxdesign/core/astryx.css"
import "@fontsource-variable/google-sans-flex"
import "./themes/neutral/penn-state.css"
import "./ui/accessibility.css"
import pennStateMark from "./ui/assets/penn-state-mark.png"
import canvasMark from "./ui/assets/canvas-mark.png"

// Fetch local artwork with the initial page so review also works offline.
for (const href of [pennStateMark, canvasMark]) {
  const preload = document.createElement("link")
  preload.rel = "preload"
  preload.as = "image"
  preload.href = href
  document.head.append(preload)
}

const root = document.querySelector<HTMLElement>("#app")
if (!root) throw new Error("Application root is missing")

new AppController(root).start()
