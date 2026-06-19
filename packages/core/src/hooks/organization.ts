import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@workspace/app/auth/context"

export const organizationKeys = {
  list: ["organizations"] as const,
  active: ["active-organization"] as const,
  activeMember: (orgId: string) => ["active-member", orgId] as const,
  members: (orgId: string) => ["org-members", orgId] as const,
  invitations: (orgId: string) => ["org-invitations", orgId] as const,
  invitation: (id: string) => ["invitation", id] as const,
}

export function useOrganizations() {
  const auth = useAuth()
  return useQuery({
    queryKey: organizationKeys.list,
    queryFn: async () => {
      const { data } = await auth.organization.list()
      return data ?? []
    },
  })
}

export function useActiveOrganization() {
  const auth = useAuth()
  return useQuery({
    queryKey: organizationKeys.active,
    queryFn: async () => {
      const { data } = await auth.organization.getFullOrganization()
      return data ?? null
    },
  })
}

export function useActiveMember(orgId: string) {
  const auth = useAuth()
  return useQuery({
    queryKey: organizationKeys.activeMember(orgId),
    queryFn: async () => {
      const { data } = await auth.organization.getActiveMember()
      return data ?? null
    },
    enabled: !!orgId,
  })
}

export function useOrgMembers(orgId: string) {
  const auth = useAuth()
  return useQuery({
    queryKey: organizationKeys.members(orgId),
    queryFn: async () => {
      const { data } = await auth.organization.listMembers()
      return data?.members ?? []
    },
    enabled: !!orgId,
  })
}

export function useOrgInvitations(orgId: string) {
  const auth = useAuth()
  return useQuery({
    queryKey: organizationKeys.invitations(orgId),
    queryFn: async () => {
      const { data } = await auth.organization.listInvitations()
      return (data ?? []).filter((inv) => inv.status === "pending")
    },
    enabled: !!orgId,
  })
}

export function useInvitation(invitationId: string | undefined) {
  const auth = useAuth()
  return useQuery({
    queryKey: organizationKeys.invitation(invitationId ?? ""),
    queryFn: async () => {
      const { data } = await auth.organization.getInvitation({ query: { id: invitationId! } })
      return data ?? null
    },
    enabled: !!invitationId,
  })
}
