import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { CopyIcon, RefreshCwIcon, TrashIcon, PaletteIcon, BookmarkIcon, PlusIcon, GaugeIcon, ShieldIcon, GitForkIcon } from "lucide-react"
import { useBrandKit, useUpdateBrandKit } from "@workspace/core/hooks/templates"
import { useTopics, useCreateTopic, useDeleteTopic } from "@workspace/core/hooks/preferences"
import { useRateLimits, useUpsertRateLimit, useDeleteRateLimit } from "@workspace/core/hooks/rate-limits"
import { useSuppressions, useAddSuppression, useDeleteSuppression, useConsentEvents } from "@workspace/core/hooks/compliance"
import { useProviderFallbacks, useCreateProviderFallback, useDeleteProviderFallback } from "@workspace/core/hooks/failover"

const API_KEYS = [
  { id: "key_01", name: "Production", prefix: "rnd_live_k8xP...m3Qa", created: "Jan 12, 2026", lastUsed: "Jun 19, 2026" },
  { id: "key_02", name: "Development", prefix: "rnd_test_aZ2Y...w9Lk", created: "Mar 4, 2026", lastUsed: "Jun 18, 2026" },
]

function SubscriptionsSection() {
  const { data } = useTopics()
  const createTopic = useCreateTopic()
  const deleteTopic = useDeleteTopic()
  const [showForm, setShowForm] = useState(false)
  const [key, setKey] = useState("")
  const [name, setName] = useState("")
  const [isTransactional, setIsTransactional] = useState(false)

  const topics = data?.pages.flatMap((p) => p.data) ?? []

  function handleCreate() {
    if (!key || !name) return
    createTopic.mutate(
      { key, name, transactional: isTransactional, defaultOptIn: true },
      {
        onSuccess: () => {
          setKey("")
          setName("")
          setIsTransactional(false)
          setShowForm(false)
        },
      },
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Subscription topics</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Define categories recipients can opt in or out of.</p>
        </div>
        <div className="flex items-center gap-2">
          <BookmarkIcon className="size-4 text-muted-foreground" />
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
            <PlusIcon className="size-3.5" />
            New topic
          </Button>
        </div>
      </div>

      {showForm && (
        <Card size="sm">
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Key</label>
                <input
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="product_updates"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <input
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Product Updates"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="transactional"
                type="checkbox"
                checked={isTransactional}
                onChange={(e) => setIsTransactional(e.target.checked)}
                className="size-4 rounded border"
              />
              <label htmlFor="transactional" className="text-sm">Transactional (never suppressed by preferences)</label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={createTopic.isPending || !key || !name} onClick={handleCreate}>
                Create
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {topics.length === 0 ? (
        <p className="text-sm text-muted-foreground">No topics yet. Create one to let recipients manage their preferences.</p>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Key</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {topics.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.key}</td>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.transactional ? "Transactional" : "Marketing"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteTopic.mutate(t.id)}
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function RateLimitsSection() {
  const { data } = useRateLimits()
  const upsert = useUpsertRateLimit()
  const deleteRule = useDeleteRateLimit()
  const [showForm, setShowForm] = useState(false)
  const [channel, setChannel] = useState("")
  const [maxCount, setMaxCount] = useState("")
  const [windowSeconds, setWindowSeconds] = useState("")

  const rules = data?.pages.flatMap((p) => p.data) ?? []

  function handleCreate() {
    const mc = parseInt(maxCount, 10)
    const ws = parseInt(windowSeconds, 10)
    if (!channel || isNaN(mc) || isNaN(ws)) return
    upsert.mutate(
      { channel, maxCount: mc, windowSeconds: ws },
      {
        onSuccess: () => {
          setChannel("")
          setMaxCount("")
          setWindowSeconds("")
          setShowForm(false)
        },
      },
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Rate limits</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Limit how many notifications can be sent per channel per time window.</p>
        </div>
        <div className="flex items-center gap-2">
          <GaugeIcon className="size-4 text-muted-foreground" />
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
            <PlusIcon className="size-3.5" />
            Add rule
          </Button>
        </div>
      </div>

      {showForm && (
        <Card size="sm">
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Channel</label>
                <input
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="email"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Max count</label>
                <input
                  type="number"
                  min={1}
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="100"
                  value={maxCount}
                  onChange={(e) => setMaxCount(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Window (seconds)</label>
                <input
                  type="number"
                  min={1}
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="3600"
                  value={windowSeconds}
                  onChange={(e) => setWindowSeconds(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={upsert.isPending || !channel || !maxCount || !windowSeconds} onClick={handleCreate}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rate limit rules. Add one to cap sends per channel per window.</p>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Max sends</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Window</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.channel}</td>
                  <td className="px-4 py-3 font-medium">{r.maxCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.windowSeconds}s</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteRule.mutate(r.id)}
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ComplianceSection() {
  const { data: suppData } = useSuppressions()
  const addSuppression = useAddSuppression()
  const deleteSuppression = useDeleteSuppression()
  const { data: ceData } = useConsentEvents()
  const [showForm, setShowForm] = useState(false)
  const [channel, setChannel] = useState("")
  const [address, setAddress] = useState("")
  const [reason, setReason] = useState<"hard_bounce" | "complaint" | "unsubscribe" | "manual">("manual")

  const suppressions = suppData?.pages.flatMap((p) => p.data) ?? []
  const consentEvents = ceData?.pages.flatMap((p) => p.data) ?? []

  function handleAdd() {
    if (!channel || !address) return
    addSuppression.mutate(
      { channel, address, reason },
      {
        onSuccess: () => {
          setChannel("")
          setAddress("")
          setReason("manual")
          setShowForm(false)
        },
      },
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Compliance</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Suppression list and consent event log.</p>
        </div>
        <ShieldIcon className="size-4 text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Suppression list</p>
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
            <PlusIcon className="size-3.5" />
            Add
          </Button>
        </div>

        {showForm && (
          <Card size="sm">
            <CardContent className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Channel</label>
                  <input
                    className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="email"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Address</label>
                  <input
                    className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="user@example.com"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Reason</label>
                  <select
                    className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={reason}
                    onChange={(e) => setReason(e.target.value as typeof reason)}
                  >
                    <option value="manual">Manual</option>
                    <option value="hard_bounce">Hard bounce</option>
                    <option value="complaint">Complaint</option>
                    <option value="unsubscribe">Unsubscribe</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={addSuppression.isPending || !channel || !address} onClick={handleAdd}>Add</Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {suppressions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No suppressions. Add one to block delivery to a specific address.</p>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Address</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {suppressions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.channel}</td>
                    <td className="px-4 py-3 font-medium">{s.address}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.reason}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteSuppression.mutate(s.id)}
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">Consent event log</p>
        {consentEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No consent events recorded yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Event</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {consentEvents.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${e.event === 'opt_in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {e.event}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.channel}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.source}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(e.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function FailoverSection() {
  const { data } = useProviderFallbacks()
  const createFallback = useCreateProviderFallback()
  const deleteFallback = useDeleteProviderFallback()
  const [showForm, setShowForm] = useState(false)
  const [channel, setChannel] = useState("")
  const [primaryId, setPrimaryId] = useState("")
  const [fallbackId, setFallbackId] = useState("")

  const rules = data?.data ?? []

  function handleCreate() {
    if (!channel || !primaryId || !fallbackId) return
    createFallback.mutate(
      { channel, primaryConnectionId: primaryId, fallbackConnectionId: fallbackId },
      {
        onSuccess: () => {
          setChannel("")
          setPrimaryId("")
          setFallbackId("")
          setShowForm(false)
        },
      },
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Provider failover</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When a channel send fails with a non-retryable error, automatically retry with a fallback connection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GitForkIcon className="size-4 text-muted-foreground" />
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
            <PlusIcon className="size-3.5" />
            Add rule
          </Button>
        </div>
      </div>

      {showForm && (
        <Card size="sm">
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium">Channel</span>
              <input
                className="rounded border border-input bg-background px-3 py-1.5 text-sm"
                placeholder="sms"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium">Primary connection ID</span>
              <input
                className="rounded border border-input bg-background px-3 py-1.5 text-sm font-mono"
                placeholder="connection UUID"
                value={primaryId}
                onChange={(e) => setPrimaryId(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium">Fallback connection ID</span>
              <input
                className="rounded border border-input bg-background px-3 py-1.5 text-sm font-mono"
                placeholder="connection UUID"
                value={fallbackId}
                onChange={(e) => setFallbackId(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createFallback.isPending || !channel || !primaryId || !fallbackId}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rules.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Primary</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fallback</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td className="px-4 py-3 font-medium">{rule.channel}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{rule.primaryConnectionId.slice(0, 8)}…</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{rule.fallbackConnectionId.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => deleteFallback.mutate(rule.id)}
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function BrandKitSection() {
  const { data: kit } = useBrandKit()
  const updateBrandKit = useUpdateBrandKit()
  const [logoUrl, setLogoUrl] = useState(kit?.logoUrl ?? "")
  const [fontStack, setFontStack] = useState(kit?.fontStack ?? "")

  function handleSave() {
    updateBrandKit.mutate({
      logoUrl: logoUrl || null,
      fontStack: fontStack || null,
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Brand kit</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Logo, colors, and font used in email and template rendering.</p>
        </div>
        <PaletteIcon className="size-4 text-muted-foreground" />
      </div>
      <Card size="sm">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-8">
            <div>
              <p className="text-sm font-medium">Logo URL</p>
              <p className="text-xs text-muted-foreground">Absolute URL to your logo image.</p>
            </div>
            <input
              className="w-64 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-8">
            <div>
              <p className="text-sm font-medium">Font stack</p>
              <p className="text-xs text-muted-foreground">CSS font-family value for email templates.</p>
            </div>
            <input
              className="w-64 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={fontStack}
              onChange={(e) => setFontStack(e.target.value)}
              placeholder="Inter, sans-serif"
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" disabled={updateBrandKit.isPending} onClick={handleSave}>Save</Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace, API keys, and notification limits.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium">Workspace</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">General workspace configuration.</p>
        </div>
        <Card size="sm">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-8">
              <div>
                <p className="text-sm font-medium">Workspace name</p>
                <p className="text-xs text-muted-foreground">Shown in the sidebar and notification sender details.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Renderical</span>
                <Button size="sm" variant="outline">Edit</Button>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-8">
              <div>
                <p className="text-sm font-medium">Timezone</p>
                <p className="text-xs text-muted-foreground">Used for schedule evaluation and log timestamps.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">UTC+00:00</span>
                <Button size="sm" variant="outline">Change</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">API keys</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Use these keys to authenticate requests to the Renderical API.</p>
          </div>
          <Button size="sm" className="gap-1.5">
            <RefreshCwIcon className="size-3.5" />
            New key
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Key</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last used</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {API_KEYS.map((k) => (
                <tr key={k.id}>
                  <td className="px-4 py-3 font-medium">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.prefix}</td>
                  <td className="px-4 py-3 text-muted-foreground">{k.created}</td>
                  <td className="px-4 py-3 text-muted-foreground">{k.lastUsed}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <CopyIcon className="size-3.5" />
                      </button>
                      <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <RateLimitsSection />

      <SubscriptionsSection />

      <ComplianceSection />

      <FailoverSection />

      <BrandKitSection />
    </div>
  )
}
