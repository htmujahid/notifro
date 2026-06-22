import { lazy } from "react"

import type { RouteObject } from "react-router"

const AuthLayout = lazy(() => import("@renderical/core/layouts/auth-layout"))
const SignInPage = lazy(() => import("../../pages/auth/sign-in"))
const SignUpPage = lazy(() => import("../../pages/auth/sign-up"))
const ForgotPasswordPage = lazy(() => import("../../pages/auth/forgot-password"))
const ResetPasswordPage = lazy(() => import("../../pages/auth/reset-password"))
const VerifyEmailPage = lazy(() => import("../../pages/auth/verify-email"))
const TwoFactorPage = lazy(() => import("../../pages/auth/two-factor"))

export const sharedAuthRoutes: RouteObject = {
  path: "auth",
  element: <AuthLayout />,
  children: [
    { path: "sign-in", element: <SignInPage /> },
    { path: "sign-up", element: <SignUpPage /> },
    { path: "forgot-password", element: <ForgotPasswordPage /> },
    { path: "reset-password", element: <ResetPasswordPage /> },
    { path: "verify-email", element: <VerifyEmailPage /> },
    { path: "two-factor", element: <TwoFactorPage /> },
  ],
}
