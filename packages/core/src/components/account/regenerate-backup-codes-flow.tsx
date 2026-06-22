import { useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"

import {
  type TwoFactorPasswordValues,
  twoFactorPasswordSchema,
} from "../../schemas/auth"
import { useTwoFactorGenerateBackupCodes } from "../../queries/auth"
import { BackupCodeGrid } from "./backup-code-grid"

type BackupStep = "idle" | "password" | "codes"

export function RegenerateBackupCodesFlow({ onDone }: { onDone: () => void }) {
  const generateBackupCodes = useTwoFactorGenerateBackupCodes()
  const [step, setStep] = useState<BackupStep>("password")
  const [codes, setCodes] = useState<string[]>([])

  const form = useForm<TwoFactorPasswordValues>({
    resolver: zodResolver(twoFactorPasswordSchema),
    defaultValues: { password: "" },
  })

  async function handleGenerate(values: TwoFactorPasswordValues) {
    const { data, error } = await generateBackupCodes.mutateAsync({
      password: values.password,
    })
    if (error) {
      form.setError("root", { message: error.message })
      return
    }
    if (data) {
      setCodes(data.backupCodes as string[])
      setStep("codes")
    }
  }

  if (step === "password") {
    return (
      <form
        onSubmit={form.handleSubmit(handleGenerate)}
        className="flex flex-col gap-4"
      >
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="regen-password">Confirm your password</Label>
              <Input
                id="regen-password"
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
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Generating…" : "Generate new codes"}
          </Button>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Your previous backup codes have been invalidated. Save these new codes
        somewhere safe.
      </p>
      <BackupCodeGrid codes={codes} />
      <Button onClick={onDone}>Done</Button>
    </div>
  )
}
