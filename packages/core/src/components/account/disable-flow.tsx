import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@renderical/app/auth/context"
import { SESSION_QUERY_KEY } from "@renderical/app/auth/use-session"
import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"
import { Controller, useForm } from "react-hook-form"

import { useQueryClient } from "@tanstack/react-query"

import {
  type TwoFactorPasswordValues,
  twoFactorPasswordSchema,
} from "../../schemas/auth"

export function DisableFlow({ onDone }: { onDone: () => void }) {
  const auth = useAuth()
  const queryClient = useQueryClient()

  const form = useForm<TwoFactorPasswordValues>({
    resolver: zodResolver(twoFactorPasswordSchema),
    defaultValues: { password: "" },
  })

  async function handleDisable(values: TwoFactorPasswordValues) {
    const { error } = await auth.twoFactor.disable({
      password: values.password,
    })
    if (error) {
      form.setError("root", { message: error.message })
      return
    }
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    onDone()
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleDisable)}
      className="flex flex-col gap-4"
    >
      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disable-password">
              Confirm your password to disable 2FA
            </Label>
            <Input
              id="disable-password"
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
      {form.formState.errors.root && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="destructive"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Disabling…" : "Disable 2FA"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
