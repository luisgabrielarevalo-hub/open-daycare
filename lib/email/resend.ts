import { Resend } from "resend";

export const INVITATION_SENDER = "OpenDayCare <onboarding@resend.dev>";

let client: Resend | null = null;

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!client) {
    client = new Resend(apiKey);
  }

  return client;
}
