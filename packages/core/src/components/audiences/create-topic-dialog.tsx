import React from "react"

import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"
import { Switch } from "@renderical/ui/components/switch"

import { useCreateTopic } from "../../queries/preferences"
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "../responsive-modal"

export function CreateTopicDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [key, setKey] = React.useState("")
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [transactional, setTransactional] = React.useState(false)
  const [defaultOptIn, setDefaultOptIn] = React.useState(true)
  const create = useCreateTopic()

  function handleSubmit() {
    create.mutate(
      {
        key: key.trim(),
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        transactional,
        defaultOptIn,
      },
      {
        onSuccess: () => {
          setKey("")
          setName("")
          setDescription("")
          setTransactional(false)
          setDefaultOptIn(true)
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>New topic</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <ResponsiveModalBody className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Key</Label>
            <Input
              placeholder="product-updates"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              placeholder="Product updates"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Input
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label>Transactional</Label>
              <p className="text-xs text-muted-foreground">
                Transactional topics can't be opted out of.
              </p>
            </div>
            <Switch
              checked={transactional}
              onCheckedChange={setTransactional}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label>Default opt-in</Label>
              <p className="text-xs text-muted-foreground">
                New recipients are opted in by default.
              </p>
            </div>
            <Switch checked={defaultOptIn} onCheckedChange={setDefaultOptIn} />
          </div>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending || !key.trim() || !name.trim()}
          >
            {create.isPending ? "Creating…" : "Create topic"}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
