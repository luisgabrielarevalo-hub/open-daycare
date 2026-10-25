"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CreatePostModal } from "@/components/feed/CreatePostModal";
import type { Post } from "@/lib/data";

type FeedContextValue = {
  posts: Post[];
  addPost: (post: Post) => void;
  isComposerOpen: boolean;
  openComposer: () => void;
  closeComposer: () => void;
};

const FeedContext = createContext<FeedContextValue | null>(null);

type FeedProviderProps = {
  initialPosts: Post[];
  children: ReactNode;
};

export function FeedProvider({ initialPosts, children }: FeedProviderProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const addPost = useCallback((post: Post) => {
    setPosts((current) => [post, ...current]);
  }, []);

  const openComposer = useCallback(() => setIsComposerOpen(true), []);
  const closeComposer = useCallback(() => setIsComposerOpen(false), []);

  const value = useMemo(
    () => ({ posts, addPost, isComposerOpen, openComposer, closeComposer }),
    [posts, addPost, isComposerOpen, openComposer, closeComposer],
  );

  return (
    <FeedContext.Provider value={value}>
      {children}
      <CreatePostModal />
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const context = useContext(FeedContext);

  if (!context) {
    throw new Error("useFeed must be used within a FeedProvider");
  }

  return context;
}
