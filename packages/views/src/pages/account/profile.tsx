import { ProfileForm } from "@workspace/core/components/account/profile-form"

export default function AccountProfilePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your name and profile picture.
        </p>
      </div>
      <ProfileForm />
    </div>
  )
}
