import { useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@renderical/app/auth/context"
import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@renderical/ui/components/input-otp"
import { Label } from "@renderical/ui/components/label"
import { Controller, useForm } from "react-hook-form"

import {
  type TwoFactorPasswordValues,
  type TwoFactorVerifyValues,
  twoFactorPasswordSchema,
  twoFactorVerifySchema,
} from "../../schemas/auth"
import { BackupCodeGrid } from "./backup-code-grid"
import { CopyButton } from "./copy-button"

type EnableStep = "idle" | "password" | "setup" | "verify" | "backup-codes"

interface SetupData {
  totpURI: string
  backupCodes: string[]
}

export function EnableFlow({ onDone }: { onDone: () => void }) {
  const auth = useAuth()
  const [step, setStep] = useState<EnableStep>("password")
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [secret, setSecret] = useState("")

  const passwordForm = useForm<TwoFactorPasswordValues>({
    resolver: zodResolver(twoFactorPasswordSchema),
    defaultValues: { password: "" },
  })

  const verifyForm = useForm<TwoFactorVerifyValues>({
    resolver: zodResolver(twoFactorVerifySchema),
    defaultValues: { code: "" },
  })

  async function handleEnable(values: TwoFactorPasswordValues) {
    const { data, error } = await auth.twoFactor.enable({
      password: values.password,
    })
    if (error) {
      passwordForm.setError("root", { message: error.message })
      return
    }
    if (data) {
      const uri = data.totpURI as string
      const secretMatch = uri.match(/secret=([A-Z2-7]+)/i)
      setSecret(secretMatch?.[1] ?? "")
      setSetupData({ totpURI: uri, backupCodes: data.backupCodes as string[] })
      setStep("setup")
    }
  }

  async function handleVerify(values: TwoFactorVerifyValues) {
    const { error } = await auth.twoFactor.verifyTotp({ code: values.code })
    if (error) {
      verifyForm.setError("root", { message: error.message })
      return
    }
    setStep("backup-codes")
  }

  if (step === "password") {
    return (
      <form
        onSubmit={passwordForm.handleSubmit(handleEnable)}
        className="flex flex-col gap-4"
      >
        <Controller
          control={passwordForm.control}
          name="password"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="enable-password">Confirm your password</Label>
              <Input
                id="enable-password"
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
        {passwordForm.formState.errors.root && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {passwordForm.formState.errors.root.message}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
            {passwordForm.formState.isSubmitting ? "Enabling…" : "Enable 2FA"}
          </Button>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  if (step === "setup" && setupData) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Open your authenticator app (Google Authenticator, Authy, etc.) and
          scan the QR code or enter the key manually.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Setup key</Label>
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
            <span className="flex-1 break-all font-mono text-sm tracking-widest">
              {secret}
            </span>
            <CopyButton text={secret} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            Or open in authenticator app
          </Label>
          <a
            href={setupData.totpURI}
            className="text-sm underline-offset-4 hover:underline truncate"
          >
            Open authenticator app
          </a>
        </div>
        <Button onClick={() => setStep("verify")}>I&apos;ve set it up</Button>
      </div>
    )
  }

  if (step === "verify") {
    return (
      <form
        onSubmit={verifyForm.handleSubmit(handleVerify)}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app to confirm the
          setup.
        </p>
        <Controller
          control={verifyForm.control}
          name="code"
          render={({ field, fieldState }) => (
            <div className="flex flex-col items-start gap-2">
              <InputOTP
                maxLength={6}
                value={field.value}
                onChange={field.onChange}
                autoFocus
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }, (_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {fieldState.error && (
                <p className="text-xs text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />
        {verifyForm.formState.errors.root && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {verifyForm.formState.errors.root.message}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={verifyForm.formState.isSubmitting}>
            {verifyForm.formState.isSubmitting ? "Verifying…" : "Confirm"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep("setup")}
          >
            Back
          </Button>
        </div>
      </form>
    )
  }

  if (step === "backup-codes" && setupData) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium">
            Two-factor authentication enabled!
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Save these backup codes somewhere safe. Each code can only be used
            once.
          </p>
        </div>
        <BackupCodeGrid codes={setupData.backupCodes} />
        <Button onClick={onDone}>Done</Button>
      </div>
    )
  }

  return null
}
