import { env } from 'cloudflare:workers'

interface MailerEnv {
  EMAIL: SendEmail
}

export function binding(): SendEmail {
  return (env as unknown as MailerEnv).EMAIL
}

export interface EmailFrom {
  email: string
  name: string
}

export interface EmailUser {
  email: string
  name?: string | null
}
