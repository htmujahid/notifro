import { PreferencesView } from "@workspace/core/components/preferences/preferences-view"
import { useSearchParams } from "react-router"

export default function PreferencesPage() {
  const [params] = useSearchParams()
  const token = params.get("token") ?? undefined
  return <PreferencesView token={token} />
}
