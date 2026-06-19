import { useParams } from "react-router"
import { AcceptInvitationCard } from "@workspace/core/components/organization/accept-invitation-card"

export default function AcceptInvitationPage() {
  const { invitationId } = useParams<{ invitationId: string }>()
  return <AcceptInvitationCard invitationId={invitationId} />
}
