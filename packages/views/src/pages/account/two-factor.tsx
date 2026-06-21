import { TwoFactorSettings } from "@workspace/core/components/account/two-factor-settings"

export default function AccountTwoFactorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          Two-factor authentication
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Require a second verification step when signing in.
        </p>
      </div>

      <TwoFactorSettings />
    </div>
  )
}
