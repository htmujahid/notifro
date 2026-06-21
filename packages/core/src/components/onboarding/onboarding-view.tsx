import { Button } from "@renderical/ui/components/button"
import {
  ArrowRightIcon,
  BellIcon,
  FileTextIcon,
  Loader2Icon,
  RadioIcon,
} from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { useOnboarding, useOverview, useSendTest } from "../../hooks/overview"
import { StepIcon } from "./step-icon"

export function OnboardingView() {
  const { data, isLoading } = useOverview()
  const sendTest = useSendTest()
  const onboarding = useOnboarding()

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          <div className="mt-2 h-4 w-72 rounded bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  const { steps, complete, dismissed } = data.onboarding

  const STEPS = [
    {
      key: "connect_channel" as const,
      icon: RadioIcon,
      label: "Connect your first channel",
      description:
        "Link an email, SMS, webhook, or other channel. Email is always available via Cloudflare Email binding — connect additional channels from the Channels page.",
      done: steps.connect_channel,
      cta: (
        <Link to="/channels">
          <Button size="sm">
            Go to Channels <ArrowRightIcon className="ml-1 size-3" />
          </Button>
        </Link>
      ),
    },
    {
      key: "send_test" as const,
      icon: BellIcon,
      label: "Send a test notification",
      description:
        "Fire a real in-app notification to your own inbox to confirm the delivery pipeline is working end-to-end.",
      done: steps.send_test,
      cta: (
        <Button
          size="sm"
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
          Send test notification
        </Button>
      ),
    },
    {
      key: "explore_templates" as const,
      icon: FileTextIcon,
      label: "Explore templates",
      description:
        "Templates let you define reusable message structures so you can send consistent notifications without repeating yourself.",
      done: steps.explore_templates,
      cta: (
        <Link to="/templates">
          <Button
            size="sm"
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
    <div className="flex flex-col gap-8 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Get started with Renderical
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow these steps to send your first notification.{" "}
            <span className="font-medium text-foreground">
              {completedCount}/{STEPS.length} complete.
            </span>
          </p>
        </div>
        {(complete || dismissed) && (
          <Link to="/">
            <Button size="sm" variant="outline">
              Back to dashboard
            </Button>
          </Link>
        )}
      </div>

      <div className="relative flex flex-col gap-0">
        <div className="absolute left-[17px] top-9 bottom-9 w-px bg-border" />
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={step.key} className="relative flex gap-5 pb-8 last:pb-0">
              <StepIcon done={step.done} />
              <div className="flex-1 min-w-0 pt-1.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <p
                        className={`text-sm font-medium ${step.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                      >
                        {step.label}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                  {!step.done && (
                    <div className="shrink-0 mt-0.5">{step.cta}</div>
                  )}
                </div>
              </div>
              {i < STEPS.length - 1 && <div className="sr-only" />}
            </div>
          )
        })}
      </div>

      {complete && !dismissed && (
        <div className="rounded-xl bg-green-500/10 px-5 py-4 ring-1 ring-green-500/20">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            All done! Your notification pipeline is live.
          </p>
          <p className="mt-1 text-xs text-green-700/70 dark:text-green-400/70">
            You can dismiss this checklist from the dashboard or continue to use
            it as a quick-reference.
          </p>
          <div className="mt-3 flex gap-2">
            <Link to="/">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onboarding.mutate({ dismiss: true })}
              >
                Go to dashboard
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
