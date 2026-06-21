import { useState } from "react"

import { useApiClient } from "@renderical/api-client/context"
import { Button } from "@renderical/ui/components/button"
import { Card, CardContent } from "@renderical/ui/components/card"
import { CodeIcon } from "lucide-react"

export function SandboxPanel() {
  const api = useApiClient()
  const [channel, setChannel] = useState("email")
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [result, setResult] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePreview() {
    if (!to || !body) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<unknown>("/api/notifications", {
        content: { subject, body: { text: body } },
        recipient: { type: "contact", email: to },
        channels: [channel],
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleSandboxPreview() {
    if (!to || !body) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${api.baseURL}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Renderical-Sandbox": "true",
        },
        credentials: "include",
        body: JSON.stringify({
          content: { subject, body: { text: body } },
          recipient: { type: "contact", email: to },
          channels: [channel],
        }),
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <CodeIcon className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-medium">Sandbox preview</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Render a payload without sending. Uses your session auth.
          </p>
        </div>
      </div>

      <Card size="sm">
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Channel
              </label>
              <select
                className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="email">Email</option>
                <option value="in_app">In-app</option>
                <option value="sms">SMS</option>
                <option value="slack">Slack</option>
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                To
              </label>
              <input
                className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="user@example.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Subject
            </label>
            <input
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Hello"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Body
            </label>
            <textarea
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Message body…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={loading || !to || !body}
              onClick={handleSandboxPreview}
            >
              {loading ? "Previewing…" : "Preview (sandbox)"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={loading || !to || !body}
              onClick={handlePreview}
            >
              Send (real)
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {result !== null && (
            <pre className="rounded bg-muted px-3 py-2 text-xs overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
