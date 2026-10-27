"use client";

import { useState } from "react";
import { LogoutIcon } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      window.location.assign(new URL("/auth/login", window.location.origin));
    } catch (error) {
      console.error("No se pudo cerrar sesión.", error);
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      title="Cerrar sesión"
      aria-label="Cerrar sesión"
      disabled={pending}
      onClick={handleLogout}
      className="flex size-8 flex-none cursor-pointer items-center justify-center rounded-[10px] bg-cream text-muted disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogoutIcon />
    </button>
  );
}
