import { useActiveOrganization } from "../../hooks/organization"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { OrgGeneralSettings } from "./org-general-settings"
import { OrgMembersList } from "./org-members-list"
import { OrgInvitationsList } from "./org-invitations-list"

export function OrgSettingsPanel() {
  const { data: org } = useActiveOrganization()

  if (!org) {
    return (
      <p className="text-sm text-muted-foreground">
        No active organization. Select or create one from the sidebar.
      </p>
    )
  }

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="invitations">Invitations</TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="pt-4">
        <OrgGeneralSettings />
      </TabsContent>
      <TabsContent value="members" className="pt-4">
        <OrgMembersList />
      </TabsContent>
      <TabsContent value="invitations" className="pt-4">
        <OrgInvitationsList />
      </TabsContent>
    </Tabs>
  )
}
