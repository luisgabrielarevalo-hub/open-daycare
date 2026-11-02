import { PostCard } from "@/components/feed/PostCard";
import type { FeedPost } from "@/lib/feed/posts";

type FeedPostsProps = {
  posts: FeedPost[];
};

export function FeedPosts({ posts }: FeedPostsProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-border bg-paper px-[22px] py-12 text-center">
        <p className="font-display text-[18px] font-semibold text-ink">
          Todavía no hay publicaciones hoy
        </p>
        <p className="mt-1.5 text-[14.5px] text-muted">
          Cuando se comparta un momento, va a aparecer acá.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
