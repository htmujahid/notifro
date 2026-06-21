import { useParams } from "react-router"
import { TemplateEditView } from "@workspace/core/components/templates/template-edit"

export default function TemplateEditPage() {
  const { id } = useParams<{ id: string }>()
  return <TemplateEditView templateId={id === "new" ? undefined : id} />
}
