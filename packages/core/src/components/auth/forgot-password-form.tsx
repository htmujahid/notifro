import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller } from "react-hook-form"
import { useNavigate } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useAuth } from "@workspace/app/auth/context"
import { forgotPasswordSchema, type ForgotPasswordValues } from "../../schemas/auth"

export function ForgotPasswordForm() {
  const auth = useAuth()
  const navigate = useNavigate()
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  async function handleSubmit(values: ForgotPasswordValues) {
    const { error } = await auth.requestPasswordReset({
      email: values.email,
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) {
      form.setError("root", { message: error.message })
    }
  }

  const sent = form.formState.isSubmitSuccessful && !form.formState.errors.root

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <svg className="size-7 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
          <p className="text-sm text-muted-foreground">
            We sent a reset link to{" "}
            <span className="font-medium text-foreground">{form.getValues("email")}</span>
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
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

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <button
          type="button"
          onClick={() => navigate("/auth/sign-in")}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </button>
      </p>
    </div>
  )
}
