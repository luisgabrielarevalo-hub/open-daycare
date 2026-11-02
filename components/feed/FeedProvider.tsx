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
import type { ComposerData } from "@/lib/feed/posts";

type FeedContextValue = {
  composerData: ComposerData | null;
  canCompose: boolean;
  isComposerOpen: boolean;
  openComposer: () => void;
  closeComposer: () => void;
};

const FeedContext = createContext<FeedContextValue | null>(null);

type FeedProviderProps = {
  composerData: ComposerData | null;
  children: ReactNode;
};

export function FeedProvider({ composerData, children }: FeedProviderProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const canCompose = composerData !== null;

  const openComposer = useCallback(() => {
    if (!composerData) {
      return;
    }

    setIsComposerOpen(true);
  }, [composerData]);

  const closeComposer = useCallback(() => setIsComposerOpen(false), []);

  const value = useMemo(
    () => ({
      composerData,
      canCompose,
      isComposerOpen,
      openComposer,
      closeComposer,
    }),
    [composerData, canCompose, isComposerOpen, openComposer, closeComposer],
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
