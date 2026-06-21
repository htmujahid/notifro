import { useState } from "react"

import { ChevronDownIcon } from "lucide-react"

export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium transition-colors hover:text-foreground/80"
      >
        {q}
        <ChevronDownIcon
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <p className="pb-4 text-sm text-muted-foreground">{a}</p>}
    </div>
  )
}
