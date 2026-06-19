import { lazy } from "react"
import type { RouteObject } from "react-router"

const AuthLayout = lazy(() => import("../layouts/auth-layout"))
const NotFoundPage = lazy(() => import("../pages/not-found"))
const SignInPage = lazy(() => import("../pages/auth/sign-in"))
const SignUpPage = lazy(() => import("../pages/auth/sign-up"))
const ForgotPasswordPage = lazy(() => import("../pages/auth/forgot-password"))
const ResetPasswordPage = lazy(() => import("../pages/auth/reset-password"))
const VerifyEmailPage = lazy(() => import("../pages/auth/verify-email"))
const AccountProfilePage = lazy(() => import("../pages/account/profile"))
const AccountSecurityPage = lazy(() => import("../pages/account/security"))

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
    ],
  },
]
