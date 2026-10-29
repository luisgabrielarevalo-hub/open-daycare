import { getResendClient, INVITATION_SENDER } from "@/lib/email/resend";
import { renderInvitationEmail } from "@/lib/email/templates/invitation";

export type SendInvitationEmailInput = {
  to: string;
  childName: string;
  daycareName: string;
  code: string;
};

export type SendInvitationEmailResult =
  | { ok: true }
  | { ok: false };

function activationUrl(code: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const baseUrl = (configured || "http://localhost:3000").replace(/\/+$/, "");

  return `${baseUrl}/auth/activate?code=${encodeURIComponent(code)}`;
}

export async function sendInvitationEmail({
  to,
  childName,
  daycareName,
  code,
}: SendInvitationEmailInput): Promise<SendInvitationEmailResult> {
  try {
    const { subject, html } = renderInvitationEmail({
      childName,
      daycareName,
      code,
      activationUrl: activationUrl(code),
    });

    const { error } = await getResendClient().emails.send({
      from: INVITATION_SENDER,
      to,
      subject,
      html,
    });

    if (error) {
      return { ok: false };
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}
