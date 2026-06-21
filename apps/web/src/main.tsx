import { StrictMode } from "react"

import "@workspace/ui/globals.css"
import { createRoot } from "react-dom/client"

import { App } from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
