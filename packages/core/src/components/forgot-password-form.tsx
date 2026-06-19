import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller } from "react-hook-form"
import { useNavigate } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Field, FieldLabel, FieldError } from "@workspace/ui/components/field"
import { useAuth } from "../auth/context"
import { forgotPasswordSchema, type ForgotPasswordValues } from "../auth/schemas"

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
      redirectTo: "/reset-password",
    })
    if (error) {
      form.setError("root", { message: error.message })
    }
  }

  const sent = form.formState.isSubmitSuccessful && !form.formState.errors.root

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>
          {sent
            ? "Check your email for a reset link."
            : "Enter your email and we'll send you a reset link."}
        </CardDescription>
      </CardHeader>
      {!sent && (
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error || undefined}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    aria-invalid={!!fieldState.error}
                    {...field}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            )}
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
              {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </CardContent>
      )}
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Remember your password?&nbsp;
        <button
          type="button"
          onClick={() => navigate("/sign-in")}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </button>
      </CardFooter>
    </Card>
  )
}
