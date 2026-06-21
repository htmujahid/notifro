import { useSearchParams } from "react-router"

import { PreferencesView } from "@renderical/core/components/preferences/preferences-view"

export default function PreferencesPage() {
  const [params] = useSearchParams()
  const token = params.get("token") ?? undefined
  return <PreferencesView token={token} />
}
