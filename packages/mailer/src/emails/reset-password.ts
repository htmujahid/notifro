import { binding, type EmailFrom, type EmailUser } from '../binding'

export async function sendResetPasswordEmail({
  user,
  url,
  from,
}: {
  user: EmailUser
  url: string
  from: string | EmailFrom
}) {
  const name = user.name ?? user.email
  await binding().send({
    to: user.email,
    from,
    subject: 'Reset your password',
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111;">
  <h2 style="margin-bottom:8px;">Reset your password</h2>
  <p style="color:#555;">Hi ${name}, we received a request to reset your password. Click the button below to choose a new one.</p>
  <a href="${url}" style="display:inline-block;margin:24px 0;padding:12px 24px;background:#000;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Reset password</a>
  <p style="color:#999;font-size:13px;">If you didn't request a password reset, you can safely ignore this email. This link expires in 1 hour.</p>
  <p style="color:#ccc;font-size:12px;margin-top:32px;">If the button doesn't work, copy this link: <a href="${url}" style="color:#999;">${url}</a></p>
</body>
</html>`,
    text: `Hi ${name},\n\nReset your password by visiting the link below:\n\n${url}\n\nIf you didn't request a password reset, ignore this email. The link expires in 1 hour.`,
  })
}
