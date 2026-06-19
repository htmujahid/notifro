import { binding, type EmailFrom } from '../binding'

export async function sendInvitationEmail({
  email,
  inviterName,
  orgName,
  url,
  from,
}: {
  email: string
  inviterName: string
  orgName: string
  url: string
  from: string | EmailFrom
}) {
  await binding().send({
    to: email,
    from,
    subject: `You've been invited to join ${orgName}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111;">
  <h2 style="margin-bottom:8px;">You've been invited</h2>
  <p style="color:#555;"><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Renderical.</p>
  <a href="${url}" style="display:inline-block;margin:24px 0;padding:12px 24px;background:#000;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Accept invitation</a>
  <p style="color:#999;font-size:13px;">If you weren't expecting this invitation, you can safely ignore this email. The link expires in 48 hours.</p>
  <p style="color:#ccc;font-size:12px;margin-top:32px;">If the button doesn't work, copy this link: <a href="${url}" style="color:#999;">${url}</a></p>
</body>
</html>`,
    text: `${inviterName} has invited you to join ${orgName} on Renderical.\n\nAccept the invitation by visiting:\n\n${url}\n\nThis link expires in 48 hours.`,
  })
}
