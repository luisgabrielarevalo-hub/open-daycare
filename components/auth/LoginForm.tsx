"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "@/app/auth/login/actions";
import { AuthField } from "@/components/auth/AuthField";
import { SunIcon } from "@/components/ui/icons";

const initialState: LoginState = {
  error: null,
  email: "",
  attempt: 0,
};

export function LoginForm({
  next,
  activated = false,
}: {
  next: string;
  activated?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );
  const [email, setEmail] = useState(initialState.email);
  const [password, setPassword] = useState("");
  const [attempt, setAttempt] = useState(initialState.attempt);

  if (state.attempt !== attempt) {
    setAttempt(state.attempt);
    setEmail(state.email);
    setPassword("");
  }

  return (
    <div className="flex items-center justify-center px-10 py-10">
      <div className="w-full max-w-[392px]">
        <div className="mb-8 flex items-center gap-[11px] lg:hidden">
          <div className="flex size-[38px] flex-none items-center justify-center rounded-xl bg-linear-155 from-avatar-peach-light to-avatar-peach">
            <SunIcon className="text-white" />
          </div>
          <span className="font-display text-[17px] leading-none font-semibold text-ink">
            OpenDayCare
          </span>
        </div>

        <h1 className="mb-1.5 font-display text-[30px] font-semibold text-ink">
          Iniciar sesión
        </h1>
        <p className="mb-7 text-[15px] text-muted">
          Ingresá para ver el día de hoy.
        </p>

        {activated ? (
          <p
            role="status"
            className="mb-[18px] rounded-[12px] bg-status-active-bg px-4 py-3 text-[13.5px] font-bold text-status-active-fg"
          >
            Cuenta activada. Iniciá sesión.
          </p>
        ) : null}

        <form action={formAction}>
          <input type="hidden" name="next" value={next} />

          <div className="mb-[18px]">
            <AuthField
              id="login-email"
              label="EMAIL"
              type="email"
              name="email"
              placeholder="tu@email.com"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="mb-2.5">
            <AuthField
              id="login-password"
              label="CONTRASEÑA"
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {state.error ? (
            <p
              role="alert"
              className="mb-[18px] text-[13px] font-bold text-coral-deep"
            >
              {state.error}
            </p>
          ) : null}

          <div className="mb-5 text-right">
            <a href="#" className="text-[13.5px] font-bold text-coral-deep">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="block w-full rounded-[15px] bg-linear-to-b from-coral-light to-coral py-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,0.7)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-[14.5px] text-muted">
          ¿Te invitó la guardería?{" "}
          <Link href="/auth/activate" className="font-extrabold text-coral-deep">
            Activá tu cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
