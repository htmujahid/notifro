import React from "react"

import {
  LayersIcon,
  PlusIcon,
  TagIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"

import type { Segment } from "@renderical/api-client/types"
import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import { SectionHeader } from "@renderical/ui-primitives/components/section-header"
import { Badge } from "@renderical/ui/components/badge"
import { Button } from "@renderical/ui/components/button"

import {
  useDeleteRecipient,
  useDeleteSegment,
  useRecipients,
  useSegments,
} from "../../hooks/audiences"
import { useDeleteTopic, useTopics } from "../../hooks/preferences"
import { CreateRecipientDialog } from "./create-recipient-dialog"
import { CreateSegmentDialog } from "./create-segment-dialog"
import { CreateTopicDialog } from "./create-topic-dialog"

const TABS = ["Recipients", "Segments", "Topics"] as const
type Tab = (typeof TABS)[number]

function summarizeFilter(raw: string): string {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return "invalid filter"
  }
  const keys = Object.keys(parsed)
  if (keys.length === 0) return "all recipients"
  return Object.entries(parsed)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(", ")
}

export function AudiencesView() {
  const [activeTab, setActiveTab] = React.useState<Tab>("Recipients")
  const [newRecipientOpen, setNewRecipientOpen] = React.useState(false)
  const [newSegmentOpen, setNewSegmentOpen] = React.useState(false)
  const [newTopicOpen, setNewTopicOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audiences"
        description="Manage recipients, segments, and preference topics."
      />

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
              activeTab === tab
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Recipients" && (
        <RecipientsSection onCreate={() => setNewRecipientOpen(true)} />
      )}
      {activeTab === "Segments" && (
        <SegmentsSection onCreate={() => setNewSegmentOpen(true)} />
      )}
      {activeTab === "Topics" && (
        <TopicsSection onCreate={() => setNewTopicOpen(true)} />
      )}

      <CreateRecipientDialog
        open={newRecipientOpen}
        onOpenChange={setNewRecipientOpen}
      />
      <CreateSegmentDialog
        open={newSegmentOpen}
        onOpenChange={setNewSegmentOpen}
      />
      <CreateTopicDialog open={newTopicOpen} onOpenChange={setNewTopicOpen} />
    </div>
  )
}

function RecipientsSection({ onCreate }: { onCreate: () => void }) {
  const query = useRecipients()
  const deleteRecipient = useDeleteRecipient()
  const recipients = query.data?.pages.flatMap((p) => p.data) ?? []

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={
          <>
            <UsersIcon className="size-4" /> Recipients
          </>
        }
      >
        <Button size="sm" onClick={onCreate}>
          <PlusIcon className="size-3.5 mr-1" /> Add recipient
        </Button>
      </SectionHeader>

      {recipients.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No recipients yet. Add recipients to start sending notifications.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  External ID
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Locale
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Timezone
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Created
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {recipients.map((recipient) => (
                <tr
                  key={recipient.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">{recipient.email ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {recipient.externalId ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {recipient.locale ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {recipient.timezone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(recipient.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => deleteRecipient.mutate(recipient.id)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </section>
  )
}

function SegmentsSection({ onCreate }: { onCreate: () => void }) {
  const query = useSegments()
  const deleteSegment = useDeleteSegment()
  const segments: Segment[] = query.data?.pages.flatMap((p) => p.data) ?? []

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={
          <>
            <LayersIcon className="size-4" /> Segments
          </>
        }
      >
        <Button size="sm" onClick={onCreate}>
          <PlusIcon className="size-3.5 mr-1" /> New segment
        </Button>
      </SectionHeader>

      {segments.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No segments yet. Segments group recipients by a filter.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className="flex items-start justify-between rounded-xl border p-4"
            >
              <div>
                <p className="font-medium">{segment.name}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {summarizeFilter(segment.filter)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground shrink-0"
                onClick={() => deleteSegment.mutate(segment.id)}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </section>
  )
}

function TopicsSection({ onCreate }: { onCreate: () => void }) {
  const query = useTopics()
  const deleteTopic = useDeleteTopic()
  const topics = query.data?.pages.flatMap((p) => p.data) ?? []

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={
          <>
            <TagIcon className="size-4" /> Topics
          </>
        }
      >
        <Button size="sm" onClick={onCreate}>
          <PlusIcon className="size-3.5 mr-1" /> New topic
        </Button>
      </SectionHeader>

      {topics.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No topics yet. Topics let recipients manage their preferences.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Key
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Transactional
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Default opt-in
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {topics.map((topic) => (
                <tr
                  key={topic.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-mono text-xs">{topic.key}</td>
                  <td className="px-4 py-3">{topic.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {topic.description ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">
                      {topic.transactional === 1
                        ? "transactional"
                        : "marketing"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">
                      {topic.defaultOptIn === 1 ? "opted in" : "opt-out"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => deleteTopic.mutate(topic.id)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </section>
  )
}
