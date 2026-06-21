import { ApiKeysSection } from "./api-keys-section"
import { McpSection } from "./mcp-section"
import { SandboxPanel } from "./sandbox-panel"
import { RequestLogSection } from "./request-log-section"

export function DevelopersView() {
  return (
    <div className="flex flex-col gap-8 p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-lg font-semibold">Developers</h1>
        <p className="mt-1 text-sm text-muted-foreground">API keys, request inspector, and sandbox testing.</p>
      </div>

      <ApiKeysSection />
      <McpSection />
      <SandboxPanel />
      <RequestLogSection />
    </div>
  )
}
