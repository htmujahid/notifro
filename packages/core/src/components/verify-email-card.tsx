import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { useAuth } from "../auth/context"

export function VerifyEmailCard() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending")
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setStatus("error")
      setErrorMessage("No verification token found in the URL.")
      return
    }
    auth.verifyEmail({ query: { token } }).then(({ error }) => {
      if (error) {
        setStatus("error")
        setErrorMessage(error.message)
      } else {
        setStatus("success")
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email verification</CardTitle>
        <CardDescription>
          {status === "pending" && "Verifying your email address…"}
          {status === "success" && "Your email has been verified successfully."}
          {status === "error" && "Verification failed."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status === "error" && errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
        {status === "success" && (
          <Button onClick={() => navigate("/sign-in")} className="w-full">
            Continue to sign in
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
