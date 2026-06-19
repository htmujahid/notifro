import { Separator } from "@workspace/ui/components/separator"
import { ChangeEmailForm } from "@workspace/core/components/account/change-email-form"
import { ChangePasswordForm } from "@workspace/core/components/account/change-password-form"
import { DeleteAccountDialog } from "@workspace/core/components/account/delete-account-dialog"

export default function AccountSecurityPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your email, password, and account access.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-6">
          <div>
            <h2 className="text-base font-medium">Email address</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              A verification email will be sent to the new address.
            </p>
          </div>
          <ChangeEmailForm />
        </section>

        <Separator />

        <section className="flex flex-col gap-6">
          <div>
            <h2 className="text-base font-medium">Password</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Changing your password will sign out all other sessions.
            </p>
          </div>
          <ChangePasswordForm />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-medium text-destructive">Danger zone</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Permanently delete your account and all associated data.
            </p>
          </div>
          <DeleteAccountDialog />
        </section>
      </div>
    </div>
  )
}
