import { useState } from "react"

import { useQueryClient } from "@tanstack/react-query"

import { SESSION_QUERY_KEY, useSession } from "@notifro/app/auth/use-session"
import { Button } from "@notifro/ui/components/button"

import { DisableFlow } from "./disable-flow"
import { EnableFlow } from "./enable-flow"
import { RegenerateBackupCodesFlow } from "./regenerate-backup-codes-flow"

type ActiveFlow = "none" | "enable" | "disable" | "backup-codes"

export function TwoFactorSettings() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [activeFlow, setActiveFlow] = useState<ActiveFlow>("none")

  const isEnabled = session?.user?.twoFactorEnabled ?? false

  function handleFlowDone() {
    setActiveFlow("none")
    queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
  }

  if (activeFlow === "enable") {
    return <EnableFlow onDone={handleFlowDone} />
  }

  if (activeFlow === "disable") {
    return <DisableFlow onDone={handleFlowDone} />
  }

  if (activeFlow === "backup-codes") {
    return <RegenerateBackupCodesFlow onDone={handleFlowDone} />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {isEnabled
              ? "Two-factor authentication is enabled"
              : "Two-factor authentication is disabled"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isEnabled
              ? "Your account is protected with an authenticator app."
              : "Add an extra layer of security to your account."}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            isEnabled
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isEnabled ? "On" : "Off"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {isEnabled ? (
          <>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setActiveFlow("disable")}
            >
              Disable 2FA
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveFlow("backup-codes")}
            >
              Regenerate backup codes
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => setActiveFlow("enable")}>
            Enable 2FA
          </Button>
        )}
      </div>
    </div>
  )
}
