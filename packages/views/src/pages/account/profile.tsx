import { ProfileForm } from "@renderical/core/components/account/profile-form"

export default function AccountProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your name and profile picture.
        </p>
      </div>
      <ProfileForm />
    </div>
  )
}
