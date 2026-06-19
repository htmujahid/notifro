import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@workspace/ui/components/input-otp"
import { useAuth } from "@workspace/app/auth/context"
import { useSession, SESSION_QUERY_KEY } from "@workspace/app/auth/use-session"
import { twoFactorPasswordSchema, twoFactorVerifySchema, type TwoFactorPasswordValues, type TwoFactorVerifyValues } from "../../schemas/auth"

type EnableStep = "idle" | "password" | "setup" | "verify" | "backup-codes"
type DisableStep = "idle" | "password"
type BackupStep = "idle" | "password" | "codes"

interface SetupData {
  totpURI: string
  backupCodes: string[]
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

function BackupCodeGrid({ codes }: { codes: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-4 font-mono text-sm">
      {codes.map((code) => (
        <span key={code} className="tracking-widest">
          {code}
        </span>
      ))}
    </div>
  )
}

function EnableFlow({ onDone }: { onDone: () => void }) {
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
    const { data, error } = await auth.twoFactor.enable({ password: values.password })
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
      <form onSubmit={passwordForm.handleSubmit(handleEnable)} className="flex flex-col gap-4">
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
                <p className="text-xs text-destructive">{fieldState.error.message}</p>
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
          Open your authenticator app (Google Authenticator, Authy, etc.) and scan the QR code
          or enter the key manually.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Setup key</Label>
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
            <span className="flex-1 break-all font-mono text-sm tracking-widest">{secret}</span>
            <CopyButton text={secret} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Or open in authenticator app</Label>
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
      <form onSubmit={verifyForm.handleSubmit(handleVerify)} className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app to confirm the setup.
        </p>
        <Controller
          control={verifyForm.control}
          name="code"
          render={({ field, fieldState }) => (
            <div className="flex flex-col items-start gap-2">
              <InputOTP maxLength={6} value={field.value} onChange={field.onChange} autoFocus>
                <InputOTPGroup>
                  {Array.from({ length: 6 }, (_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {fieldState.error && (
                <p className="text-xs text-destructive">{fieldState.error.message}</p>
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
          <Button type="button" variant="outline" onClick={() => setStep("setup")}>
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
          <p className="text-sm font-medium">Two-factor authentication enabled!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Save these backup codes somewhere safe. Each code can only be used once.
          </p>
        </div>
        <BackupCodeGrid codes={setupData.backupCodes} />
        <Button onClick={onDone}>Done</Button>
      </div>
    )
  }

  return null
}

function DisableFlow({ onDone }: { onDone: () => void }) {
  const auth = useAuth()
  const queryClient = useQueryClient()

  const form = useForm<TwoFactorPasswordValues>({
    resolver: zodResolver(twoFactorPasswordSchema),
    defaultValues: { password: "" },
  })

  async function handleDisable(values: TwoFactorPasswordValues) {
    const { error } = await auth.twoFactor.disable({ password: values.password })
    if (error) {
      form.setError("root", { message: error.message })
      return
    }
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    onDone()
  }

  return (
    <form onSubmit={form.handleSubmit(handleDisable)} className="flex flex-col gap-4">
      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disable-password">Confirm your password to disable 2FA</Label>
            <Input
              id="disable-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!fieldState.error}
              {...field}
            />
            {fieldState.error && (
              <p className="text-xs text-destructive">{fieldState.error.message}</p>
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
        <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Disabling…" : "Disable 2FA"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function RegenerateBackupCodesFlow({ onDone }: { onDone: () => void }) {
  const auth = useAuth()
  const [step, setStep] = useState<BackupStep>("password")
  const [codes, setCodes] = useState<string[]>([])

  const form = useForm<TwoFactorPasswordValues>({
    resolver: zodResolver(twoFactorPasswordSchema),
    defaultValues: { password: "" },
  })

  async function handleGenerate(values: TwoFactorPasswordValues) {
    const { data, error } = await auth.twoFactor.generateBackupCodes({ password: values.password })
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
      <form onSubmit={form.handleSubmit(handleGenerate)} className="flex flex-col gap-4">
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
                <p className="text-xs text-destructive">{fieldState.error.message}</p>
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
        Your previous backup codes have been invalidated. Save these new codes somewhere safe.
      </p>
      <BackupCodeGrid codes={codes} />
      <Button onClick={onDone}>Done</Button>
    </div>
  )
}

type ActiveFlow = "none" | "enable" | "disable" | "backup-codes"

export function TwoFactorSettings() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [activeFlow, setActiveFlow] = useState<ActiveFlow>("none")

  const isEnabled = session?.user?.twoFactorEnabled ?? false

  function handleFlowDone() {
    setActiveFlow("none")
    queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
  }

  if (activeFlow === "enable") {
    return <EnableFlow onDone={handleFlowDone} />
  }

  if (activeFlow === "disable") {
    return <DisableFlow onDone={handleFlowDone} />
  }

  if (activeFlow === "backup-codes") {
    return <RegenerateBackupCodesFlow onDone={handleFlowDone} />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {isEnabled ? "Two-factor authentication is enabled" : "Two-factor authentication is disabled"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isEnabled
              ? "Your account is protected with an authenticator app."
              : "Add an extra layer of security to your account."}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            isEnabled
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isEnabled ? "On" : "Off"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {isEnabled ? (
          <>
            <Button variant="destructive" size="sm" onClick={() => setActiveFlow("disable")}>
              Disable 2FA
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveFlow("backup-codes")}>
              Regenerate backup codes
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => setActiveFlow("enable")}>
            Enable 2FA
          </Button>
        )}
      </div>
    </div>
  )
}
