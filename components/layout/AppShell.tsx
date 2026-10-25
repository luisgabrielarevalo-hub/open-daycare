"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFeed } from "@/components/feed/FeedProvider";
import { Sidebar, type NavKey } from "@/components/layout/Sidebar";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import type { StaffProfile } from "@/lib/data";

type AppShellProps = {
  profile: StaffProfile;
  activeNav: NavKey;
  children: ReactNode;
};

export function AppShell({ profile, activeNav, children }: AppShellProps) {
  const { openComposer } = useFeed();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  function handleCompose() {
    setIsDrawerOpen(false);
    openComposer();
  }

  useEffect(() => {
    if (!isDrawerOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsDrawerOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-paper px-4 py-3 lg:hidden">
        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={isDrawerOpen}
          onClick={() => setIsDrawerOpen(true)}
          className="flex size-10 flex-none items-center justify-center rounded-xl bg-cream text-ink"
        >
          <MenuIcon />
        </button>
        <span className="font-display text-lg font-semibold text-ink">
          OpenDayCare
        </span>
      </header>

      <div className="hidden lg:sticky lg:top-0 lg:block lg:h-screen">
        <Sidebar
          profile={profile}
          activeNav={activeNav}
          onCompose={handleCompose}
        />
      </div>

      {isDrawerOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-ink/40"
          />
          <div className="fixed inset-y-0 left-0 z-50 h-screen w-[248px]">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setIsDrawerOpen(false)}
              className="absolute top-4 right-3 z-10 flex size-8 items-center justify-center rounded-lg bg-cream text-muted"
            >
              <CloseIcon />
            </button>
            <Sidebar
              profile={profile}
              activeNav={activeNav}
              onCompose={handleCompose}
            />
          </div>
        </div>
      ) : null}

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
