import Image from "next/image";
import type { Post, PostKind } from "@/lib/data";
import {
  CommentIcon,
  HeartIcon,
  ImageIcon,
  MegaphoneIcon,
} from "@/components/ui/icons";

const kindStyles: Record<PostKind, { label: string; chip: string }> = {
  meal: {
    label: "COMIDA",
    chip: "bg-meal-bg text-meal-fg",
  },
  nap: {
    label: "SIESTA",
    chip: "bg-nap-bg text-nap-fg",
  },
  activity: {
    label: "ACTIVIDAD",
    chip: "bg-activity-bg text-activity-fg",
  },
  achievement: {
    label: "LOGRO",
    chip: "bg-achievement-bg text-achievement-fg",
  },
  mood: {
    label: "ÁNIMO",
    chip: "bg-mood-bg text-mood-fg",
  },
  photo: {
    label: "FOTO",
    chip: "bg-kind-photo-bg text-kind-photo-fg",
  },
  announcement: {
    label: "ANUNCIO",
    chip: "bg-announcement-bg text-announcement-fg",
  },
};

type PostCardProps = {
  post: Post;
};

export function PostCard({ post }: PostCardProps) {
  const style = kindStyles[post.kind];
  const photos = post.photos ?? [];

  return (
    <article className="rounded-[20px] border border-border bg-paper px-[22px] py-5 shadow-[0_4px_16px_-12px_rgba(120,90,60,0.5)]">
      <header className="mb-3.5 flex items-center gap-3">
        <div
          className="flex size-11 flex-none items-center justify-center rounded-full font-display text-[17px] font-semibold"
          style={{ backgroundColor: post.avatarBg, color: post.avatarColor }}
        >
          {post.audienceKind === "room" ? (
            <MegaphoneIcon />
          ) : (
            post.authorInitial
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[16.5px] font-semibold text-ink">
            {post.authorName}
          </div>
          <div className="text-[12.5px] text-muted-soft">{post.time}</div>
        </div>
        <div
          className={`flex flex-none items-center gap-[7px] rounded-full px-3 py-1.5 ${style.chip}`}
        >
          <span className="size-2 rounded-full bg-current" />
          <span className="text-[12px] font-extrabold tracking-[0.5px]">
            {style.label}
          </span>
        </div>
      </header>

      <div className="mb-2.5 text-[12.5px] text-muted-soft">
        Para: {post.audience}
      </div>

      <p className="text-[15.5px] leading-[1.55] text-body">{post.body}</p>

      {photos.length > 0 ? (
        <div
          className={`mt-3.5 ${photos.length > 1 ? "grid grid-cols-2 gap-2.5" : ""}`}
        >
          {photos.map((photo, index) => (
            <div
              key={photo}
              className={`relative overflow-hidden rounded-2xl bg-photo-bg ${
                photos.length > 1 ? "aspect-square" : "aspect-[16/10]"
              }`}
            >
              <Image
                src={photo}
                alt={`Foto ${index + 1} de la publicación`}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : post.photoLabel ? (
        <a
          href="#"
          className="mt-3.5 flex h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-photo-dashed bg-photo-bg text-photo-fg"
        >
          <ImageIcon />
          <span className="text-[13.5px]">{post.photoLabel}</span>
        </a>
      ) : null}

      <footer className="mt-4 flex items-center gap-[18px] border-t border-divider-soft pt-3.5">
        <span className="flex items-center gap-[7px] text-sm font-bold text-coral-deep-soft">
          <HeartIcon />
          {post.reactions}
        </span>
        <a
          href="#"
          className="flex items-center gap-[7px] text-sm font-bold text-muted"
        >
          <CommentIcon />
          {post.comments}
        </a>
        <span className="flex-1" />
        <a href="#" className="text-sm font-extrabold text-coral-deep">
          Editar
        </a>
      </footer>
    </article>
  );
}
