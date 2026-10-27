import { cache } from "react";
import { redirect } from "next/navigation";
import { feedSummary, type StaffProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const ROLE_LABELS: Record<string, string> = {
  staff: "Staff",
  parent: "Familia",
  admin: "Admin",
};

type ProfileRow = {
  full_name: string | null;
  role: string | null;
  daycares: { name: string | null } | null;
};

export const requireProfile = cache(async (): Promise<StaffProfile> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    redirect("/auth/login");
  }

  const { data: row } = await supabase
    .from("users")
    .select("full_name, role, daycares(name)")
    .eq("id", claims.sub)
    .maybeSingle<ProfileRow>();

  const metadataName = claims.user_metadata?.full_name;
  const fallbackName =
    (typeof metadataName === "string" ? metadataName.trim() : "") ||
    claims.email?.split("@")[0] ||
    "Usuario";

  const name = row?.full_name?.trim() || fallbackName;
  const room = row?.daycares?.name
    ? row.daycares.name.replace(/^Guardería\s+/i, "")
    : "";

  return {
    name,
    role: ROLE_LABELS[row?.role ?? ""] ?? "Staff",
    initial: name.charAt(0).toUpperCase() || "U",
    room,
    childCount: feedSummary.childCount,
    dateLabel: feedSummary.dateLabel,
  };
});
