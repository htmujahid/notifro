import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@workspace/ui/components/input-otp"
import { useAuth } from "@workspace/app/auth/context"
import { SESSION_QUERY_KEY } from "@workspace/app/auth/use-session"
import { twoFactorVerifySchema, type TwoFactorVerifyValues } from "../../schemas/auth"

type Mode = "totp" | "otp" | "backup"

export function TwoFactorForm() {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>("totp")
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)

  const form = useForm<TwoFactorVerifyValues>({
    resolver: zodResolver(twoFactorVerifySchema),
    defaultValues: { code: "" },
  })

  async function handleSendOtp() {
    setSendingOtp(true)
    try {
      const { error } = await auth.twoFactor.sendOtp()
      if (error) {
        form.setError("root", { message: error.message })
        return
      }
      setOtpSent(true)
    } finally {
      setSendingOtp(false)
    }
  }

  async function handleSubmit(values: TwoFactorVerifyValues) {
    let result
    if (mode === "totp") {
      result = await auth.twoFactor.verifyTotp({ code: values.code, trustDevice: true })
    } else if (mode === "otp") {
      result = await auth.twoFactor.verifyOtp({ code: values.code, trustDevice: true })
    } else {
      result = await auth.twoFactor.verifyBackupCode({ code: values.code })
    }

    if (result.error) {
      form.setError("root", { message: result.error.message })
      return
    }

    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    navigate("/")
  }

  function switchMode(next: Mode) {
    setMode(next)
    form.reset()
  }

  const isBackup = mode === "backup"
  const isOtp = mode === "otp"
  const isTotp = mode === "totp"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Two-factor verification</h1>
        <p className="text-sm text-muted-foreground">
          {isTotp && "Enter the 6-digit code from your authenticator app."}
          {isOtp && "Enter the code sent to your email."}
          {isBackup && "Enter one of your backup codes."}
        </p>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        {isOtp && !otpSent ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={sendingOtp}
            onClick={handleSendOtp}
          >
            {sendingOtp ? "Sending…" : "Send code to my email"}
          </Button>
        ) : (
          <Controller
            control={form.control}
            name="code"
            render={({ field, fieldState }) => (
              <div className="flex flex-col items-center gap-2">
                <Label className="sr-only" htmlFor="code">
                  Verification code
                </Label>
                {isBackup ? (
                  <Input
                    id="code"
                    placeholder="xxxxxxxxxx"
                    autoComplete="one-time-code"
                    aria-invalid={!!fieldState.error}
                    className="font-mono text-center tracking-widest"
                    {...field}
                  />
                ) : (
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
                )}
                {fieldState.error && (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        )}

        {form.formState.errors.root && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        {!(isOtp && !otpSent) && (
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Verifying…" : "Verify"}
          </Button>
        )}
      </form>

      <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
        {!isTotp && (
          <button
            type="button"
            onClick={() => switchMode("totp")}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Use authenticator app instead
          </button>
        )}
        {!isOtp && (
          <button
            type="button"
            onClick={() => switchMode("otp")}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Send code by email instead
          </button>
        )}
        {!isBackup && (
          <button
            type="button"
            onClick={() => switchMode("backup")}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Use a backup code
          </button>
        )}
      </div>
    </div>
  )
}
