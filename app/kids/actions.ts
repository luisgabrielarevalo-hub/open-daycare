"use server";

import { randomInt, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sendInvitationEmail } from "@/lib/email/send-invitation-email";
import { parseAllergies, slugify } from "@/lib/kids/children";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CreateChildState = {
  status: "idle" | "success" | "error";
  message: string | null;
  attempt: number;
};

export type ParentInvitationState = {
  status: "idle" | "success" | "error";
  message: string | null;
  code: string | null;
  email: string | null;
  attempt: number;
};

const GENERIC_ERROR = "No pudimos guardar el niño. Intentá de nuevo.";
const EMPTY_NAME = "Ingresá el nombre completo";
const EMPTY_DATE = "Ingresá la fecha de nacimiento";
const INVALID_DATE = "Ingresá una fecha de nacimiento válida";
const FUTURE_DATE = "La fecha no puede ser futura";
const EMPTY_ROOM = "Seleccioná una sala";

const MAX_SLUG_ATTEMPTS = 20;
const MAX_INSERT_ATTEMPTS = 5;

type RoomRow = {
  id: string;
  daycare_id: string;
};

function todayValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function fallbackSlug(): string {
  return `child-${randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

function candidateSlugs(base: string): string[] {
  const candidates = [base];

  for (let index = 2; index <= MAX_SLUG_ATTEMPTS; index += 1) {
    candidates.push(`${base}-${index}`);
  }

  return candidates;
}

function errorState(message: string, attempt: number): CreateChildState {
  return { status: "error", message, attempt };
}

const INVITATION_GENERIC_ERROR =
  "No pudimos enviar la invitación. Intentá de nuevo.";
const EMPTY_PARENT_NAME = "Ingresá el nombre del padre/madre";
const EMPTY_EMAIL = "Ingresá el email";
const INVALID_EMAIL = "Ingresá un email válido";
const INVALID_RELATIONSHIP = "Seleccioná un parentesco válido";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITATION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITATION_CODE_LENGTH = 5;
const MAX_CODE_ATTEMPTS = 10;
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const RELATIONSHIP_BY_LABEL = {
  Mamá: "mother",
  Papá: "father",
  "Tutor/a": "guardian",
} as const;

type RelationshipValue =
  (typeof RELATIONSHIP_BY_LABEL)[keyof typeof RELATIONSHIP_BY_LABEL];

type StaffRow = {
  role: string | null;
  daycare_id: string | null;
  daycares: { name: string | null } | null;
};

type InvitationChildRow = {
  id: string;
  full_name: string;
  daycare_id: string;
};

function invitationError(
  message: string,
  attempt: number,
): ParentInvitationState {
  return {
    status: "error",
    message,
    code: null,
    email: null,
    attempt,
  };
}

function generateInvitationCode(): string {
  let code = "";

  for (let index = 0; index < INVITATION_CODE_LENGTH; index += 1) {
    code += INVITATION_CODE_ALPHABET[randomInt(INVITATION_CODE_ALPHABET.length)];
  }

  return code;
}

function relationshipFromLabel(label: string): RelationshipValue | null {
  return Object.hasOwn(RELATIONSHIP_BY_LABEL, label)
    ? RELATIONSHIP_BY_LABEL[label as keyof typeof RELATIONSHIP_BY_LABEL]
    : null;
}

export async function createChild(
  previousState: CreateChildState,
  formData: FormData,
): Promise<CreateChildState> {
  const attempt = previousState.attempt + 1;
  const fullName = String(formData.get("fullName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const allergies = String(formData.get("allergies") ?? "");
  const medicalNotes = String(formData.get("medicalNotes") ?? "").trim();

  if (!fullName) {
    return errorState(EMPTY_NAME, attempt);
  }

  if (!birthDate) {
    return errorState(EMPTY_DATE, attempt);
  }

  if (!isValidDateOnly(birthDate)) {
    return errorState(INVALID_DATE, attempt);
  }

  if (birthDate > todayValue()) {
    return errorState(FUTURE_DATE, attempt);
  }

  if (!roomId) {
    return errorState(EMPTY_ROOM, attempt);
  }

  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, daycare_id")
    .eq("id", roomId)
    .maybeSingle<RoomRow>();

  if (!room) {
    return errorState(GENERIC_ERROR, attempt);
  }

  const parsedAllergies = parseAllergies(allergies);
  const notes = [medicalNotes, parsedAllergies.notes]
    .filter((value): value is string => Boolean(value))
    .join("\n");
  const base = slugify(fullName) || fallbackSlug();

  for (let insertAttempt = 0; insertAttempt < MAX_INSERT_ATTEMPTS; insertAttempt += 1) {
    const { data: existing, error: lookupError } = await supabase
      .from("children")
      .select("slug")
      .in("slug", candidateSlugs(base));

    if (lookupError) {
      return errorState(GENERIC_ERROR, attempt);
    }

    const taken = new Set(
      (existing ?? []).map((row: { slug: string }) => row.slug),
    );
    const slug = candidateSlugs(base).find((candidate) => !taken.has(candidate));

    if (!slug) {
      return errorState(GENERIC_ERROR, attempt);
    }

    const { error } = await supabase.from("children").insert({
      room_id: room.id,
      daycare_id: room.daycare_id,
      slug,
      full_name: fullName,
      birth_date: birthDate,
      medical_notes: notes || null,
      allergy_tags: parsedAllergies.tags,
    });

    if (!error) {
      revalidatePath("/kids");
      revalidatePath("/");
      return { status: "success", message: null, attempt };
    }

    if (error.code !== "23505") {
      return errorState(GENERIC_ERROR, attempt);
    }
  }

  return errorState(GENERIC_ERROR, attempt);
}

export async function createParentInvitation(
  previousState: ParentInvitationState,
  formData: FormData,
): Promise<ParentInvitationState> {
  const attempt = previousState.attempt + 1;
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const relationshipLabel = String(formData.get("relationship") ?? "").trim();
  const childId = String(formData.get("childId") ?? "").trim();

  if (!fullName) {
    return invitationError(EMPTY_PARENT_NAME, attempt);
  }

  if (!email) {
    return invitationError(EMPTY_EMAIL, attempt);
  }

  if (!EMAIL_PATTERN.test(email)) {
    return invitationError(INVALID_EMAIL, attempt);
  }

  const relationship = relationshipFromLabel(relationshipLabel);

  if (!relationship) {
    return invitationError(INVALID_RELATIONSHIP, attempt);
  }

  if (!childId) {
    return invitationError(INVITATION_GENERIC_ERROR, attempt);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (!claims?.sub) {
    return invitationError(INVITATION_GENERIC_ERROR, attempt);
  }

  const { data: staff } = await supabase
    .from("users")
    .select("role, daycare_id, daycares(name)")
    .eq("id", claims.sub)
    .maybeSingle<StaffRow>();

  if (
    !staff?.daycare_id ||
    (staff.role !== "staff" && staff.role !== "admin")
  ) {
    return invitationError(INVITATION_GENERIC_ERROR, attempt);
  }

  const { data: child } = await supabase
    .from("children")
    .select("id, full_name, daycare_id")
    .eq("id", childId)
    .maybeSingle<InvitationChildRow>();

  if (!child || child.daycare_id !== staff.daycare_id) {
    return invitationError(INVITATION_GENERIC_ERROR, attempt);
  }

  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
  let invitation: { id: string; code: string } | null = null;

  for (let codeAttempt = 0; codeAttempt < MAX_CODE_ATTEMPTS; codeAttempt += 1) {
    const code = generateInvitationCode();
    const { data: inserted, error } = await supabase
      .from("invitations")
      .insert({
        child_id: child.id,
        daycare_id: staff.daycare_id,
        invited_by: claims.sub,
        full_name: fullName,
        email,
        relationship,
        code,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error) {
      if (error.code !== "23505") {
        return invitationError(INVITATION_GENERIC_ERROR, attempt);
      }
      continue;
    }

    if (inserted) {
      invitation = { id: inserted.id, code };
      break;
    }

    return invitationError(INVITATION_GENERIC_ERROR, attempt);
  }

  if (!invitation) {
    return invitationError(INVITATION_GENERIC_ERROR, attempt);
  }

  const emailResult = await sendInvitationEmail({
    to: email,
    childName: child.full_name,
    daycareName: staff.daycares?.name ?? "la guardería",
    code: invitation.code,
  });

  if (!emailResult.ok) {
    try {
      await createAdminClient()
        .from("invitations")
        .update({ status: "cancelled" })
        .eq("id", invitation.id);
    } catch {
      // Keep the response generic even if the admin client is unavailable.
    }

    return invitationError(INVITATION_GENERIC_ERROR, attempt);
  }

  revalidatePath("/kids/[slug]", "page");

  return {
    status: "success",
    message: null,
    code: invitation.code,
    email,
    attempt,
  };
}
