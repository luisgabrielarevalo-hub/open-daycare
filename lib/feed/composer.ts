import { cache } from "react";
import type { ComposerData, RecipientOption } from "@/lib/feed/posts";
import { avatarPalette } from "@/lib/kids/children";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  daycare_id: string | null;
  role: string | null;
  status: string | null;
};

type ChildRow = {
  id: string;
  full_name: string;
  photo_consent: boolean;
};

export const getComposerData = cache(async (): Promise<ComposerData | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return null;
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
    return null;
  }

  const { data: children, error } = await supabase
    .from("children")
    .select("id, full_name, photo_consent")
    .eq("status", "active")
    .order("full_name");

  if (error) {
    console.error("No pudimos leer los destinatarios del composer", error);
    return null;
  }

  const recipients: RecipientOption[] = ((children ?? []) as ChildRow[]).map(
    (child) => {
      const palette = avatarPalette(child.id);

      return {
        id: child.id,
        fullName: child.full_name,
        firstName: child.full_name.trim().split(/\s+/)[0] ?? child.full_name,
        avatarBg: palette.bg,
        avatarColor: palette.fg,
        photoConsent: child.photo_consent,
      };
    },
  );

  return {
    daycareId: profile.daycare_id,
    recipients,
    allChildrenPhotoConsent: recipients.every(
      (recipient) => recipient.photoConsent,
    ),
  };
});
