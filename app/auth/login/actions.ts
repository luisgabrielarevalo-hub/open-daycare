"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const INVALID_CREDENTIALS = "Email o contraseña incorrectos.";
const GENERIC_ERROR = "No pudimos iniciar sesión. Intentá de nuevo.";
const EMPTY_FIELDS = "Ingresá tu email y contraseña.";
const FALLBACK_PATH = "/";
const INTERNAL_ORIGIN = "http://internal.local";

export type LoginState = {
  error: string | null;
  email: string;
  attempt: number;
};

function resolveNextPath(value: string): string {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return FALLBACK_PATH;
  }

  let url: URL;
  try {
    url = new URL(value, INTERNAL_ORIGIN);
  } catch {
    return FALLBACK_PATH;
  }

  if (url.origin !== INTERNAL_ORIGIN) {
    return FALLBACK_PATH;
  }

  if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) {
    return FALLBACK_PATH;
  }

  return value;
}

export async function loginAction(
  previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = resolveNextPath(String(formData.get("next") ?? ""));
  const attempt = previousState.attempt + 1;

  if (!email || !password) {
    return { error: EMPTY_FIELDS, email, attempt };
  }

  const supabase = await createClient();
  let error: string | null = null;

  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      error =
        signInError.code === "invalid_credentials"
          ? INVALID_CREDENTIALS
          : GENERIC_ERROR;
    }
  } catch {
    error = GENERIC_ERROR;
  }

  if (error) {
    return { error, email, attempt };
  }

  redirect(next);
}
