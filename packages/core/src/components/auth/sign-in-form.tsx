import { useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useApp } from "@workspace/app/app/context"
import { useAuth } from "@workspace/app/auth/context"
import { buildAuthURL } from "@workspace/app/auth/deep-link"
import { SESSION_QUERY_KEY } from "@workspace/app/auth/use-session"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useForm } from "react-hook-form"
import { Controller } from "react-hook-form"
import { useNavigate, useSearchParams } from "react-router"

import { useQueryClient } from "@tanstack/react-query"

import { type SignInValues, signInSchema } from "../../schemas/auth"
import { GoogleIcon, OrDivider } from "./auth-icons"

export function SignInForm() {
  const auth = useAuth()
  const { appBaseURL } = useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const next = searchParams.get("next") ?? "/"
  const [googleLoading, setGoogleLoading] = useState(false)

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  })

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    try {
      const { error } = await auth.signIn.social({
        provider: "google",
        callbackURL: buildAuthURL(appBaseURL, next),
      })
      if (error) form.setError("root", { message: error.message })
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(values: SignInValues) {
    const { data, error } = await auth.signIn.email({
      email: values.email,
      password: values.password,
    })
    if (error) {
      form.setError("root", { message: error.message })
      return
    }
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      navigate(`/auth/two-factor?next=${encodeURIComponent(next)}`)
      return
    }
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    navigate(next)
  }

  const busy = form.formState.isSubmitting || googleLoading

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your Renderical account
        </p>
      </div>

      {/* Google */}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        disabled={busy}
        onClick={handleGoogleSignIn}
      >
        <GoogleIcon />
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </Button>

      <OrDivider />

      {/* Email / password form */}
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
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
                <p className="text-xs text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => navigate("/auth/forgot-password")}
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
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

        <Button type="submit" className="w-full" disabled={busy}>
          {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={() => navigate("/auth/sign-up")}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign up
        </button>
      </p>
    </div>
  )
}
