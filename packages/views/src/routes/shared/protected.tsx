import { lazy } from "react"

import type { RouteObject } from "react-router"

const AccountLayout = lazy(
  () => import("@renderical/core/layouts/account-layout")
)
const NotificationsPage = lazy(() => import("../../pages/notifications"))
const SchedulesPage = lazy(() => import("../../pages/schedules"))
const ChannelsPage = lazy(() => import("../../pages/channels"))
const CreatePage = lazy(() => import("../../pages/create"))
const TemplatesPage = lazy(() => import("../../pages/templates"))
const TemplateEditPage = lazy(() => import("../../pages/template-edit"))
const LogsPage = lazy(() => import("../../pages/logs"))
const AnalyticsPage = lazy(() => import("../../pages/analytics"))
const AudiencesPage = lazy(() => import("../../pages/audiences"))
const JourneysPage = lazy(() => import("../../pages/journeys"))
const RoutingPage = lazy(() => import("../../pages/routing"))
const SettingsPage = lazy(() => import("../../pages/settings"))
const HelpPage = lazy(() => import("../../pages/help"))
const OnboardingPage = lazy(() => import("../../pages/onboarding"))
const AccountProfilePage = lazy(() => import("../../pages/account/profile"))
const AccountSecurityPage = lazy(() => import("../../pages/account/security"))
const AccountTwoFactorPage = lazy(() => import("../../pages/account/two-factor"))
const DevelopersPage = lazy(() => import("../../pages/developers"))

export const sharedProtectedChildren: RouteObject[] = [
  { path: "notifications", element: <NotificationsPage /> },
  { path: "schedules", element: <SchedulesPage /> },
  { path: "channels", element: <ChannelsPage /> },
  { path: "audiences", element: <AudiencesPage /> },
  { path: "journeys", element: <JourneysPage /> },
  { path: "routing", element: <RoutingPage /> },
  { path: "create", element: <CreatePage /> },
  { path: "templates", element: <TemplatesPage /> },
  { path: "templates/:id", element: <TemplateEditPage /> },
  { path: "logs", element: <LogsPage /> },
  { path: "analytics", element: <AnalyticsPage /> },
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
