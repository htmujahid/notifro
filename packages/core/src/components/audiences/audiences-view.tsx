import { useState } from "react"
import { PlusIcon, UsersIcon, FilterIcon, TrashIcon, EyeIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@workspace/ui/components/empty"
import { useSegments, useCreateSegment, useDeleteSegment, useSegmentPreview, useRecipients, useCreateRecipient, useDeleteRecipient } from "@workspace/core/hooks/audiences"
import type { Segment } from "@workspace/api-client/types"

type FilterOp = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in'

interface FilterClause {
  field: string
  op: FilterOp
  value: string
}

const OP_LABELS: Record<FilterOp, string> = {
  eq: 'equals',
  neq: 'not equals',
  gt: 'greater than',
  lt: 'less than',
  gte: '>=',
  lte: '<=',
  contains: 'contains',
  in: 'is one of',
}

function SegmentPreviewBadge({ segmentId }: { segmentId: string }) {
  const { data } = useSegmentPreview(segmentId)
  if (data == null) return <span className="text-muted-foreground text-xs">—</span>
  return <span className="font-mono text-xs text-muted-foreground">{data.count.toLocaleString()}</span>
}

function FilterBuilder({
  clauses,
  onChange,
}: {
  clauses: FilterClause[]
  onChange: (clauses: FilterClause[]) => void
}) {
  function addClause() {
    onChange([...clauses, { field: '', op: 'eq', value: '' }])
  }

  function removeClause(i: number) {
    onChange(clauses.filter((_, idx) => idx !== i))
  }

  function updateClause(i: number, patch: Partial<FilterClause>) {
    onChange(clauses.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  return (
    <div className="flex flex-col gap-2">
      {clauses.map((clause, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="attribute (e.g. plan)"
            value={clause.field}
            onChange={(e) => updateClause(i, { field: e.target.value })}
            className="w-36"
          />
          <Select value={clause.op} onValueChange={(v) => updateClause(i, { op: v as FilterOp })}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(OP_LABELS) as FilterOp[]).map((op) => (
                <SelectItem key={op} value={op}>{OP_LABELS[op]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="value"
            value={clause.value}
            onChange={(e) => updateClause(i, { value: e.target.value })}
            className="flex-1"
          />
          <Button variant="ghost" size="icon" onClick={() => removeClause(i)}>
            <TrashIcon className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-fit gap-1.5" onClick={addClause}>
        <PlusIcon className="size-3.5" />
        Add condition
      </Button>
    </div>
  )
}

function NewSegmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [clauses, setClauses] = useState<FilterClause[]>([{ field: '', op: 'eq', value: '' }])
  const createSegment = useCreateSegment()

  async function handleCreate() {
    if (!name.trim() || clauses.length === 0) return
    const validClauses = clauses.filter((c) => c.field.trim() && c.value.trim())
    if (validClauses.length === 0) return
    const filter = validClauses.length === 1
      ? validClauses[0]
      : { and: validClauses }
    await createSegment.mutateAsync({ name: name.trim(), filter: filter as Record<string, unknown> })
    setName('')
    setClauses([{ field: '', op: 'eq', value: '' }])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New audience segment</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input placeholder="e.g. Premium users" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Filter conditions (AND)</Label>
            <FilterBuilder clauses={clauses} onChange={setClauses} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createSegment.isPending || !name.trim()}>
            {createSegment.isPending ? 'Creating…' : 'Create segment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SegmentPreviewDialog({ segment, onClose }: { segment: Segment; onClose: () => void }) {
  const { data, isLoading } = useSegmentPreview(segment.id)
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Preview: {segment.name}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                <span className="font-semibold text-foreground">{data?.count ?? 0}</span> matching recipients
              </p>
              {(data?.sample ?? []).length > 0 && (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">ID</th>
                        <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data!.sample.map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}…</td>
                          <td className="px-3 py-2 text-xs">{r.email ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data!.count > data!.sample.length && (
                    <p className="px-3 py-2 text-xs text-muted-foreground border-t">
                      +{data!.count - data!.sample.length} more not shown
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RecipientsTab() {
  const { data, isLoading, fetchNextPage, hasNextPage } = useRecipients()
  const createRecipient = useCreateRecipient()
  const deleteRecipient = useDeleteRecipient()
  const [showAdd, setShowAdd] = useState(false)
  const [email, setEmail] = useState('')
  const [externalId, setExternalId] = useState('')

  const rows = data?.pages.flatMap((p) => p.data) ?? []

  async function handleAdd() {
    if (!email.trim()) return
    await createRecipient.mutateAsync({ email: email.trim(), externalId: externalId.trim() || undefined })
    setEmail('')
    setExternalId('')
    setShowAdd(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Individual contacts imported into the system.</p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
          <PlusIcon className="size-4" />
          Add contact
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-lg border p-4 flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-xs">Email</Label>
              <Input placeholder="contact@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-xs">External ID (optional)</Label>
              <Input placeholder="user_123" value={externalId} onChange={(e) => setExternalId(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={createRecipient.isPending || !email.trim()}>
              {createRecipient.isPending ? 'Adding…' : 'Add'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
            <EmptyTitle>No contacts yet</EmptyTitle>
            <EmptyDescription>Add contacts manually or via the identify API endpoint.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">External ID</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Locale</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">{r.email ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.externalId ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.locale ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRecipient.mutate(r.id)}
                      >
                        <TrashIcon className="size-3.5 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasNextPage && (
            <Button variant="outline" size="sm" className="w-fit" onClick={() => fetchNextPage()}>
              Load more
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function SegmentsTab() {
  const { data, isLoading, fetchNextPage, hasNextPage } = useSegments()
  const deleteSegment = useDeleteSegment()
  const [showNew, setShowNew] = useState(false)
  const [preview, setPreview] = useState<Segment | null>(null)

  const rows = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Reusable filters that resolve to a set of matching contacts.</p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
          <PlusIcon className="size-4" />
          New segment
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FilterIcon /></EmptyMedia>
            <EmptyTitle>No segments yet</EmptyTitle>
            <EmptyDescription>Create attribute-based filters to target groups of contacts.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
              <PlusIcon className="size-4" />
              New segment
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Recipients</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {rows.map((seg) => (
                  <tr key={seg.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                          <UsersIcon className="size-3.5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{seg.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SegmentPreviewBadge segmentId={seg.id} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(seg.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setPreview(seg)}>
                          <EyeIcon className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteSegment.mutate(seg.id)}>
                          <TrashIcon className="size-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasNextPage && (
            <Button variant="outline" size="sm" className="w-fit" onClick={() => fetchNextPage()}>
              Load more
            </Button>
          )}
        </>
      )}

      <NewSegmentDialog open={showNew} onClose={() => setShowNew(false)} />
      {preview && <SegmentPreviewDialog segment={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

export function AudiencesView() {
  const [tab, setTab] = useState<'segments' | 'contacts'>('segments')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audiences</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage contacts and segment them into reusable groups for targeted notifications.
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {(['segments', 'contacts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'segments' ? <SegmentsTab /> : <RecipientsTab />}
    </div>
  )
}
