"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type SyntheticEvent,
} from "react";
import { createPost, deletePostPhotos } from "@/app/feed/actions";
import { CreatePostForm } from "@/components/feed/CreatePostForm";
import { useFeed } from "@/components/feed/FeedProvider";
import type { PostDraft } from "@/lib/feed/posts";
import { uploadPostPhotos } from "@/lib/feed/upload";
import { createClient } from "@/lib/supabase/client";

const UPLOAD_ERROR = "No pudimos subir las fotos. Intentá de nuevo.";
const GENERIC_ERROR = "No pudimos publicar. Intentá de nuevo.";

export function CreatePostModal() {
  const { composerData, isComposerOpen, closeComposer } = useFeed();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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
    if (event.target === event.currentTarget && !isSubmitting) {
      closeComposer();
    }
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    if (isSubmitting) {
      event.preventDefault();
    }
  }

  function handleClose() {
    setFormKey((key) => key + 1);
    setIsSubmitting(false);
    setSubmitError("");
    closeComposer();
  }

  async function handlePublish(draft: PostDraft) {
    if (!composerData || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    const draftId = crypto.randomUUID();
    const supabase = createClient();

    try {
      const upload = await uploadPostPhotos(
        supabase,
        composerData.daycareId,
        draftId,
        draft.photos,
      );

      if (upload.error) {
        if (upload.paths.length > 0) {
          await deletePostPhotos(upload.paths);
        }
        setSubmitError(UPLOAD_ERROR);
        setIsSubmitting(false);
        return;
      }

      const result = await createPost({
        kind: draft.kind,
        recipientIds: draft.recipientIds,
        body: draft.body,
        photoPaths: upload.paths,
      });

      if (!result.ok) {
        if (upload.paths.length > 0) {
          await deletePostPhotos(upload.paths);
        }
        setSubmitError(result.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setSubmitError("");
      closeComposer();
      router.refresh();
    } catch {
      setSubmitError(GENERIC_ERROR);
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-post-title"
      onClick={handleBackdropClick}
      onCancel={handleCancel}
      onClose={handleClose}
      className="m-auto max-h-[calc(100dvh-48px)] w-[calc(100%-32px)] max-w-[580px] overflow-y-auto rounded-[24px] border border-border bg-modal-bg p-0 text-ink shadow-[0_20px_50px_-24px_rgba(63,54,46,0.35)] backdrop:bg-scrim"
    >
      <CreatePostForm
        key={formKey}
        recipients={composerData?.recipients ?? []}
        allChildrenPhotoConsent={
          composerData?.allChildrenPhotoConsent ?? false
        }
        isSubmitting={isSubmitting}
        submitError={submitError}
        onCancel={closeComposer}
        onPublish={handlePublish}
      />
    </dialog>
  );
}
