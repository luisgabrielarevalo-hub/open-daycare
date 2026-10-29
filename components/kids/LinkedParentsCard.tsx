import { LinkParentModal } from "@/components/kids/LinkParentModal";
import type { LinkedParent } from "@/lib/data";

type LinkedParentsCardProps = {
  parents: LinkedParent[];
  childId: string;
  childFullName: string;
};

function statusLabel(parent: LinkedParent) {
  return parent.status === "active"
    ? parent.statusLabel.toUpperCase()
    : "PENDIENTE";
}

export function LinkedParentsCard({
  parents,
  childId,
  childFullName,
}: LinkedParentsCardProps) {
  return (
    <div className="rounded-[16px] border border-border bg-paper px-[18px] py-4">
      <div className="mb-3.5 text-[12.5px] font-extrabold tracking-[0.8px] text-section-label">
        PADRES VINCULADOS
      </div>
      <div className="flex flex-col gap-3.5">
        {parents.map((parent) => (
          <div key={parent.name} className="flex items-center gap-3">
            <div
              className="flex size-10 flex-none items-center justify-center rounded-full font-display text-base font-semibold"
              style={{
                backgroundColor: parent.avatarBg,
                color: parent.avatarColor,
              }}
            >
              {parent.initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-extrabold text-ink">
                {parent.name}
              </div>
              <div className="text-[12.5px] text-muted-soft">
                {parent.relationship} · {parent.statusLabel}
              </div>
            </div>
            <span
              className={`flex-none rounded-full px-[9px] py-1 text-[10.5px] font-extrabold ${
                parent.status === "active"
                  ? "bg-status-active-bg text-status-active-fg"
                  : "bg-status-pending-bg text-status-pending-fg"
              }`}
            >
              {statusLabel(parent)}
            </span>
          </div>
        ))}
        <LinkParentModal childId={childId} childFullName={childFullName} />
      </div>
    </div>
  );
}
