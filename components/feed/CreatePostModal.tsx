"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  CreatePostForm,
  type PostDraft,
} from "@/components/feed/CreatePostForm";
import { useFeed } from "@/components/feed/FeedProvider";
import { children, type Post } from "@/lib/data";

function getCurrentTimeLabel() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes} · publicado por vos`;
}

export function CreatePostModal() {
  const { isComposerOpen, closeComposer, addPost } = useFeed();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isComposerOpen) {
      if (!dialog.open) {
        dialog.showModal();
        dialog
          .querySelector<HTMLTextAreaElement>("#post-description")
          ?.focus();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isComposerOpen]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeComposer();
    }
  }

  function handleClose() {
    setFormKey((key) => key + 1);
    closeComposer();
  }

  function handlePublish(draft: PostDraft) {
    const time = getCurrentTimeLabel();
    let post: Post;

    if (draft.recipientId === "room") {
      post = {
        id: crypto.randomUUID(),
        kind: draft.kind,
        audienceKind: "room",
        authorName: "Anuncio general",
        authorInitial: "",
        avatarBg: "#CCD8F4",
        avatarColor: "#4E72C8",
        time,
        audience: "toda la sala",
        body: draft.body,
        reactions: 0,
        comments: 0,
        photos: draft.photos,
      };
    } else {
      const child = children.find((item) => item.id === draft.recipientId);
      if (!child) {
        return;
      }

      const firstName = child.fullName.split(" ")[0];

      post = {
        id: crypto.randomUUID(),
        kind: draft.kind,
        audienceKind: "child",
        authorName: firstName,
        authorInitial: firstName.charAt(0),
        avatarBg: child.avatarBg,
        avatarColor: child.avatarColor,
        time,
        audience: `familia de ${firstName}`,
        body: draft.body,
        reactions: 0,
        comments: 0,
        photos: draft.photos,
      };
    }

    addPost(post);
    closeComposer();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-post-title"
      onClick={handleBackdropClick}
      onClose={handleClose}
      className="m-auto max-h-[calc(100dvh-48px)] w-[calc(100%-32px)] max-w-[580px] overflow-y-auto rounded-[24px] border border-border bg-modal-bg p-0 text-ink shadow-[0_20px_50px_-24px_rgba(63,54,46,0.35)] backdrop:bg-scrim"
    >
      <CreatePostForm
        key={formKey}
        onCancel={closeComposer}
        onPublish={handlePublish}
      />
    </dialog>
  );
}
