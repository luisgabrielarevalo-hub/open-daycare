import Link from "next/link";
import { AuthField } from "@/components/auth/AuthField";
import { SunIcon } from "@/components/ui/icons";

export function LoginForm() {
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

        <div className="mb-[18px]">
          <AuthField
            id="login-email"
            label="EMAIL"
            type="email"
            name="email"
            placeholder="tu@email.com"
            autoComplete="email"
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
          />
        </div>

        <div className="mb-5 text-right">
          <a
            href="#"
            className="text-[13.5px] font-bold text-coral-deep"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        <a
          href="#"
          className="block w-full rounded-[15px] bg-linear-to-b from-coral-light to-coral py-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,0.7)]"
        >
          Iniciar sesión
        </a>

        <p className="mt-6 text-center text-[14.5px] text-muted">
          ¿Te invitó la guardería?{" "}
          <Link
            href="/auth/activate"
            className="font-extrabold text-coral-deep"
          >
            Activá tu cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
