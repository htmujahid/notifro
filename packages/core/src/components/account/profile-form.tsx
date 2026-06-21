import { useEffect } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@renderical/app/auth/context"
import { SESSION_QUERY_KEY, useSession } from "@renderical/app/auth/use-session"
import { Button } from "@renderical/ui/components/button"
import { Input } from "@renderical/ui/components/input"
import { Label } from "@renderical/ui/components/label"

import {
  type UpdateProfileValues,
  updateProfileSchema,
} from "../../schemas/account"

export function ProfileForm() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: "", image: "" },
  })

  useEffect(() => {
    if (session?.user) {
      form.reset({
        name: session.user.name ?? "",
        image: session.user.image ?? "",
      })
    }
  }, [session?.user, form])

  async function handleSubmit(values: UpdateProfileValues) {
    const { error } = await auth.updateUser({
      name: values.name,
      image: values.image || undefined,
    })
    if (error) {
      form.setError("root", { message: error.message })
      return
    }
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col gap-4"
    >
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
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
        name="image"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image">Profile image URL</Label>
            <Input
              id="image"
              type="url"
              placeholder="https://example.com/avatar.jpg"
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

      {form.formState.isSubmitSuccessful && !form.formState.errors.root && (
        <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          Profile updated successfully.
        </p>
      )}

      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="self-start"
      >
        {form.formState.isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  )
}
