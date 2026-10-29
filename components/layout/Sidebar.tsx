import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { StaffProfile } from "@/lib/data";
import {
  BellIcon,
  ChildrenIcon,
  HomeIcon,
  PlusIcon,
  SunIcon,
  UserIcon,
} from "@/components/ui/icons";

export type NavKey = "feed" | "kids" | "announcements" | "account";

const navItems = [
  { key: "feed", label: "Feed", icon: HomeIcon, href: "/" },
  { key: "kids", label: "Niños", icon: ChildrenIcon, href: "/kids" },
  { key: "announcements", label: "Avisos", icon: BellIcon, href: "#" },
  { key: "account", label: "Mi cuenta", icon: UserIcon, href: "#" },
] satisfies { key: NavKey; label: string; icon: typeof HomeIcon; href: string }[];

type SidebarLinkProps = {
  href: string;
} & AnchorHTMLAttributes<HTMLAnchorElement>;

function SidebarLink({ href, children, ...props }: SidebarLinkProps) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}

type SidebarProps = {
  profile: StaffProfile;
  activeNav: NavKey;
  onCompose: () => void;
};

export function Sidebar({ profile, activeNav, onCompose }: SidebarProps) {
  const isParent = profile.roleKey === "parent";
  const visibleNavItems = isParent
    ? navItems.filter((item) => item.key !== "kids")
    : navItems;

  return (
    <aside className="flex h-full w-[248px] flex-none flex-col border-r border-border bg-paper px-4 py-6">
      <SidebarLink
        href="/"
        className="flex items-center gap-[11px] px-2 pt-1 pb-[22px]"
      >
        <div className="flex size-[38px] flex-none items-center justify-center rounded-xl bg-linear-155 from-avatar-peach-light to-avatar-peach">
          <SunIcon className="text-white" />
        </div>
        <div>
          <div className="font-display text-[17px] leading-none font-semibold text-ink">
            OpenDayCare
          </div>
          {profile.room ? (
            <div className="mt-0.5 text-[11.5px] text-muted-soft">
              {profile.room}
            </div>
          ) : null}
        </div>
      </SidebarLink>

      {isParent ? null : (
        <button
          type="button"
          onClick={onCompose}
          className="mb-[18px] flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-linear-to-b from-coral-light to-coral py-3 text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,0.75)]"
        >
          <PlusIcon />
          Nueva publicación
        </button>
      )}

      <nav className="flex flex-1 flex-col gap-1">
        {visibleNavItems.map(({ key, label, icon: NavIcon, href }) => (
          <SidebarLink
            key={key}
            href={href}
            aria-current={key === activeNav ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-[11px] text-[14.5px] ${
              key === activeNav
                ? "bg-coral-soft font-extrabold text-coral-deep-light"
                : "font-semibold text-nav-inactive"
            }`}
          >
            <NavIcon />
            {label}
          </SidebarLink>
        ))}
      </nav>

      <div className="mt-2.5 border-t border-border pt-3.5">
        <div className="flex items-center gap-[11px] px-2 py-1.5">
          <div className="flex size-[38px] flex-none items-center justify-center rounded-full bg-avatar-peach font-display text-base font-semibold text-white">
            {profile.initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold text-ink">
              {profile.name}
            </div>
            <div className="text-xs text-muted-soft">{profile.role}</div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
