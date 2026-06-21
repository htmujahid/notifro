import { useSearchParams } from "react-router"

import { UnsubscribeView } from "@renderical/core/components/unsubscribe/unsubscribe-view"

export default function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get("token") ?? undefined
  return <UnsubscribeView token={token} />
}
