"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActivateState = {
  status: "idle" | "success" | "error";
  message: string | null;
  attempt: number;
};

type InvitationLookup = {
  id: string;
  child_id: string;
  daycare_id: string;
  full_name: string;
  email: string;
  relationship: "father" | "mother" | "guardian";
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
};

type AdminClient = ReturnType<typeof createAdminClient>;

const CODE_PATTERN = /^[A-Z0-9]{5}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const INVALID_CODE = "El código de invitación no es válido.";
const EXPIRED_INVITATION =
  "La invitación venció. Pedí una nueva invitación a la guardería.";
const USED_INVITATION = "Esta invitación ya fue utilizada.";
const EMPTY_EMAIL = "Ingresá tu email.";
const INVALID_EMAIL = "Ingresá un email válido.";
const SHORT_PASSWORD = "La contraseña debe tener al menos 8 caracteres.";
const CONSENT_REQUIRED =
  "Tenés que autorizar el uso de fotos para continuar.";
const DUPLICATE_EMAIL = "Ya existe una cuenta con este email. Iniciá sesión.";
const GENERIC_ERROR = "No pudimos activar la cuenta. Intentá de nuevo.";

function errorState(message: string, attempt: number): ActivateState {
  return { status: "error", message, attempt };
}

function normalizeCode(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

function isDuplicateEmail(error: { code?: string; message?: string }): boolean {
  if (error.code === "email_exists") {
    return true;
  }

  return /already (been )?registered|already exists/i.test(error.message ?? "");
}

async function deleteUserQuietly(admin: AdminClient, userId: string) {
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // Best effort: the activation already failed and the response stays generic.
  }
}

async function releaseInvitationQuietly(
  admin: AdminClient,
  invitationId: string,
) {
  try {
    await admin
      .from("invitations")
      .update({ status: "pending", accepted_at: null })
      .eq("id", invitationId)
      .eq("status", "accepted");
  } catch {
    // Best effort: the activation already failed and the response stays generic.
  }
}

export async function activateAccount(
  previousState: ActivateState,
  formData: FormData,
): Promise<ActivateState> {
  const attempt = previousState.attempt + 1;
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const consent = formData.get("consent") === "on";

  if (!CODE_PATTERN.test(code)) {
    return errorState(INVALID_CODE, attempt);
  }

  if (!email) {
    return errorState(EMPTY_EMAIL, attempt);
  }

  if (!EMAIL_PATTERN.test(email)) {
    return errorState(INVALID_EMAIL, attempt);
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return errorState(SHORT_PASSWORD, attempt);
  }

  if (!consent) {
    return errorState(CONSENT_REQUIRED, attempt);
  }

  try {
    const admin = createAdminClient();

    const { data: invitation, error: lookupError } = await admin
      .from("invitations")
      .select(
        "id, child_id, daycare_id, full_name, email, relationship, status, expires_at",
      )
      .eq("code", code)
      .maybeSingle<InvitationLookup>();

    if (lookupError) {
      return errorState(GENERIC_ERROR, attempt);
    }

    if (!invitation) {
      return errorState(INVALID_CODE, attempt);
    }

    if (invitation.status === "accepted") {
      return errorState(USED_INVITATION, attempt);
    }

    if (
      invitation.status === "expired" ||
      new Date(invitation.expires_at).getTime() <= Date.now()
    ) {
      return errorState(EXPIRED_INVITATION, attempt);
    }

    if (invitation.status !== "pending") {
      return errorState(INVALID_CODE, attempt);
    }

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          daycare_id: invitation.daycare_id,
          role: "parent",
          full_name: invitation.full_name,
        },
      });

    if (createError || !created.user) {
      return errorState(
        createError && isDuplicateEmail(createError)
          ? DUPLICATE_EMAIL
          : GENERIC_ERROR,
        attempt,
      );
    }

    const userId = created.user.id;

    const { error: linkError } = await admin.from("parent_children").insert({
      parent_id: userId,
      child_id: invitation.child_id,
      relationship: invitation.relationship,
    });

    if (linkError) {
      await deleteUserQuietly(admin, userId);
      return errorState(GENERIC_ERROR, attempt);
    }

    const { data: claimed, error: claimError } = await admin
      .from("invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invitation.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle<{ id: string }>();

    if (claimError || !claimed) {
      await deleteUserQuietly(admin, userId);

      return errorState(
        claimError ? GENERIC_ERROR : USED_INVITATION,
        attempt,
      );
    }

    const { error: consentError } = await admin
      .from("children")
      .update({ photo_consent: consent })
      .eq("id", invitation.child_id);

    if (consentError) {
      await releaseInvitationQuietly(admin, invitation.id);
      await deleteUserQuietly(admin, userId);
      return errorState(GENERIC_ERROR, attempt);
    }
  } catch {
    return errorState(GENERIC_ERROR, attempt);
  }

  redirect("/auth/login?activated=1");
}
