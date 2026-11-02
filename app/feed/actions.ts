"use server";

import { revalidatePath } from "next/cache";
import type { PostKind } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const POST_KINDS: PostKind[] = [
  "meal",
  "nap",
  "activity",
  "achievement",
  "mood",
  "photo",
  "announcement",
];

const MAX_BODY_LENGTH = 1000;
const MAX_PHOTOS = 4;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NO_PERMISSION = "No tenés permiso para publicar.";
const RECIPIENT_REQUIRED = "Elegí al menos un destinatario.";
const INVALID_RECIPIENTS = "Alguno de los destinatarios no es válido.";
const BODY_REQUIRED = "Escribí una descripción.";
const BODY_TOO_LONG =
  "La descripción no puede superar los 1000 caracteres.";
const TOO_MANY_PHOTOS = "Podés adjuntar hasta 4 fotos.";
const INVALID_PHOTOS = "No pudimos validar las fotos. Intentá de nuevo.";
const GENERIC_ERROR = "No pudimos publicar. Intentá de nuevo.";

const RPC_ERROR_MESSAGES: Record<string, string> = {
  not_allowed: NO_PERMISSION,
  children_required: RECIPIENT_REQUIRED,
  invalid_children: INVALID_RECIPIENTS,
  invalid_body: BODY_REQUIRED,
  photo_consent_missing:
    "No se pueden adjuntar fotos: hay niños sin consentimiento de imagen.",
  too_many_photos: TOO_MANY_PHOTOS,
  invalid_photo_path: INVALID_PHOTOS,
  photo_path_in_use:
    "No pudimos guardar las fotos. Intentá de nuevo.",
};

export type CreatePostInput = {
  kind: PostKind;
  recipientIds: (string | "room")[];
  body: string;
  photoPaths: string[];
};

export type CreatePostResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

type ProfileRow = {
  daycare_id: string | null;
  role: string | null;
  status: string | null;
};

function translateRpcError(message: string): string {
  for (const [code, translation] of Object.entries(RPC_ERROR_MESSAGES)) {
    if (message.includes(code)) {
      return translation;
    }
  }

  return GENERIC_ERROR;
}

function isValidPhotoPath(path: string, daycareId: string): boolean {
  const [pathDaycare, draftId, file] = path.split("/");

  return (
    pathDaycare === daycareId &&
    Boolean(draftId && UUID_PATTERN.test(draftId)) &&
    /^[0-3]\.webp$/.test(file ?? "")
  );
}

export async function createPost(
  input: CreatePostInput,
): Promise<CreatePostResult> {
  if (!input || typeof input !== "object" || typeof input.body !== "string") {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return { ok: false, error: NO_PERMISSION };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("daycare_id, role, status")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (
    !profile?.daycare_id ||
    (profile.role !== "staff" && profile.role !== "admin") ||
    profile.status !== "active"
  ) {
    return { ok: false, error: NO_PERMISSION };
  }

  if (!POST_KINDS.includes(input.kind)) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const recipientIds = Array.isArray(input.recipientIds)
    ? input.recipientIds
    : [];

  if (recipientIds.length === 0) {
    return { ok: false, error: RECIPIENT_REQUIRED };
  }

  const isRoom = recipientIds.includes("room");
  const childIds = recipientIds.filter(
    (recipient): recipient is string => recipient !== "room",
  );
  const uniqueChildIds = [...new Set(childIds)];

  if (isRoom) {
    if (recipientIds.length !== 1) {
      return { ok: false, error: INVALID_RECIPIENTS };
    }
  } else if (
    uniqueChildIds.length === 0 ||
    uniqueChildIds.some((childId) => !UUID_PATTERN.test(childId))
  ) {
    return { ok: false, error: RECIPIENT_REQUIRED };
  }

  const body = input.body.trim();

  if (body.length === 0) {
    return { ok: false, error: BODY_REQUIRED };
  }

  if (body.length > MAX_BODY_LENGTH) {
    return { ok: false, error: BODY_TOO_LONG };
  }

  const photoPaths = Array.isArray(input.photoPaths) ? input.photoPaths : [];

  if (
    photoPaths.length > MAX_PHOTOS ||
    new Set(photoPaths).size !== photoPaths.length ||
    photoPaths.some(
      (path) =>
        typeof path !== "string" ||
        !isValidPhotoPath(path, profile.daycare_id as string),
    )
  ) {
    return {
      ok: false,
      error: photoPaths.length > MAX_PHOTOS ? TOO_MANY_PHOTOS : INVALID_PHOTOS,
    };
  }

  const { data, error } = await supabase.rpc("create_post", {
    p_type: input.kind,
    p_audience_kind: isRoom ? "daycare" : "children",
    p_body: body,
    p_child_ids: isRoom ? [] : uniqueChildIds,
    p_photo_paths: photoPaths,
  });

  if (error) {
    return { ok: false, error: translateRpcError(error.message) };
  }

  revalidatePath("/");

  return { ok: true, postId: String(data) };
}

export async function deletePostPhotos(paths: string[]): Promise<void> {
  if (!Array.isArray(paths) || paths.length === 0) {
    return;
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("daycare_id, role, status")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (
    !profile?.daycare_id ||
    (profile.role !== "staff" && profile.role !== "admin") ||
    profile.status !== "active"
  ) {
    return;
  }

  const prefix = `${profile.daycare_id}/`;
  const allowedPaths = paths.filter(
    (path) => typeof path === "string" && path.startsWith(prefix),
  );

  if (allowedPaths.length === 0) {
    return;
  }

  const { data: usedPhotos } = await supabase
    .from("post_photos")
    .select("path")
    .in("path", allowedPaths);
  const usedPaths = new Set(
    (usedPhotos ?? []).map((photo: { path: string }) => photo.path),
  );
  const orphanPaths = allowedPaths.filter((path) => !usedPaths.has(path));

  if (orphanPaths.length === 0) {
    return;
  }

  try {
    await createAdminClient()
      .storage.from("post-photos")
      .remove(orphanPaths);
  } catch {
    // Best-effort cleanup; an orphan sweeper can handle the rest later.
  }
}
