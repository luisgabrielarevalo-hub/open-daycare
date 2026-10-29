import Link from "next/link";
import { AuthField } from "@/components/auth/AuthField";
import { CheckIcon, SunIcon } from "@/components/ui/icons";

export function ActivateAccountForm({
  initialCode = "",
}: {
  initialCode?: string;
}) {
  return (
    <div className="w-full max-w-[440px]">
      <div className="mb-[22px] flex size-[58px] items-center justify-center rounded-[18px] bg-linear-155 from-avatar-peach-light to-avatar-peach shadow-[0_12px_26px_-10px_rgba(238,129,100,0.65)]">
        <SunIcon width={30} height={30} strokeWidth={2.2} className="text-white" />
      </div>

      <h1 className="mb-2 font-display text-[32px] leading-[1.15] font-semibold text-ink">
        Bienvenida a OpenDayCare
      </h1>
      <p className="mb-[26px] text-[15.5px] leading-[1.55] text-muted">
        Te invitaron a seguir el día de tu hijo. Creá tu contraseña para activar
        la cuenta.
      </p>

      <div className="mb-[22px] flex items-center gap-3.5 rounded-2xl border-[1.5px] border-auth-border bg-white px-4 py-3.5">
        <div className="flex size-11 flex-none items-center justify-center rounded-full bg-avatar-sky font-display text-[19px] font-semibold text-avatar-sky-fg">
          M
        </div>
        <div>
          <div className="text-[13px] text-muted">Te invitaron a seguir a</div>
          <div className="font-display text-[17px] font-semibold text-ink">
            Mateo · Sala Soles
          </div>
        </div>
      </div>

      <div className="mb-[18px]">
        <AuthField
          id="activate-code"
          label="CÓDIGO DE INVITACIÓN"
          type="text"
          name="code"
          placeholder="Código de 5 caracteres"
          autoComplete="one-time-code"
          defaultValue={initialCode}
          inputClassName="font-display text-[18px] font-bold tracking-[3px] placeholder:font-sans placeholder:text-[15px] placeholder:font-semibold placeholder:tracking-normal"
        />
      </div>

      <div className="mb-[18px]">
        <AuthField
          id="activate-email"
          label="EMAIL"
          type="email"
          name="email"
          placeholder="tu@email.com"
          autoComplete="email"
        />
      </div>

      <div className="mb-[18px]">
        <AuthField
          id="activate-password"
          label="CREAR CONTRASEÑA"
          type="password"
          name="password"
          placeholder="Creá una contraseña"
          autoComplete="new-password"
        />
      </div>

      <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-[14px] bg-consent-bg px-4 py-3.5">
        <input type="checkbox" name="consent" className="peer sr-only" />
        <span className="mt-px flex size-6 flex-none items-center justify-center rounded-lg border-[1.5px] border-auth-border bg-white text-transparent peer-checked:border-consent-check peer-checked:bg-consent-check peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-auth-focus peer-focus-visible:ring-offset-2">
          <CheckIcon />
        </span>
        <span className="text-[14px] leading-[1.45] text-consent-text">
          Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro de
          la app.
        </span>
      </label>

      <a
        href="#"
        className="block w-full rounded-[15px] bg-linear-to-b from-coral-light to-coral py-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,0.7)]"
      >
        Activar mi cuenta
      </a>

      <p className="mt-[22px] text-center text-[14.5px] text-muted">
        ¿Ya tenés cuenta?{" "}
        <Link href="/auth/login" className="font-extrabold text-coral-deep">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
