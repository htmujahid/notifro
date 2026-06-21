import { useEffect } from "react"
import { useUnsubscribeInfo, useUnsubscribe } from "../../hooks/preferences"

export function UnsubscribeView({ token }: { token?: string }) {
  const { data: info, isLoading, isError } = useUnsubscribeInfo(token)
  const unsubscribe = useUnsubscribe(token)

  useEffect(() => {
    if (info?.ok && !unsubscribe.isSuccess && !unsubscribe.isPending) {
      unsubscribe.mutate()
    }
  }, [info])

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center">
          <p className="text-sm text-muted-foreground">Invalid unsubscribe link.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Processing…</p>
      </div>
    )
  }

  if (isError || !info?.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center">
          <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  if (unsubscribe.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Unsubscribing…</p>
      </div>
    )
  }

  if (unsubscribe.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center">
          <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg className="h-6 w-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold">You&apos;ve been unsubscribed</h1>
        {info.email && (
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium">{info.email}</span> has been removed from all mailing lists.
          </p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Want to manage individual topics instead?{" "}
          <a
            href={`/preferences?token=${token}`}
            className="underline underline-offset-2"
          >
            Update preferences
          </a>
        </p>
      </div>
    </div>
  )
}
