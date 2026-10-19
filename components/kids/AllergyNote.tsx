import { AlertTriangleIcon } from "@/components/ui/icons";

type AllergyNoteProps = {
  notes: string;
};

export function AllergyNote({ notes }: AllergyNoteProps) {
  return (
    <div className="flex gap-3.5 rounded-[16px] bg-alert-bg px-[18px] py-4">
      <div className="flex size-10 flex-none items-center justify-center rounded-[11px] bg-alert-icon-bg text-white">
        <AlertTriangleIcon />
      </div>
      <div>
        <div className="mb-0.5 text-[15px] font-extrabold text-alert-title">
          Alergias y notas
        </div>
        <div className="text-[14.5px] leading-[1.5] text-alert-text">
          {notes}
        </div>
      </div>
    </div>
  );
}
