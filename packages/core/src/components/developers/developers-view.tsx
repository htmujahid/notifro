import { PageHeader } from "@notifro/ui-primitives/components/page-header"

import { ApiKeysSection } from "./api-keys-section"
import { McpSection } from "./mcp-section"
import { RequestLogSection } from "./request-log-section"

export function DevelopersView() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Developers"
        description="API keys, request inspector, and logs."
      />

      <ApiKeysSection />
      <McpSection />
      <RequestLogSection />
    </div>
  )
}
