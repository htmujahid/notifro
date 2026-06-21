import { useState } from "react"

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}
