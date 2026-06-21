import { binding } from '../binding'
import type { EmailFrom } from '../binding'

export async function sendNotificationEmail({
  to,
  from,
  subject,
  html,
  text,
  headers,
}: {
  to: string
  from: EmailFrom
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
}): Promise<void> {
  const message: { from: EmailFrom; to: string; subject: string; html: string; text: string; headers?: Record<string, string> } = {
    from,
    to,
    subject,
    html,
    text,
  }
  if (headers) {
    message.headers = headers
  }
  await binding().send(message as Parameters<ReturnType<typeof binding>['send']>[0])
}
