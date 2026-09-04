/// <reference lib="webworker" />

import { parseCsvText } from "./parse"

self.addEventListener("message", (event: MessageEvent<string>) => {
  self.postMessage(parseCsvText(event.data))
})
