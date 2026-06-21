import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { CopyIcon, RefreshCwIcon, TrashIcon, PaletteIcon, BookmarkIcon, PlusIcon, ShieldIcon } from "lucide-react"
import { useBrandKit, useUpdateBrandKit } from "@workspace/core/hooks/templates"
import { useTopics, useCreateTopic, useDeleteTopic } from "@workspace/core/hooks/preferences"
import { useFrequencyCaps, useCreateFrequencyCap, useDeleteFrequencyCap, useDigestRules, useCreateDigestRule, useDeleteDigestRule } from "@workspace/core/hooks/throttling"

const API_KEYS = [
  { id: "key_01", name: "Production", prefix: "rnd_live_k8xP...m3Qa", created: "Jan 12, 2026", lastUsed: "Jun 19, 2026" },
  { id: "key_02", name: "Development", prefix: "rnd_test_aZ2Y...w9Lk", created: "Mar 4, 2026", lastUsed: "Jun 18, 2026" },
]

const RATE_LIMITS = [
  { channel: "Email", limit: "10,000 / day", used: "1,284", pct: 13 },
  { channel: "Slack", limit: "5,000 / day", used: "842", pct: 17 },
  { channel: "Push", limit: "50,000 / day", used: "3,210", pct: 6 },
  { channel: "Webhook", limit: "20,000 / day", used: "438", pct: 2 },
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

function DeliveryLimitsSection() {
  const { data: capsData } = useFrequencyCaps()
  const { data: rulesData } = useDigestRules()
  const createCap = useCreateFrequencyCap()
  const deleteCap = useDeleteFrequencyCap()
  const createRule = useCreateDigestRule()
  const deleteRule = useDeleteDigestRule()

  const [showCapForm, setShowCapForm] = useState(false)
  const [capChannel, setCapChannel] = useState("email")
  const [capMax, setCapMax] = useState("")
  const [capWindow, setCapWindow] = useState("")
  const [capPolicy, setCapPolicy] = useState<"drop" | "defer" | "digest">("drop")

  const [showRuleForm, setShowRuleForm] = useState(false)
  const [ruleChannel, setRuleChannel] = useState("email")
  const [ruleKey, setRuleKey] = useState("")
  const [ruleSchedule, setRuleSchedule] = useState<"hourly" | "daily" | "weekly">("daily")

  const caps = capsData?.pages.flatMap((p) => p.data) ?? []
  const rules = rulesData?.pages.flatMap((p) => p.data) ?? []

  function handleCreateCap() {
    if (!capMax || !capWindow) return
    createCap.mutate(
      { channel: capChannel, maxCount: Number(capMax), windowSeconds: Number(capWindow), overflowPolicy: capPolicy },
      { onSuccess: () => { setCapChannel("email"); setCapMax(""); setCapWindow(""); setCapPolicy("drop"); setShowCapForm(false) } },
    )
  }

  function handleCreateRule() {
    if (!ruleKey) return
    createRule.mutate(
      { channel: ruleChannel, digestKey: ruleKey, schedule: ruleSchedule },
      { onSuccess: () => { setRuleChannel("email"); setRuleKey(""); setRuleSchedule("daily"); setShowRuleForm(false) } },
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Delivery limits</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Frequency caps and digest rules to prevent recipient overload.</p>
        </div>
        <ShieldIcon className="size-4 text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Frequency caps</p>
          <Button size="sm" className="gap-1.5" onClick={() => setShowCapForm((v) => !v)}>
            <PlusIcon className="size-3.5" />
            New cap
          </Button>
        </div>

        {showCapForm && (
          <Card size="sm">
            <CardContent className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Channel</label>
                  <input
                    className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="email"
                    value={capChannel}
                    onChange={(e) => setCapChannel(e.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Max count</label>
                  <input
                    type="number"
                    className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="5"
                    value={capMax}
                    onChange={(e) => setCapMax(e.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Window (seconds)</label>
                  <input
                    type="number"
                    className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="3600"
                    value={capWindow}
                    onChange={(e) => setCapWindow(e.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Overflow</label>
                  <select
                    className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={capPolicy}
                    onChange={(e) => setCapPolicy(e.target.value as "drop" | "defer" | "digest")}
                  >
                    <option value="drop">Drop</option>
                    <option value="defer">Defer</option>
                    <option value="digest">Digest</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={createCap.isPending || !capMax || !capWindow} onClick={handleCreateCap}>
                  Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCapForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {caps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No frequency caps. Recipients receive unlimited notifications by default.</p>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Limit</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Window</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Overflow</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {caps.map((cap) => (
                  <tr key={cap.id}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{cap.channel}</td>
                    <td className="px-4 py-3">{cap.maxCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">{cap.windowSeconds}s</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{cap.overflowPolicy}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteCap.mutate(cap.id)}
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Digest rules</p>
          <Button size="sm" className="gap-1.5" onClick={() => setShowRuleForm((v) => !v)}>
            <PlusIcon className="size-3.5" />
            New rule
          </Button>
        </div>

        {showRuleForm && (
          <Card size="sm">
            <CardContent className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Channel</label>
                  <input
                    className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="email"
                    value={ruleChannel}
                    onChange={(e) => setRuleChannel(e.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Digest key</label>
                  <input
                    className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="daily-digest"
                    value={ruleKey}
                    onChange={(e) => setRuleKey(e.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Schedule</label>
                  <select
                    className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={ruleSchedule}
                    onChange={(e) => setRuleSchedule(e.target.value as "hourly" | "daily" | "weekly")}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={createRule.isPending || !ruleKey} onClick={handleCreateRule}>
                  Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowRuleForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No digest rules. Notifications are sent immediately by default.</p>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Key</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Schedule</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{rule.channel}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{rule.digestKey}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{rule.schedule}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteRule.mutate(rule.id)}
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

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium">Rate limits</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Current usage against your plan limits. Resets daily at midnight UTC.</p>
        </div>
        <div className="flex flex-col gap-3">
          {RATE_LIMITS.map((r) => (
            <div key={r.channel} className="flex items-center gap-4 rounded-xl bg-card px-5 py-4 ring-1 ring-foreground/10">
              <div className="w-20 shrink-0 text-sm font-medium">{r.channel}</div>
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.used}</span> / {r.limit}
              </div>
            </div>
          ))}
        </div>
      </section>

      <SubscriptionsSection />

      <DeliveryLimitsSection />

      <BrandKitSection />
    </div>
  )
}
