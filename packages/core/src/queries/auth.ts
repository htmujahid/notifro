import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@notifro/app/auth/context"
import { SESSION_QUERY_KEY } from "@notifro/app/auth/use-session"

export function useSignInEmail() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.signIn.email>[0]) =>
      auth.signIn.email(args),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  })
}

export function useSignInSocial() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.signIn.social>[0]) =>
      auth.signIn.social(args),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  })
}

export function useSignUpEmail() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.signUp.email>[0]) =>
      auth.signUp.email(args),
  })
}

export function useSignOut() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args?: Parameters<typeof auth.signOut>[0]) =>
      auth.signOut(args),
    onSuccess: () => queryClient.setQueryData(SESSION_QUERY_KEY, null),
  })
}

export function useForgotPassword() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (
      args: Parameters<typeof auth.emailOtp.requestPasswordReset>[0]
    ) => auth.emailOtp.requestPasswordReset(args),
  })
}

export function useResetPassword() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.emailOtp.resetPassword>[0]) =>
      auth.emailOtp.resetPassword(args),
  })
}

export function useVerifyEmail() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.emailOtp.verifyEmail>[0]) =>
      auth.emailOtp.verifyEmail(args),
  })
}

export function useSendVerificationOtp() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (
      args: Parameters<typeof auth.emailOtp.sendVerificationOtp>[0]
    ) => auth.emailOtp.sendVerificationOtp(args),
  })
}

export function useTwoFactorSendOtp() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.twoFactor.sendOtp>[0]) =>
      auth.twoFactor.sendOtp(args),
  })
}

export function useTwoFactorVerifyTotp() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.twoFactor.verifyTotp>[0]) =>
      auth.twoFactor.verifyTotp(args),
  })
}

export function useTwoFactorVerifyOtp() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.twoFactor.verifyOtp>[0]) =>
      auth.twoFactor.verifyOtp(args),
  })
}

export function useTwoFactorVerifyBackupCode() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.twoFactor.verifyBackupCode>[0]) =>
      auth.twoFactor.verifyBackupCode(args),
  })
}

export function useTwoFactorEnable() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.twoFactor.enable>[0]) =>
      auth.twoFactor.enable(args),
  })
}

export function useTwoFactorDisable() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.twoFactor.disable>[0]) =>
      auth.twoFactor.disable(args),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  })
}

export function useTwoFactorGenerateBackupCodes() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (
      args: Parameters<typeof auth.twoFactor.generateBackupCodes>[0]
    ) => auth.twoFactor.generateBackupCodes(args),
  })
}

export function useChangePassword() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.changePassword>[0]) =>
      auth.changePassword(args),
  })
}

export function useUpdateUser() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.updateUser>[0]) =>
      auth.updateUser(args),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  })
}

export function useSendPhoneOtp() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.phoneNumber.sendOtp>[0]) =>
      auth.phoneNumber.sendOtp(args),
  })
}

export function useVerifyPhoneNumber() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.phoneNumber.verify>[0]) =>
      auth.phoneNumber.verify(args),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  })
}

export function useChangeEmail() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.changeEmail>[0]) =>
      auth.changeEmail(args),
  })
}

export function useDeleteUser() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: Parameters<typeof auth.deleteUser>[0]) =>
      auth.deleteUser(args),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  })
}
