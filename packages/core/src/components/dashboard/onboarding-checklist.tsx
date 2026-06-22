import { ArrowRightIcon, CheckIcon, Loader2Icon } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { Button } from "@notifro/ui/components/button"

import { useOnboarding, useOverview, useSendTest } from "../../queries/overview"
import { DashboardSkeleton } from "./dashboard-skeleton"

export function OnboardingChecklist() {
  const { data, isLoading } = useOverview()
  const sendTest = useSendTest()
  const onboarding = useOnboarding()

  if (isLoading || !data) return <DashboardSkeleton />

  const { steps, dismissed } = data.onboarding
  if (dismissed) return null

  const STEPS = [
    {
      key: "connect_channel" as const,
      label: "Connect your first channel",
      description:
        "Link an email, SMS, or webhook connection to start sending notifications.",
      done: steps.connect_channel,
      action: (
        <Link to="/channels">
          <Button size="sm" variant="outline">
            Go to Channels <ArrowRightIcon className="ml-1 size-3" />
          </Button>
        </Link>
      ),
    },
    {
      key: "send_test" as const,
      label: "Send a test notification",
      description:
        "Verify your setup by delivering a real in-app notification to yourself.",
      done: steps.send_test,
      action: (
        <Button
          size="sm"
          variant="outline"
          disabled={sendTest.isPending}
          onClick={() =>
            sendTest.mutate(undefined, {
              onSuccess: () =>
                toast.success(
                  "Test notification delivered — check your inbox."
                ),
              onError: (err) =>
                toast.error(err instanceof Error ? err.message : "Send failed"),
            })
          }
        >
          {sendTest.isPending ? (
            <Loader2Icon className="mr-1 size-3 animate-spin" />
          ) : null}
          Send test
        </Button>
      ),
    },
    {
      key: "explore_templates" as const,
      label: "Explore templates",
      description:
        "Browse reusable message templates to speed up future notifications.",
      done: steps.explore_templates,
      action: (
        <Link to="/templates">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onboarding.mutate({ step: "explore_templates", completed: true })
            }
          >
            Go to Templates <ArrowRightIcon className="ml-1 size-3" />
          </Button>
        </Link>
      ),
    },
  ]

  const completedCount = STEPS.filter((s) => s.done).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Get started with Notifro
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete these steps to send your first notification.{" "}
            {completedCount}/{STEPS.length} done.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onboarding.mutate({ dismiss: true })}
          disabled={onboarding.isPending}
        >
          Dismiss
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {STEPS.map((step) => (
          <div
            key={step.key}
            className={`flex items-center gap-4 rounded-xl px-5 py-4 ring-1 transition-colors ${
              step.done
                ? "bg-muted/30 ring-foreground/5"
                : "bg-card ring-foreground/10"
            }`}
          >
            <div
              className={`flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ${
                step.done
                  ? "bg-green-500/10 ring-green-500/30 text-green-600 dark:text-green-400"
                  : "bg-muted ring-foreground/10 text-muted-foreground"
              }`}
            >
              {step.done ? (
                <CheckIcon className="size-4" />
              ) : (
                <span className="text-xs font-medium" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${step.done ? "line-through text-muted-foreground" : ""}`}
              >
                {step.label}
              </p>
              {!step.done && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.description}
                </p>
              )}
            </div>
            {!step.done && <div className="shrink-0">{step.action}</div>}
          </div>
        ))}
      </div>

      {completedCount === STEPS.length && (
        <div className="rounded-xl bg-green-500/10 px-5 py-4 text-sm text-green-700 dark:text-green-400 ring-1 ring-green-500/20">
          All steps complete — your notification pipeline is live.{" "}
          <button
            className="underline underline-offset-2"
            onClick={() => onboarding.mutate({ dismiss: true })}
          >
            Hide this checklist
          </button>
        </div>
      )}
    </div>
  )
}
