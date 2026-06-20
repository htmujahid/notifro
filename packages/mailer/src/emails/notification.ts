import { binding } from '../binding'
import type { EmailFrom } from '../binding'

export async function sendNotificationEmail({
  to,
  from,
  subject,
  html,
  text,
}: {
  to: string
  from: EmailFrom
  subject: string
  html: string
  text: string
}): Promise<void> {
  await binding().send({
    from,
    to,
    subject,
    html,
    text,
  })
}
