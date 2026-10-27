import { AppShell } from "@/components/layout/AppShell";
import { ComposerPrompt } from "@/components/feed/ComposerPrompt";
import { FeedPosts } from "@/components/feed/FeedPosts";
import { requireProfile } from "@/lib/auth/profile";

export default async function Home() {
  const profile = await requireProfile();
  const firstName = profile.name.split(" ")[0];

  return (
    <AppShell profile={profile} activeNav="feed">
      <div className="mx-auto w-full max-w-[760px] px-10 pt-[34px] pb-20">
        <div className="mb-6">
          <div className="mb-1 text-[12.5px] font-extrabold tracking-[0.8px] text-coral-deep-light">
            {profile.room ? `GUARDERÍA · ${profile.room.toUpperCase()}` : "GUARDERÍA"}
          </div>
          <h1 className="font-display text-[30px] font-semibold text-ink">
            Buenas, {firstName}
          </h1>
          <p className="mt-[5px] text-[14.5px] text-muted">
            {profile.childCount} niños · {profile.dateLabel}
          </p>
        </div>

        <ComposerPrompt initial={profile.initial} />

        <div className="mb-3.5 flex items-center gap-3.5">
          <span className="text-[12.5px] font-extrabold tracking-[0.8px] text-section-label">
            PUBLICADO HOY
          </span>
          <span className="h-px flex-1 bg-divider" />
        </div>

        <FeedPosts />
      </div>
    </AppShell>
  );
}
