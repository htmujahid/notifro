import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { useApp } from "@renderical/app/app/context"
import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"

import { useChangeEmail } from "../../hooks/auth"
import {
  type ChangeEmailValues,
  changeEmailSchema,
} from "../../schemas/account"

export function ChangeEmailForm() {
  const changeEmail = useChangeEmail()
  const { appBaseURL } = useApp()

  const form = useForm<ChangeEmailValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: "" },
  })

  async function handleSubmit(values: ChangeEmailValues) {
    const { error } = await changeEmail.mutateAsync({
      newEmail: values.newEmail,
      callbackURL: `${appBaseURL.replace(/\/$/, "")}/`,
    })
    if (error) {
      form.setError("root", { message: error.message })
    }
  }

  if (form.formState.isSubmitSuccessful && !form.formState.errors.root) {
    return (
      <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
        Verification email sent. Check your inbox to confirm the new address.
      </p>
    )
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col gap-4"
    >
      <Controller
        control={form.control}
        name="newEmail"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newEmail">New email address</Label>
            <Input
              id="newEmail"
              type="email"
              placeholder="new@example.com"
              autoComplete="email"
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

      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="self-start"
      >
        {form.formState.isSubmitting ? "Sending…" : "Change email"}
      </Button>
    </form>
  )
}
