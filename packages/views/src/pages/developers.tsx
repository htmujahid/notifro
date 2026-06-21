import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { CopyIcon, PlusIcon, TrashIcon, CodeIcon, KeyIcon, ScrollIcon, RefreshCwIcon } from "lucide-react"
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useRequestLog } from "@workspace/core/hooks/developers"
import { useApiClient } from "@workspace/api-client/context"
import type { ApiKeyWithSecret } from "@workspace/api-client/types"

function ApiKeysSection() {
  const { data, isLoading } = useApiKeys()
  const createKey = useCreateApiKey()
  const revokeKey = useRevokeApiKey()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [mode, setMode] = useState<"live" | "test">("live")
  const [newKey, setNewKey] = useState<ApiKeyWithSecret | null>(null)

  const keys = data?.pages.flatMap((p) => p.data) ?? []

  function handleCreate() {
    if (!name) return
    createKey.mutate(
      { name, mode },
      {
        onSuccess: (result) => {
          setNewKey(result)
          setName("")
          setMode("live")
          setShowForm(false)
        },
      },
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">API keys</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Authenticate server-to-server API calls.</p>
        </div>
        <div className="flex items-center gap-2">
          <KeyIcon className="size-4 text-muted-foreground" />
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
            <PlusIcon className="size-3.5" />
            New key
          </Button>
        </div>
      </div>

      {newKey && (
        <Card size="sm" className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="flex flex-col gap-2">
            <p className="text-xs font-medium text-green-800 dark:text-green-200">
              Key created. Copy it now — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-background px-2 py-1 text-xs font-mono">{newKey.key}</code>
              <Button
                size="icon"
                variant="outline"
                className="size-7 shrink-0"
                onClick={() => navigator.clipboard.writeText(newKey.key)}
              >
                <CopyIcon className="size-3.5" />
              </Button>
            </div>
            <Button size="sm" variant="outline" className="self-start" onClick={() => setNewKey(null)}>
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card size="sm">
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <input
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="My key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Mode</label>
                <select
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "live" | "test")}
                >
                  <option value="live">Live</option>
                  <option value="test">Test (sandbox)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={createKey.isPending || !name} onClick={handleCreate}>
                Create
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="text-xs text-muted-foreground">No API keys yet.</p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center gap-3 px-4 py-3">
              <Badge variant={key.metadata?.mode === "test" ? "secondary" : "default"} className="shrink-0 text-xs">
                {key.metadata?.mode ?? "live"}
              </Badge>
              <span className="flex-1 font-mono text-xs">{key.start ?? key.prefix}…</span>
              <span className="text-xs text-muted-foreground">{key.name}</span>
              <span className="text-xs text-muted-foreground">last used: {key.lastRequest ? new Date(key.lastRequest).toLocaleDateString() : "never"}</span>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-destructive hover:text-destructive"
                onClick={() => revokeKey.mutate(key.id)}
              >
                <TrashIcon className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function RequestLogSection() {
  const { data, isLoading, refetch, isFetching } = useRequestLog({ limit: 20 })
  const rows = data?.data ?? []

  function statusColor(status: number) {
    if (status < 300) return "text-green-600 dark:text-green-400"
    if (status < 400) return "text-yellow-600 dark:text-yellow-400"
    return "text-destructive"
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Request log</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Recent API calls authenticated to your account.</p>
        </div>
        <div className="flex items-center gap-2">
          <ScrollIcon className="size-4 text-muted-foreground" />
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCwIcon className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No requests logged yet.</p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
              <span className="w-12 font-mono font-medium uppercase">{row.method}</span>
              <span className={`w-12 font-mono font-semibold ${statusColor(row.status)}`}>{row.status}</span>
              <span className="flex-1 font-mono text-muted-foreground">{row.path}</span>
              {row.latencyMs != null && (
                <span className="w-16 text-right text-muted-foreground">{row.latencyMs}ms</span>
              )}
              <span className="w-24 text-right text-muted-foreground">{new Date(row.createdAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function SandboxPanel() {
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
      }, )
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
          <p className="mt-0.5 text-xs text-muted-foreground">Render a payload without sending. Uses your session auth.</p>
        </div>
      </div>

      <Card size="sm">
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Channel</label>
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
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <input
                className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="user@example.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <input
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Hello"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Body</label>
            <textarea
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Message body…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={loading || !to || !body} onClick={handleSandboxPreview}>
              {loading ? "Previewing…" : "Preview (sandbox)"}
            </Button>
            <Button size="sm" variant="outline" disabled={loading || !to || !body} onClick={handlePreview}>
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

export default function DevelopersPage() {
  return (
    <div className="flex flex-col gap-8 p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-lg font-semibold">Developers</h1>
        <p className="mt-1 text-sm text-muted-foreground">API keys, request inspector, and sandbox testing.</p>
      </div>

      <ApiKeysSection />
      <SandboxPanel />
      <RequestLogSection />
    </div>
  )
}
