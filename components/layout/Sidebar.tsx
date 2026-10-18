import { staffProfile } from "@/lib/data";
import {
  BellIcon,
  ChildrenIcon,
  HomeIcon,
  LogoutIcon,
  PlusIcon,
  SunIcon,
  UserIcon,
} from "@/components/ui/icons";

const navItems = [
  { label: "Feed", icon: HomeIcon, active: true },
  { label: "Niños", icon: ChildrenIcon, active: false },
  { label: "Avisos", icon: BellIcon, active: false },
  { label: "Mi cuenta", icon: UserIcon, active: false },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-[248px] flex-none flex-col border-r border-border bg-paper px-4 py-6">
      <a
        href="#"
        className="flex items-center gap-[11px] px-2 pt-1 pb-[22px]"
      >
        <div className="flex size-[38px] flex-none items-center justify-center rounded-xl bg-linear-155 from-avatar-peach-light to-avatar-peach">
          <SunIcon className="text-white" />
        </div>
        <div>
          <div className="font-display text-[17px] leading-none font-semibold text-ink">
            OpenDayCare
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-soft">
            {staffProfile.room}
          </div>
        </div>
      </a>

      <a
        href="#"
        className="mb-[18px] flex w-full items-center justify-center gap-2 rounded-[14px] bg-linear-to-b from-coral-light to-coral py-3 text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,0.75)]"
      >
        <PlusIcon />
        Nueva publicación
      </a>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ label, icon: NavIcon, active }) => (
          <a
            key={label}
            href="#"
            className={`flex items-center gap-3 rounded-xl px-3 py-[11px] text-[14.5px] ${
              active
                ? "bg-coral-soft font-extrabold text-coral-deep-light"
                : "font-semibold text-nav-inactive"
            }`}
          >
            <NavIcon />
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-2.5 border-t border-border pt-3.5">
        <div className="flex items-center gap-[11px] px-2 py-1.5">
          <div className="flex size-[38px] flex-none items-center justify-center rounded-full bg-avatar-peach font-display text-base font-semibold text-white">
            {staffProfile.initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold text-ink">
              {staffProfile.name}
            </div>
            <div className="text-xs text-muted-soft">{staffProfile.role}</div>
          </div>
          <a
            href="#"
            title="Cerrar sesión"
            className="flex size-8 flex-none items-center justify-center rounded-[10px] bg-cream text-muted"
          >
            <LogoutIcon />
          </a>
        </div>
      </div>
    </aside>
  );
}
