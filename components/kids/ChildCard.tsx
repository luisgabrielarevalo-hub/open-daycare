import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { Child } from "@/lib/data";

export function parentsLabel(count: number) {
  if (count === 0) return "sin padres vinculados";
  if (count === 1) return "1 padre vinculado";
  return `${count} padres vinculados`;
}

type ChildCardProps = {
  child: Child;
};

export function ChildCard({ child }: ChildCardProps) {
  const initial = child.fullName.charAt(0);
  const tags = child.tags?.length ? child.tags : child.tag ? [child.tag] : [];

  return (
    <Link
      href={`/kids/${child.id}`}
      className="flex min-w-0 items-center gap-3.5 rounded-[18px] border border-border bg-paper p-4 shadow-[0_4px_14px_-12px_rgba(120,90,60,0.5)]"
    >
      <div
        className="flex size-12 flex-none items-center justify-center rounded-full font-display text-[19px] font-semibold"
        style={{ backgroundColor: child.avatarBg, color: child.avatarColor }}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-base font-semibold text-ink">
          {child.fullName}
        </div>
        <div className="text-[13px] text-muted-soft">
          {child.ageLabel} · {parentsLabel(child.parents.length)}
        </div>
      </div>
      {tags.length > 0 ? (
        <div className="flex flex-none flex-wrap justify-end gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.label}
              className={`rounded-full px-[9px] py-[5px] text-[11px] font-extrabold ${
                tag.tone === "allergy"
                  ? "bg-tag-allergy-bg text-tag-allergy-fg"
                  : "bg-tag-link-bg text-tag-link-fg"
              }`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      ) : (
        <ChevronRightIcon className="flex-none text-[#CBB89F]" />
      )}
    </Link>
  );
}
