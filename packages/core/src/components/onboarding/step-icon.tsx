import { CheckIcon } from "lucide-react"

export function StepIcon({ done }: { done: boolean }) {
  return (
    <div
      className={`flex size-9 shrink-0 items-center justify-center rounded-full ring-2 transition-colors ${
        done
          ? "bg-green-500/10 ring-green-500/40 text-green-600 dark:text-green-400"
          : "bg-muted ring-border text-muted-foreground"
      }`}
    >
      {done ? <CheckIcon className="size-4" /> : <span className="size-2 rounded-full bg-current opacity-40" />}
    </div>
  )
}
