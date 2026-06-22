import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { Button } from "@notifro/ui/components/button"
import { Input } from "@notifro/ui/components/input"
import { Label } from "@notifro/ui/components/label"

import { useTwoFactorDisable } from "../../queries/auth"
import {
  type TwoFactorPasswordValues,
  twoFactorPasswordSchema,
} from "../../schemas/auth"

export function DisableFlow({ onDone }: { onDone: () => void }) {
  const disableMutation = useTwoFactorDisable()

  const form = useForm<TwoFactorPasswordValues>({
    resolver: zodResolver(twoFactorPasswordSchema),
    defaultValues: { password: "" },
  })

  async function handleDisable(values: TwoFactorPasswordValues) {
    const { error } = await disableMutation.mutateAsync({
      password: values.password,
    })
    if (error) {
      form.setError("root", { message: error.message })
      return
    }
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
