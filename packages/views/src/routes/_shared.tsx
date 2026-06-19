import { lazy } from "react"
import type { RouteObject } from "react-router"

const AuthLayout = lazy(() => import("../layouts/auth-layout"))
const NotFoundPage = lazy(() => import("../pages/not-found"))
const SignInPage = lazy(() => import("../pages/auth/sign-in"))
const SignUpPage = lazy(() => import("../pages/auth/sign-up"))
const ForgotPasswordPage = lazy(() => import("../pages/auth/forgot-password"))
const ResetPasswordPage = lazy(() => import("../pages/auth/reset-password"))
const VerifyEmailPage = lazy(() => import("../pages/auth/verify-email"))
const TwoFactorPage = lazy(() => import("../pages/auth/two-factor"))
const AccountProfilePage = lazy(() => import("../pages/account/profile"))
const AccountSecurityPage = lazy(() => import("../pages/account/security"))
const AccountTwoFactorPage = lazy(() => import("../pages/account/two-factor"))

export const sharedRoutes: RouteObject[] = [
  {
    path: "*",
    element: <NotFoundPage />,
  },
  {
    path: "account",
    children: [
      { index: true, element: <AccountProfilePage /> },
      { path: "security", element: <AccountSecurityPage /> },
      { path: "two-factor", element: <AccountTwoFactorPage /> },
    ],
  },
  {
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
  },
]
