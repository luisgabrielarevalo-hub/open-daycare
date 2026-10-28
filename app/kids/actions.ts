"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { parseAllergies, slugify } from "@/lib/kids/children";
import { createClient } from "@/lib/supabase/server";

export type CreateChildState = {
  status: "idle" | "success" | "error";
  message: string | null;
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
