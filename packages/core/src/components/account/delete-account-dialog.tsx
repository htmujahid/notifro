import { useState } from "react"

import { useNavigate } from "react-router"

import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"

import { useDeleteUser } from "../../queries/auth"
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "../responsive-modal"

export function DeleteAccountDialog() {
  const navigate = useNavigate()
  const deleteUser = useDeleteUser()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setError(null)
    try {
      const { error } = await deleteUser.mutateAsync({
        password: password || undefined,
      })
      if (error) {
        setError(error.message ?? "An error occurred")
        return
      }
      setOpen(false)
      navigate("/auth/sign-in")
    } catch {
      setError("An error occurred")
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete account
      </Button>
      <ResponsiveModal open={open} onOpenChange={setOpen}>
        <ResponsiveModalContent>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Delete account</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              This action is permanent and cannot be undone. All your data will
              be deleted.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalBody className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="delete-password">
                Password (if you have one)
              </Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Enter your password to confirm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </ResponsiveModalBody>
          <ResponsiveModalFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteUser.isPending}
              onClick={handleDelete}
            >
              {deleteUser.isPending ? "Deleting…" : "Delete my account"}
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  )
}
