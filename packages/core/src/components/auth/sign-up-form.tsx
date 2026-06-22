import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Controller } from "react-hook-form"
import { useNavigate } from "react-router"

import { useQueryClient } from "@tanstack/react-query"

import { useApp } from "@notifro/app/app/context"
import { SESSION_QUERY_KEY } from "@notifro/app/auth/use-session"
import { Button } from "@notifro/ui/components/button"
import { Input } from "@notifro/ui/components/input"
import { Label } from "@notifro/ui/components/label"

import { useSignInSocial, useSignUpEmail } from "../../queries/auth"
import { type SignUpValues, signUpSchema } from "../../schemas/auth"
import { GoogleIcon, OrDivider } from "./auth-icons"

export function SignUpForm() {
  const { appBaseURL, isWeb } = useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const signInSocial = useSignInSocial()
  const signUpEmail = useSignUpEmail()

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  })

  async function handleGoogleSignIn() {
    const result = await signInSocial.mutateAsync({
      provider: "google",
      callbackURL: `${appBaseURL.replace(/\/$/, "")}/`,
    })
    if (result.error) form.setError("root", { message: result.error.message })
  }

  async function handleSubmit(values: SignUpValues) {
    const result = await signUpEmail.mutateAsync({
      name: values.name,
      email: values.email,
      password: values.password,
    })
    if (result.error) {
      form.setError("root", { message: result.error.message })
      return
    }
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    navigate(`/auth/verify-email?email=${encodeURIComponent(values.email)}`)
  }

  const busy = form.formState.isSubmitting || signInSocial.isPending

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Get started with Notifro for free
        </p>
      </div>

      {/* Google: web only */}
      {isWeb && (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={busy}
            onClick={handleGoogleSignIn}
          >
            <GoogleIcon />
            {signInSocial.isPending ? "Redirecting…" : "Continue with Google"}
          </Button>
          <OrDivider />
        </>
      )}

      {/* Form */}
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Doe"
                autoComplete="name"
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
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
          {form.formState.isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
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
