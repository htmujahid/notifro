import { useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { useSession } from "@notifro/app/auth/use-session"
import { Button } from "@notifro/ui/components/button"
import { Input } from "@notifro/ui/components/input"
import { Label } from "@notifro/ui/components/label"

import { useSendPhoneOtp, useVerifyPhoneNumber } from "../../queries/auth"
import {
  type PhoneNumberValues,
  type VerifyPhoneValues,
  phoneNumberSchema,
  verifyPhoneSchema,
} from "../../schemas/account"

export function PhoneNumberForm() {
  const { data: session } = useSession()
  const sendOtp = useSendPhoneOtp()
  const verify = useVerifyPhoneNumber()

  const currentNumber = session?.user?.phoneNumber ?? null
  const isVerified = session?.user?.phoneNumberVerified ?? false

  // "view" shows current status; "enter" collects a number; "verify" collects the code.
  const [step, setStep] = useState<"view" | "enter" | "verify">("view")
  const [pendingNumber, setPendingNumber] = useState("")

  const phoneForm = useForm<PhoneNumberValues>({
    resolver: zodResolver(phoneNumberSchema),
    defaultValues: { phoneNumber: "" },
  })

  const codeForm = useForm<VerifyPhoneValues>({
    resolver: zodResolver(verifyPhoneSchema),
    defaultValues: { code: "" },
  })

  async function handleSendOtp(values: PhoneNumberValues) {
    const { error } = await sendOtp.mutateAsync({
      phoneNumber: values.phoneNumber,
    })
    if (error) {
      phoneForm.setError("root", {
        message: error.message ?? "Failed to send code",
      })
      return
    }
    setPendingNumber(values.phoneNumber)
    codeForm.reset({ code: "" })
    setStep("verify")
  }

  async function handleVerify(values: VerifyPhoneValues) {
    const { error } = await verify.mutateAsync({
      phoneNumber: pendingNumber,
      code: values.code,
      updatePhoneNumber: true,
    })
    if (error) {
      codeForm.setError("root", {
        message: error.message ?? "Invalid or expired code",
      })
      return
    }
    setStep("view")
    phoneForm.reset({ phoneNumber: "" })
  }

  // Step 1: show the current number and its verification status.
  if (step === "view") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">
              {currentNumber ?? "No phone number added"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {currentNumber
                ? isVerified
                  ? "Notifications for SMS and WhatsApp are delivered here."
                  : "Verify this number to receive SMS and WhatsApp notifications."
                : "Add a phone number to receive SMS and WhatsApp notifications."}
            </p>
          </div>
          {currentNumber && (
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                isVerified
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isVerified ? "Verified" : "Unverified"}
            </span>
          )}
        </div>

        <Button
          size="sm"
          className="self-start"
          onClick={() => {
            phoneForm.reset({ phoneNumber: currentNumber ?? "" })
            setStep("enter")
          }}
        >
          {currentNumber ? "Change phone number" : "Add phone number"}
        </Button>
      </div>
    )
  }

  // Step 2: enter a phone number and request a verification code.
  if (step === "enter") {
    return (
      <form
        onSubmit={phoneForm.handleSubmit(handleSendOtp)}
        className="flex flex-col gap-4"
      >
        <Controller
          control={phoneForm.control}
          name="phoneNumber"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phoneNumber">Phone number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+15551234567"
                autoComplete="tel"
                aria-invalid={!!fieldState.error}
                {...field}
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll text a 6-digit verification code to this number.
              </p>
              {fieldState.error && (
                <p className="text-xs text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />

        {phoneForm.formState.errors.root && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {phoneForm.formState.errors.root.message}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={phoneForm.formState.isSubmitting}>
            {phoneForm.formState.isSubmitting ? "Sending…" : "Send code"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setStep("view")}>
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  // Step 3: enter the code that was texted to the pending number.
  return (
    <form
      onSubmit={codeForm.handleSubmit(handleVerify)}
      className="flex flex-col gap-4"
    >
      <Controller
        control={codeForm.control}
        name="code"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              aria-invalid={!!fieldState.error}
              {...field}
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code sent to {pendingNumber}.
            </p>
            {fieldState.error && (
              <p className="text-xs text-destructive">
                {fieldState.error.message}
              </p>
            )}
          </div>
        )}
      />

      {codeForm.formState.errors.root && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {codeForm.formState.errors.root.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={codeForm.formState.isSubmitting}>
          {codeForm.formState.isSubmitting ? "Verifying…" : "Verify"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={sendOtp.isPending}
          onClick={() => handleSendOtp({ phoneNumber: pendingNumber })}
        >
          {sendOtp.isPending ? "Resending…" : "Resend code"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setStep("view")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
