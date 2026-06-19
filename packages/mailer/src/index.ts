export interface SendEmailOptions {
  to: string | string[]
  from: string | { email: string; name: string }
  subject: string
  html: string
  text: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
}

export interface Mailer {
  send(options: SendEmailOptions): Promise<{ messageId: string }>
}

export function createMailer(binding: SendEmail): Mailer {
  return {
    send(options) {
      return binding.send(options)
    },
  }
}
