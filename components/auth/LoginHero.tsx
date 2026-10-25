import { SunIcon } from "@/components/ui/icons";

export function LoginHero() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-linear-155 from-auth-gradient-start from-0% via-auth-gradient-middle via-45% to-auth-gradient-end to-100% px-[60px] py-[56px] text-white lg:flex">
      <div
        aria-hidden
        className="absolute -top-[140px] -right-[120px] size-[420px] rounded-full bg-white/12"
      />
      <div
        aria-hidden
        className="absolute -bottom-[110px] -left-[80px] size-[300px] rounded-full bg-white/10"
      />

      <div className="relative flex items-center gap-[13px]">
        <div className="flex size-[46px] items-center justify-center rounded-[14px] bg-white/22">
          <SunIcon width={26} height={26} strokeWidth={2.2} />
        </div>
        <span className="font-display text-[21px] font-semibold tracking-[0.5px]">
          OpenDayCare
        </span>
      </div>

      <div className="relative">
        <h1 className="mb-[18px] font-display text-[42px] font-semibold leading-[1.12]">
          El día de cada niño,
          <br />
          compartido con su familia.
        </h1>
        <p className="max-w-[430px] text-[17px] leading-[1.6] text-white/92">
          Publicá momentos, gestioná las salas y mantené a las familias cerca,
          desde un solo lugar.
        </p>
      </div>

      <div className="relative text-[14px] text-white/90">
        🌿 Guardería Sala Soles
      </div>
    </div>
  );
}
