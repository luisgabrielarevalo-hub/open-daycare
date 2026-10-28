import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AllergyNote } from "@/components/kids/AllergyNote";
import { LinkedParentsCard } from "@/components/kids/LinkedParentsCard";
import { ChevronLeftIcon, SunIcon } from "@/components/ui/icons";
import { requireProfile } from "@/lib/auth/profile";
import { toChildView, type ChildRow } from "@/lib/kids/children";
import { createClient } from "@/lib/supabase/server";

export default async function ChildProfilePage(props: PageProps<"/kids/[slug]">) {
  const [{ slug }, profile, supabase] = await Promise.all([
    props.params,
    requireProfile(),
    createClient(),
  ]);

  const { data: row } = await supabase
    .from("children")
    .select(
      "id, slug, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, status, rooms(name)",
    )
    .eq("slug", slug)
    .maybeSingle<ChildRow>();

  if (!row) notFound();

  const child = toChildView(row);

  const details = [
    { label: "Fecha de nacimiento", value: child.birthDateLabel },
    { label: "Sala", value: child.room },
    { label: "Ingreso", value: child.joinedLabel },
  ];

  return (
    <AppShell profile={profile} activeNav="kids">
      <div className="mx-auto w-full max-w-[820px] px-10 pt-[34px] pb-20">
        <Link
          href="/kids"
          className="mb-5 flex items-center gap-[7px] text-[14px] font-bold text-muted"
        >
          <ChevronLeftIcon />
          Volver a Niños
        </Link>

        <div className="flex flex-wrap items-start gap-[26px]">
          <div className="flex flex-1 flex-col gap-[18px] min-w-[300px]">
            <div className="flex items-center gap-[18px]">
              <div
                className="flex size-[84px] flex-none items-center justify-center rounded-full font-display text-[34px] font-semibold"
                style={{
                  backgroundColor: child.avatarBg,
                  color: child.avatarColor,
                }}
              >
                {child.fullName.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="font-display text-[28px] font-semibold text-ink">
                  {child.fullName}
                </h1>
                <p className="mt-[3px] text-[15px] text-muted">
                  {child.ageLabel} · {child.roomFullName}
                </p>
              </div>
              <a
                href="#"
                className="rounded-xl border-[1.5px] border-border bg-paper px-4 py-[9px] text-[14px] font-bold text-nav-inactive"
              >
                Editar
              </a>
            </div>

            {child.allergiesNotes ? (
              <AllergyNote notes={child.allergiesNotes} />
            ) : null}

            <div className="overflow-hidden rounded-[16px] border border-border bg-paper">
              {details.map((detail, index) => (
                <div
                  key={detail.label}
                  className={`flex justify-between px-[18px] py-[15px] ${
                    index < details.length - 1
                      ? "border-b border-divider-soft"
                      : ""
                  }`}
                >
                  <span className="text-[14.5px] text-muted">
                    {detail.label}
                  </span>
                  <span className="text-[14.5px] font-extrabold text-ink">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex w-[300px] flex-none flex-col gap-3.5">
            <a
              href="#"
              className="flex items-center justify-center gap-[9px] rounded-[14px] bg-ink p-[13px] text-[15px] font-extrabold text-white"
            >
              <SunIcon />
              Resumen del día
            </a>
            <LinkedParentsCard
              parents={child.parents}
              childFullName={child.fullName}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
