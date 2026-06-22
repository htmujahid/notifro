import { PhoneNumberForm } from "@notifro/core/components/account/phone-number-form"
import { ProfileForm } from "@notifro/core/components/account/profile-form"
import { Separator } from "@notifro/ui/components/separator"

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

      <Separator />

      <section className="flex flex-col gap-6">
        <div>
          <h3 className="text-base font-medium">Phone number</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            A verified phone number is required to receive SMS and WhatsApp
            notifications.
          </p>
        </div>
        <PhoneNumberForm />
      </section>
    </div>
  )
}
