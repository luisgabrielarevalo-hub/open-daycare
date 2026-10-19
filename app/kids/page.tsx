import { AppShell } from "@/components/layout/AppShell";
import { KidsDirectory } from "@/components/kids/KidsDirectory";
import { PlusIcon } from "@/components/ui/icons";
import { staffProfile } from "@/lib/data";

export default function KidsPage() {
  return (
    <AppShell profile={staffProfile} activeNav="kids">
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
          <a
            href="#"
            className="flex items-center gap-2 rounded-[14px] bg-linear-to-b from-coral-light to-coral px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,0.7)]"
          >
            <PlusIcon />
            Agregar niño
          </a>
        </div>

        <KidsDirectory />
      </div>
    </AppShell>
  );
}
