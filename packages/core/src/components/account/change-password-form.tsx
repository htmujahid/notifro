import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@workspace/app/auth/context"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Controller, useForm } from "react-hook-form"

import {
  type ChangePasswordValues,
  changePasswordSchema,
} from "../../schemas/account"

export function ChangePasswordForm() {
  const auth = useAuth()

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  async function handleSubmit(values: ChangePasswordValues) {
    const { error } = await auth.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    })
    if (error) {
      form.setError("root", { message: error.message })
      return
    }
    form.reset()
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col gap-4"
    >
      <Controller
        control={form.control}
        name="currentPassword"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!fieldState.error}
              {...field}
            />
            {fieldState.error && (
              <p className="text-xs text-destructive">
                {fieldState.error.message}
              </p>
            )}
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="newPassword"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!fieldState.error}
              {...field}
            />
            {fieldState.error && (
              <p className="text-xs text-destructive">
                {fieldState.error.message}
              </p>
            )}
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="confirmPassword"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!fieldState.error}
              {...field}
            />
            {fieldState.error && (
              <p className="text-xs text-destructive">
                {fieldState.error.message}
              </p>
            )}
          </div>
        )}
      />

      {form.formState.errors.root && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}

      {form.formState.isSubmitSuccessful && !form.formState.errors.root && (
        <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          Password changed. Other sessions have been signed out.
        </p>
      )}

      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="self-start"
      >
        {form.formState.isSubmitting ? "Updating…" : "Update password"}
      </Button>
    </form>
  )
}
