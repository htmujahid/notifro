import { useEffect } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { useSession } from "@notifro/app/auth/use-session"
import { Button } from "@notifro/ui/components/button"
import { Input } from "@notifro/ui/components/input"
import { Label } from "@notifro/ui/components/label"

import { useUpdateUser } from "../../queries/auth"
import {
  type UpdateProfileValues,
  updateProfileSchema,
} from "../../schemas/account"

export function ProfileForm() {
  const updateUser = useUpdateUser()
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
    const result = await updateUser.mutateAsync({
      name: values.name,
      image: values.image || undefined,
    })
    if (result?.error) {
      form.setError("root", { message: result.error.message })
    }
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
