import { useState } from "react"

import { BellOffIcon, CheckCheckIcon, PlusIcon } from "lucide-react"
import { useNavigate } from "react-router"

import type { ListResponse } from "@renderical/api-client/types"
import { PageHeader } from "@renderical/ui-primitives/components/page-header"
import { Button } from "@renderical/ui/components/button"

import { useInbox, useMarkAllRead, useMarkRead } from "../../hooks/inbox"
import type { InboxFilter, InboxMessage } from "../../hooks/inbox"

const TABS: { label: string; value: InboxFilter }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
]

const STATUS_STYLES: Record<string, string> = {
  read: "bg-muted text-muted-foreground",
  unread: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotificationsView() {
  const [activeFilter, setActiveFilter] = useState<InboxFilter>("all")
  const navigate = useNavigate()
  const { data, isLoading, fetchNextPage, hasNextPage } = useInbox(activeFilter)
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const messages =
    data?.pages.flatMap((p: ListResponse<InboxMessage>) => p.data) ?? []

  async function handleMessageClick(id: string, url: string | null) {
    await markRead.mutateAsync(id)
    if (url) navigate(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Your in-app notification inbox."
      >
        {messages.some((m) => !m.readAt) && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheckIcon className="size-4" />
            Mark all read
          </Button>
        )}
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => navigate("/create")}
        >
          <PlusIcon className="size-4" />
          New notification
        </Button>
      </PageHeader>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              activeFilter === tab.value
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BellOffIcon className="mb-3 size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No {activeFilter === "all" ? "" : activeFilter + " "}notifications.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {messages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => handleMessageClick(msg.id, msg.url)}
              className={`w-full text-left rounded-xl p-4 transition-colors ring-1 ring-foreground/10 hover:bg-muted/40 ${!msg.readAt ? "bg-blue-500/5" : "bg-card"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!msg.readAt && (
                      <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                    <span className="font-medium text-sm truncate">
                      {msg.title}
                    </span>
                  </div>
                  {msg.body && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {msg.body}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[msg.readAt ? "read" : "unread"]}`}
                  >
                    {msg.readAt ? "read" : "unread"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            </button>
          ))}
          {hasNextPage && (
            <Button
              variant="outline"
              className="self-center"
              onClick={() => fetchNextPage()}
            >
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
