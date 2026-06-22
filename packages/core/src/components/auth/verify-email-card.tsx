import { useState } from "react"

import { useNavigate, useSearchParams } from "react-router"

import { useSendVerificationOtp, useVerifyEmail } from "../../queries/auth"
import { Button } from "@renderical/ui/components/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@renderical/ui/components/input-otp"

export function VerifyEmailCard() {
  const verifyEmail = useVerifyEmail()
  const sendVerificationOtp = useSendVerificationOtp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get("email") ?? ""

  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string>()
  const [verified, setVerified] = useState(false)

  async function handleVerify() {
    if (otp.length < 6) return
    setError(undefined)
    try {
      const { error: err } = await verifyEmail.mutateAsync({ email, otp })
      if (err) {
        setError(err.message)
      } else {
        setVerified(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
    }
  }

  async function handleResend() {
    setError(undefined)
    try {
      const { error: err } = await sendVerificationOtp.mutateAsync({
        email,
        type: "email-verification",
      })
      if (err) setError(err.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code")
    }
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <svg
            className="size-7 text-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Check your inbox
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            We sent a verification code to your email. Enter it to activate your
            account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/auth/sign-in")}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  if (verified) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <svg
            className="size-7 text-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Email verified
          </h1>
          <p className="text-sm text-muted-foreground">
            Your account is ready to go
          </p>
        </div>
        <Button className="w-full" onClick={() => navigate("/auth/sign-in")}>
          Continue to sign in
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <svg
          className="size-7 text-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Check your inbox
        </h1>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 w-full">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          onComplete={handleVerify}
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }).map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          className="w-full"
          onClick={handleVerify}
          disabled={otp.length < 6 || verifyEmail.isPending}
        >
          {verifyEmail.isPending ? "Verifying…" : "Verify email"}
        </Button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Didn&apos;t receive the code?
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={sendVerificationOtp.isPending}
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-50"
        >
          {sendVerificationOtp.isPending ? "Sending…" : "Resend code"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => navigate("/auth/sign-in")}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Back to sign in
      </button>
    </div>
  )
}
