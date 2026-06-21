import { PageHeader } from "@renderical/ui-primitives/components/page-header"

import { ApiKeysSection } from "./api-keys-section"
import { McpSection } from "./mcp-section"
import { RequestLogSection } from "./request-log-section"
import { SandboxPanel } from "./sandbox-panel"

export function DevelopersView() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Developers"
        description="API keys, request inspector, and sandbox testing."
      />

      <ApiKeysSection />
      <McpSection />
      <SandboxPanel />
      <RequestLogSection />
    </div>
  )
}
