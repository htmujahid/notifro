import { useState } from "react"

import { RecipientsTab } from "./recipients-tab"
import { SegmentsTab } from "./segments-tab"

export function AudiencesView() {
  const [tab, setTab] = useState<"segments" | "contacts">("segments")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audiences</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage contacts and segment them into reusable groups for targeted
            notifications.
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {(["segments", "contacts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "segments" ? <SegmentsTab /> : <RecipientsTab />}
    </div>
  )
}
