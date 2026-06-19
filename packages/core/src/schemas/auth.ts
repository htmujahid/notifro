import { z } from "zod"

export const signInSchema = z.object({
  email: z.email({ error: "Invalid email address" }),
  password: z.string().min(8, { error: "Password must be at least 8 characters" }),
})

export const signUpSchema = z
  .object({
    name: z.string().min(2, { error: "Name must be at least 2 characters" }),
    email: z.email({ error: "Invalid email address" }),
    password: z.string().min(8, { error: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const forgotPasswordSchema = z.object({
  email: z.email({ error: "Invalid email address" }),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, { error: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type SignInValues = z.infer<typeof signInSchema>
export type SignUpValues = z.infer<typeof signUpSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
