import { Suspense } from "react"
import { NavLink, Outlet } from "react-router"
import { useActiveOrganization } from "../hooks/organization"

const NAV_LINKS = [
  { to: "/organization", label: "General", end: true },
  { to: "/organization/members", label: "Members" },
  { to: "/organization/invitations", label: "Invitations" },
]

export default function OrgLayout() {
  const { data: activeOrg } = useActiveOrganization()

  if (!activeOrg) {
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Organization</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          No active organization. Select or create one from the sidebar.
        </p>
      </div>
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">{activeOrg.name}</p>
      </div>

      <nav className="flex gap-1 border-b">
        {NAV_LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive
                ? "border-b-2 border-foreground px-3 pb-2 text-sm font-medium text-foreground"
                : "px-3 pb-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </div>
  )
}
