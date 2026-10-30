import { AppShell } from "@/components/layout/AppShell";
import { AddChildModal } from "@/components/kids/AddChildModal";
import { KidsDirectory } from "@/components/kids/KidsDirectory";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import { toChildView, type ChildRow, type RoomOption } from "@/lib/kids/children";
import { createClient } from "@/lib/supabase/server";

export default async function KidsPage() {
  const [profile, supabase] = await Promise.all([
    requireProfile(),
    createClient(),
  ]);

  if (profile.roleKey === "parent") redirect("/");

  const [{ data: rooms }, { data: rows }] = await Promise.all([
    supabase.from("rooms").select("id, name"),
    supabase
      .from("children")
      .select(
        "id, slug, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, status, rooms(name)",
      )
      .eq("status", "active")
      .order("full_name"),
  ]);

  const roomOptions = (rooms ?? []) as RoomOption[];
  const children = ((rows ?? []) as unknown as ChildRow[]).map(toChildView);

  return (
    <AppShell profile={profile} activeNav="kids">
      <div className="mx-auto w-full max-w-[880px] px-10 pt-[34px] pb-20">
        <div className="mb-[22px] flex items-end justify-between gap-4">
          <div>
            <div className="mb-1 text-[12.5px] font-extrabold tracking-[0.8px] text-coral-deep-light">
              GESTIÓN
            </div>
            <h1 className="font-display text-[30px] font-semibold text-ink">
              Niños
            </h1>
          </div>
          {children.length > 0 ? <AddChildModal rooms={roomOptions} /> : null}
        </div>

        <KidsDirectory rooms={roomOptions}>{children}</KidsDirectory>
      </div>
    </AppShell>
  );
}
