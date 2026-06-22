import { useState } from "react"

import { CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@renderical/ui/components/button"

import { useWebhooks } from "../../queries/webhooks"
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "../responsive-modal"
import { AddWebhookForm } from "./add-webhook-form"
import { WebhookRow } from "./webhook-row"

export function WebhookManager({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false)
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const { data, isLoading } = useWebhooks({ limit: 100 })

  const endpoints = data?.pages.flatMap((p) => p.data) ?? []

  function copySecret() {
    if (revealedSecret) {
      navigator.clipboard.writeText(revealedSecret)
      toast.success("Secret copied to clipboard")
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ display: "contents" }}>
        {trigger}
      </span>
      <ResponsiveModal
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setRevealedSecret(null)
        }}
      >
        <ResponsiveModalContent className="max-w-lg">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Webhook endpoints</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Deliver signed notification payloads to your HTTP endpoints. Each
              request is signed with HMAC-SHA256.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>

          <ResponsiveModalBody className="flex flex-col gap-3">
            {revealedSecret && (
              <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <p className="text-sm font-medium">
                  Signing secret — shown once
                </p>
                <p className="text-xs text-muted-foreground">
                  Store this now. Use it to verify the{" "}
                  <code>X-Renderical-Signature</code> header.
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                    {revealedSecret}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copySecret}
                    title="Copy secret"
                  >
                    <CopyIcon className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : endpoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No endpoints yet. Add one below.
                </p>
              ) : (
                endpoints.map((ep) => <WebhookRow key={ep.id} endpoint={ep} />)
              )}
            </div>

            <AddWebhookForm onCreated={setRevealedSecret} />
          </ResponsiveModalBody>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  )
}
