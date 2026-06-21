import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@renderical/app/auth/context"
import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"
import { useForm } from "react-hook-form"
import { Controller } from "react-hook-form"
import { useNavigate, useSearchParams } from "react-router"

import {
  type ResetPasswordValues,
  resetPasswordSchema,
} from "../../schemas/auth"

export function ResetPasswordForm() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  async function handleSubmit(values: ResetPasswordValues) {
    const token = searchParams.get("token") ?? ""
    const { error } = await auth.resetPassword({
      newPassword: values.password,
      token,
    })
    if (error) {
      form.setError("root", { message: error.message })
      return
    }
    navigate("/auth/sign-in")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reset password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a new password for your account
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">New password</Label>
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

        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
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

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Updating…" : "Update password"}
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
