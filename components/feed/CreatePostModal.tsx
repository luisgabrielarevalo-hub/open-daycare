"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { CreatePostForm } from "@/components/feed/CreatePostForm";
import { useFeed } from "@/components/feed/FeedProvider";

export function CreatePostModal() {
  const { isComposerOpen, closeComposer } = useFeed();
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
        onPublish={closeComposer}
      />
    </dialog>
  );
}
