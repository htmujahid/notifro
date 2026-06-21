import { type EmailFrom, type EmailUser, binding } from "../binding"

export async function sendVerificationEmail({
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
    subject: "Verify your email address",
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111;">
  <h2 style="margin-bottom:8px;">Verify your email</h2>
  <p style="color:#555;">Hi ${name}, thanks for signing up. Click the button below to verify your email address.</p>
  <a href="${url}" style="display:inline-block;margin:24px 0;padding:12px 24px;background:#000;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Verify email</a>
  <p style="color:#999;font-size:13px;">If you didn't create an account, you can safely ignore this email. This link expires in 24 hours.</p>
  <p style="color:#ccc;font-size:12px;margin-top:32px;">If the button doesn't work, copy this link: <a href="${url}" style="color:#999;">${url}</a></p>
</body>
</html>`,
    text: `Hi ${name},\n\nVerify your email address by visiting the link below:\n\n${url}\n\nIf you didn't create an account, ignore this email. The link expires in 24 hours.`,
  })
}
