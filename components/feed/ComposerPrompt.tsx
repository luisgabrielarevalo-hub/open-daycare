import { CameraIcon } from "@/components/ui/icons";

type ComposerPromptProps = {
  initial: string;
};

export function ComposerPrompt({ initial }: ComposerPromptProps) {
  return (
    <a
      href="#"
      className="mb-6 flex items-center gap-3.5 rounded-[18px] border border-border bg-paper px-[18px] py-3.5 shadow-[0_4px_14px_-10px_rgba(120,90,60,0.4)]"
    >
      <div className="flex size-10 flex-none items-center justify-center rounded-full bg-avatar-peach font-display text-base font-semibold text-white">
        {initial}
      </div>
      <span className="flex-1 text-[15px] text-muted-soft">
        Compartí un momento…
      </span>
      <span className="flex size-[38px] items-center justify-center rounded-xl bg-coral-soft text-coral-deep-soft">
        <CameraIcon />
      </span>
    </a>
  );
}
