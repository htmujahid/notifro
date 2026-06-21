import { StrictMode } from "react"

import "@renderical/ui/globals.css"
import { createRoot } from "react-dom/client"

import { App } from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
