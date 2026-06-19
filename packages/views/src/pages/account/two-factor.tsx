import { TwoFactorSettings } from "@workspace/core/components/account/two-factor-settings"

export default function AccountTwoFactorPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Two-factor authentication</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Require a second verification step when signing in.
        </p>
      </div>

      <TwoFactorSettings />
    </div>
  )
}
