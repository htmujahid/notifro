import * as React from "react"
import { Link } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@workspace/app/auth/context"
import { useOrganizations, useActiveOrganization, organizationKeys } from "../../hooks/organization"
import { ChevronsUpDownIcon, PlusIcon, Settings2Icon, CheckIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { CreateOrgDialog } from "../../components/organization/create-org-dialog"
import { RendericalMark } from "../../components/renderical-logo"

export function OrgSwitcher() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const { isMobile } = useSidebar()
  const [createOpen, setCreateOpen] = React.useState(false)

  const { data: orgs } = useOrganizations()
  const { data: activeOrg } = useActiveOrganization()

  async function handleSwitch(orgId: string) {
    if (orgId === activeOrg?.id) return
    await auth.organization.setActive({ organizationId: orgId })
    await queryClient.invalidateQueries({ queryKey: organizationKeys.active })
  }

  const displayName = activeOrg?.name ?? "Renderical"

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  className="data-[slot=sidebar-menu-button]:p-1.5! aria-expanded:bg-muted"
                />
              }
            >
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
                <RendericalMark className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56"
              side={isMobile ? "bottom" : "right"}
              align="start"
              sideOffset={4}
            >
              <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Organizations</DropdownMenuLabel>
                {(orgs ?? []).map((org) => (
                  <DropdownMenuItem key={org.id} onClick={() => handleSwitch(org.id)}>
                    <div className="flex size-5 items-center justify-center rounded bg-muted text-xs font-semibold shrink-0">
                      {org.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="flex-1 truncate">{org.name}</span>
                    {org.id === activeOrg?.id && <CheckIcon className="size-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link to="/organization" />}>
                <Settings2Icon className="size-4" />
                Organization settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-4" />
                Create organization
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
