import { useSearchParams } from "react-router"
import { usePreferenceCenter, useUpdatePreferences } from "@workspace/core/hooks/preferences"

export default function PreferencesPage() {
  const [params] = useSearchParams()
  const token = params.get("token") ?? undefined

  const { data, isLoading, isError } = usePreferenceCenter(token)
  const updatePrefs = useUpdatePreferences(token)

  function handleToggle(topicId: string, channel: string, currentValue: boolean) {
    if (!token) return
    updatePrefs.mutate([{ topicId, channel, optedIn: !currentValue }])
  }

  function handleGlobalToggle(channel: string, isOptedOut: boolean) {
    if (!token) return
    updatePrefs.mutate([{ topicId: null, channel, optedIn: !isOptedOut }])
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center">
          <p className="text-sm text-muted-foreground">Invalid preference center link. Please use the link from your email.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading preferences…</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center">
          <p className="text-sm text-muted-foreground">This preference link is invalid or has expired. Please request a new one.</p>
        </div>
      </div>
    )
  }

  const ALL_CHANNELS = ["email", "sms", "push", "in_app", "slack"]

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Email Preferences</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose which notifications you receive and on which channels.
          </p>
        </div>

        {data.topics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscription topics configured.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {data.topics
              .filter((t) => !t.transactional)
              .map((topic) => (
                <div key={topic.topicId} className="rounded-xl border bg-card p-5">
                  <div className="mb-4">
                    <h2 className="font-medium">{topic.name}</h2>
                    {topic.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{topic.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {topic.channels
                      .filter((c) => ALL_CHANNELS.includes(c.channel))
                      .map((ch) => (
                        <div key={ch.channel} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{ch.channel.replace("_", " ")}</span>
                          <button
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                              ch.optedIn ? "bg-primary" : "bg-input"
                            }`}
                            onClick={() => handleToggle(topic.topicId, ch.channel, ch.optedIn)}
                            disabled={updatePrefs.isPending}
                          >
                            <span
                              className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                                ch.optedIn ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        <div className="mt-8 rounded-xl border bg-card p-5">
          <h2 className="mb-1 font-medium">Global opt-out</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Disable a channel entirely across all topics.
          </p>
          <div className="flex flex-col gap-2">
            {ALL_CHANNELS.map((ch) => {
              const isOptedOut = data.globalOptOut.includes(ch)
              return (
                <div key={ch} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{ch.replace("_", " ")}</span>
                  <button
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      !isOptedOut ? "bg-primary" : "bg-input"
                    }`}
                    onClick={() => handleGlobalToggle(ch, isOptedOut)}
                    disabled={updatePrefs.isPending}
                  >
                    <span
                      className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                        !isOptedOut ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          To unsubscribe from all notifications,{" "}
          <a
            href={`/unsubscribe?token=${token}`}
            className="underline underline-offset-2"
          >
            click here
          </a>
          .
        </p>
      </div>
    </div>
  )
}
