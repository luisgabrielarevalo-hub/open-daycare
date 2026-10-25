"use client";

import { PostCard } from "@/components/feed/PostCard";
import { useFeed } from "@/components/feed/FeedProvider";

export function FeedPosts() {
  const { posts } = useFeed();

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
