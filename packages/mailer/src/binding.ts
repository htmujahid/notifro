import { env } from 'cloudflare:workers'

interface MailerEnv {
  EMAIL: SendEmail
  EMAIL_LOG_ONLY?: string
}

function resolveEmail(addr: string | EmailAddress): string {
  return typeof addr === 'string' ? addr : addr.email
}

function resolveRecipients(to: string | EmailAddress | (string | EmailAddress)[]): string {
  return Array.isArray(to) ? to.map(resolveEmail).join(', ') : resolveEmail(to)
}

const consoleMock: SendEmail = {
  send(
    message:
      | EmailMessage
      | {
          from: string | EmailAddress
          to: string | EmailAddress | (string | EmailAddress)[]
          subject: string
          text?: string
          html?: string
        },
  ): Promise<EmailSendResult> {
    if ('subject' in message) {
      console.log('\n[EMAIL LOG]')
      console.log(`  To:      ${resolveRecipients(message.to)}`)
      console.log(`  Subject: ${message.subject}`)
      if (message.text) {
        console.log(`  Body:\n${message.text.split('\n').map((l: string) => `    ${l}`).join('\n')}`)
      }
      console.log('')
    }
    return Promise.resolve({ messageId: 'local-mock' })
  },
}

export function binding(): SendEmail {
  const e = env as unknown as MailerEnv
  if (e.EMAIL_LOG_ONLY === 'true') return consoleMock
  return e.EMAIL
}

export interface EmailFrom {
  email: string
  name: string
}

export interface EmailUser {
  email: string
  name?: string | null
}
