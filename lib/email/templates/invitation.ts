export type InvitationEmailInput = {
  childName: string;
  daycareName: string;
  code: string;
  activationUrl: string;
};

export type InvitationEmail = {
  subject: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderInvitationEmail({
  childName,
  daycareName,
  code,
  activationUrl,
}: InvitationEmailInput): InvitationEmail {
  const safeChildName = escapeHtml(childName);
  const safeDaycareName = escapeHtml(daycareName);
  const safeCode = escapeHtml(code);
  const safeUrl = escapeHtml(activationUrl);

  const subject = `Invitación para vincular a ${childName} en OpenDayCare`;

  const html = `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#FFF9F1;font-family:Arial,Helvetica,sans-serif;color:#3F362E;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF9F1;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#FFFFFF;border:1px solid #EFE5D8;border-radius:24px;padding:32px;">
            <tr>
              <td style="font-size:20px;font-weight:bold;color:#3F362E;padding-bottom:8px;">
                OpenDayCare
              </td>
            </tr>
            <tr>
              <td style="font-size:15px;line-height:1.5;color:#6B5F52;padding-bottom:20px;">
                ${safeDaycareName} te invitó a seguir a ${safeChildName} en OpenDayCare.
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:1.5;color:#6B5F52;padding-bottom:12px;">
                Tu código de invitación es:
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <div style="display:inline-block;background-color:#FFF4E8;border:2px dashed #F0C9A8;border-radius:16px;padding:16px 28px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#C25A3E;">
                  ${safeCode}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <a href="${safeUrl}" style="display:inline-block;background-color:#EE8164;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:bold;border-radius:14px;padding:14px 24px;">
                  Activar mi cuenta
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;line-height:1.5;color:#8A7C6D;padding-bottom:8px;">
                También podés ingresar el código manualmente en la pantalla de activación.
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;line-height:1.5;color:#8A7C6D;">
                El código vence en 7 días. Si no esperabas esta invitación, podés ignorar este correo.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}
