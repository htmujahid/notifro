import { z } from "zod"

export const updateProfileSchema = z.object({
  name: z.string().min(2, { error: "Name must be at least 2 characters" }),
  image: z
    .string()
    .url({ error: "Must be a valid URL" })
    .optional()
    .or(z.literal("")),
})

export const changeEmailSchema = z.object({
  newEmail: z.email({ error: "Invalid email address" }),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, { error: "Password must be at least 8 characters" }),
    newPassword: z
      .string()
      .min(8, { error: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>
export type ChangeEmailValues = z.infer<typeof changeEmailSchema>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
