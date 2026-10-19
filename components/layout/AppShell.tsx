"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import type { StaffProfile } from "@/lib/data";

type AppShellProps = {
  profile: StaffProfile;
  children: ReactNode;
};

export function AppShell({ profile, children }: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
          onClick={() => setIsDrawerOpen(true)}
          className="flex size-10 flex-none items-center justify-center rounded-xl bg-cream text-ink"
        >
          <MenuIcon />
        </button>
        <span className="font-display text-lg font-semibold text-ink">
          OpenDayCare
        </span>
      </header>

      {isDrawerOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 h-screen w-[248px] transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setIsDrawerOpen(false)}
          className="absolute top-4 right-3 z-10 flex size-8 items-center justify-center rounded-lg bg-cream text-muted lg:hidden"
        >
          <CloseIcon />
        </button>
        <Sidebar profile={profile} />
      </div>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
