import { useEffect, useState } from "react"

import { useAuth } from "@workspace/app/auth/context"
import { Button } from "@workspace/ui/components/button"
import { useNavigate, useSearchParams } from "react-router"

export function VerifyEmailCard() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    "pending"
  )
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    if (!token) return
    auth.verifyEmail({ query: { token } }).then(({ error }) => {
      if (error) {
        setStatus("error")
        setErrorMessage(error.message)
      } else {
        setStatus("success")
      }
    })
  }, [token])

  // Redirected here after sign-up — no token yet
  if (!token) {
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
            We sent a verification link to your email. Click it to activate your
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

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {status === "pending" && (
        <>
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <svg
              className="size-6 animate-spin text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Verifying email…
            </h1>
            <p className="text-sm text-muted-foreground">
              Please wait a moment
            </p>
          </div>
        </>
      )}

      {status === "success" && (
        <>
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
        </>
      )}

      {status === "error" && (
        <>
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <svg
              className="size-7 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Verification failed
            </h1>
            {errorMessage && (
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/auth/sign-in")}
          >
            Back to sign in
          </Button>
        </>
      )}
    </div>
  )
}
