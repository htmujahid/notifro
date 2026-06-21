import { type EmailFrom, type EmailUser, binding } from "../binding"

export async function sendVerificationOTPEmail({
  user,
  otp,
  from,
}: {
  user: EmailUser
  otp: string
  from: string | EmailFrom
}) {
  const name = user.name ?? user.email
  await binding().send({
    to: user.email,
    from,
    subject: "Your verification code",
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111;">
  <h2 style="margin-bottom:8px;">Verify your email</h2>
  <p style="color:#555;">Hi ${name}, thanks for signing up. Use the code below to verify your email address.</p>
  <div style="margin:24px 0;padding:16px 24px;background:#f4f4f5;border-radius:8px;text-align:center;">
    <span style="font-size:32px;font-weight:700;letter-spacing:8px;font-family:monospace;">${otp}</span>
  </div>
  <p style="color:#999;font-size:13px;">This code expires in 5 minutes. If you didn't create an account, you can safely ignore this email.</p>
</body>
</html>`,
    text: `Hi ${name},\n\nYour email verification code is: ${otp}\n\nThis code expires in 5 minutes. If you didn't create an account, ignore this email.`,
  })
}
