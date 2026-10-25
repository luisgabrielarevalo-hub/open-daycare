"use client";

import { useRef, useState, type MouseEvent } from "react";
import { LinkParentForm } from "@/components/kids/LinkParentForm";
import { PlusIcon } from "@/components/ui/icons";

type LinkParentModalProps = {
  childFullName: string;
};

export function LinkParentModal({ childFullName }: LinkParentModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);

  function openModal() {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>("#parent-name")?.focus();
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="flex w-full items-center gap-3 pt-2 text-left"
      >
        <span className="flex size-10 flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#D8CBBA] text-[#B0A290]">
          <PlusIcon />
        </span>
        <span className="text-[14.5px] font-extrabold text-coral-deep">
          Vincular otro padre
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="link-parent-title"
        onClick={handleBackdropClick}
        onClose={() => setFormKey((key) => key + 1)}
        className="m-auto max-h-[calc(100dvh-80px)] w-[calc(100%-32px)] max-w-[480px] overflow-y-auto rounded-[24px] border border-border bg-modal-bg p-0 text-ink shadow-[0_20px_50px_-24px_rgba(63,54,46,0.35)] backdrop:bg-scrim"
      >
        <LinkParentForm
          key={formKey}
          childFullName={childFullName}
          onClose={closeModal}
          onSent={closeModal}
        />
      </dialog>
    </>
  );
}
