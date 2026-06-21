import { lazy } from "react"
import type { RouteObject } from "react-router"

const AuthLayout = lazy(() => import("@workspace/core/layouts/auth-layout"))
const AccountLayout = lazy(() => import("@workspace/core/layouts/account-layout"))
const NotFoundPage = lazy(() => import("../pages/not-found"))
const SignInPage = lazy(() => import("../pages/auth/sign-in"))
const SignUpPage = lazy(() => import("../pages/auth/sign-up"))
const ForgotPasswordPage = lazy(() => import("../pages/auth/forgot-password"))
const ResetPasswordPage = lazy(() => import("../pages/auth/reset-password"))
const VerifyEmailPage = lazy(() => import("../pages/auth/verify-email"))
const TwoFactorPage = lazy(() => import("../pages/auth/two-factor"))
const NotificationsPage = lazy(() => import("../pages/notifications"))
const SchedulesPage = lazy(() => import("../pages/schedules"))
const ChannelsPage = lazy(() => import("../pages/channels"))
const CreatePage = lazy(() => import("../pages/create"))
const TemplatesPage = lazy(() => import("../pages/templates"))
const TemplateEditPage = lazy(() => import("../pages/template-edit"))
const LogsPage = lazy(() => import("../pages/logs"))
const AudiencesPage = lazy(() => import("../pages/audiences"))
const AnalyticsPage = lazy(() => import("../pages/analytics"))
const SettingsPage = lazy(() => import("../pages/settings"))
const HelpPage = lazy(() => import("../pages/help"))
const OnboardingPage = lazy(() => import("../pages/onboarding"))
const AccountProfilePage = lazy(() => import("../pages/account/profile"))
const AccountSecurityPage = lazy(() => import("../pages/account/security"))
const AccountTwoFactorPage = lazy(() => import("../pages/account/two-factor"))
const PreferencesPage = lazy(() => import("../pages/preferences"))
const UnsubscribePage = lazy(() => import("../pages/unsubscribe"))
const RoutingPage = lazy(() => import("../pages/routing"))
const DevelopersPage = lazy(() => import("../pages/developers"))

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

export const sharedProtectedChildren: RouteObject[] = [
  { path: "notifications", element: <NotificationsPage /> },
  { path: "schedules", element: <SchedulesPage /> },
  { path: "channels", element: <ChannelsPage /> },
  { path: "create", element: <CreatePage /> },
  { path: "templates", element: <TemplatesPage /> },
  { path: "templates/:id", element: <TemplateEditPage /> },
  { path: "logs", element: <LogsPage /> },
  { path: "audiences", element: <AudiencesPage /> },
  { path: "analytics", element: <AnalyticsPage /> },
  { path: "routing", element: <RoutingPage /> },
  { path: "developers", element: <DevelopersPage /> },
  { path: "settings", element: <SettingsPage /> },
  { path: "help", element: <HelpPage /> },
  { path: "onboarding", element: <OnboardingPage /> },
  {
    path: "account",
    element: <AccountLayout />,
    children: [
      { index: true, element: <AccountProfilePage /> },
      { path: "security", element: <AccountSecurityPage /> },
      { path: "two-factor", element: <AccountTwoFactorPage /> },
    ],
  },
]

export const publicRoutes: RouteObject[] = [
  { path: "preferences", element: <PreferencesPage /> },
  { path: "unsubscribe", element: <UnsubscribePage /> },
]

export const notFoundRoute: RouteObject = {
  path: "*",
  element: <NotFoundPage />,
}
