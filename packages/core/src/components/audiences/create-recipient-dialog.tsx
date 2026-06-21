import React from "react"

import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"

import { useCreateRecipient } from "../../hooks/audiences"
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "../responsive-modal"

export function CreateRecipientDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [email, setEmail] = React.useState("")
  const [externalId, setExternalId] = React.useState("")
  const [locale, setLocale] = React.useState("")
  const [timezone, setTimezone] = React.useState("")
  const create = useCreateRecipient()

  function handleSubmit() {
    const body: {
      email?: string
      externalId?: string
      locale?: string
      timezone?: string
    } = {}
    if (email.trim()) body.email = email.trim()
    if (externalId.trim()) body.externalId = externalId.trim()
    if (locale.trim()) body.locale = locale.trim()
    if (timezone.trim()) body.timezone = timezone.trim()

    create.mutate(body, {
      onSuccess: () => {
        setEmail("")
        setExternalId("")
        setLocale("")
        setTimezone("")
        onOpenChange(false)
      },
    })
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Add recipient</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <ResponsiveModalBody className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>External ID</Label>
            <Input
              placeholder="your-user-id"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Locale</Label>
              <Input
                placeholder="en-US"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Timezone</Label>
              <Input
                placeholder="America/New_York"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>
          </div>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add recipient"}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
