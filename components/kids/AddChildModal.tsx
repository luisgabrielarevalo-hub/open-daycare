"use client";

import { useRef, useState, type MouseEvent } from "react";
import { AddChildForm } from "@/components/kids/AddChildForm";
import { PlusIcon } from "@/components/ui/icons";
import type { RoomOption } from "@/lib/kids/children";

export function AddChildModal({ rooms }: { rooms: RoomOption[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);

  function openModal() {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>("#child-full-name")?.focus();
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
        className="flex items-center gap-2 rounded-[14px] bg-linear-to-b from-coral-light to-coral px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,0.7)]"
      >
        <PlusIcon />
        Agregar niño
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="add-child-title"
        onClick={handleBackdropClick}
        onClose={() => setFormKey((key) => key + 1)}
        className="m-auto max-h-[calc(100dvh-80px)] w-[calc(100%-32px)] max-w-[520px] overflow-y-auto rounded-[24px] border border-border bg-modal-bg p-0 text-ink shadow-[0_20px_50px_-24px_rgba(63,54,46,0.35)] backdrop:bg-scrim"
      >
        <AddChildForm
          key={formKey}
          rooms={rooms}
          onCancel={closeModal}
          onSaved={closeModal}
        />
      </dialog>
    </>
  );
}
