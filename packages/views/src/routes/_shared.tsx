import { lazy } from "react"
import type { RouteObject } from "react-router"

const AuthLayout = lazy(() => import("../layouts/auth-layout"))
const NotFoundPage = lazy(() => import("../pages/not-found"))
const SignInPage = lazy(() => import("../pages/sign-in"))
const SignUpPage = lazy(() => import("../pages/sign-up"))
const ForgotPasswordPage = lazy(() => import("../pages/forgot-password"))
const ResetPasswordPage = lazy(() => import("../pages/reset-password"))
const VerifyEmailPage = lazy(() => import("../pages/verify-email"))

export const sharedRoutes: RouteObject[] = [
  {
    path: "*",
    element: <NotFoundPage />,
  },
  {
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
