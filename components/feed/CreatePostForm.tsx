"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import type { PostKind } from "@/lib/data";
import {
  compressImage,
  IMAGE_PROCESS_ERROR_MESSAGE,
} from "@/lib/feed/image";
import type {
  CompressedPhoto,
  PostDraft,
  RecipientOption,
} from "@/lib/feed/posts";

const MAX_PHOTOS = 4;
const MAX_DESCRIPTION_LENGTH = 1000;

const POST_TYPES: Record<
  PostKind,
  { label: string; inactive: string; active: string }
> = {
  meal: {
    label: "Comida",
    inactive: "bg-meal-bg text-meal-fg",
    active: "bg-meal-fg text-white",
  },
  nap: {
    label: "Siesta",
    inactive: "bg-nap-bg text-nap-fg",
    active: "bg-nap-fg text-white",
  },
  activity: {
    label: "Actividad",
    inactive: "bg-activity-bg text-activity-fg",
    active: "bg-activity-fg text-white",
  },
  achievement: {
    label: "Logro",
    inactive: "bg-achievement-bg text-achievement-fg",
    active: "bg-achievement-fg text-white",
  },
  mood: {
    label: "Ánimo",
    inactive: "bg-mood-bg text-mood-fg",
    active: "bg-mood-fg text-white",
  },
  photo: {
    label: "Foto",
    inactive: "bg-kind-photo-bg text-kind-photo-fg",
    active: "bg-kind-photo-fg text-white",
  },
  announcement: {
    label: "Anuncio",
    inactive: "bg-announcement-bg text-announcement-fg",
    active: "bg-announcement-fg text-white",
  },
};

const POST_TYPE_ORDER: PostKind[] = [
  "meal",
  "nap",
  "activity",
  "achievement",
  "mood",
  "photo",
  "announcement",
];

type CreatePostFormProps = {
  recipients: RecipientOption[];
  allChildrenPhotoConsent: boolean;
  isSubmitting: boolean;
  submitError: string;
  onCancel: () => void;
  onPublish: (draft: PostDraft) => void | Promise<void>;
};

const labelClass =
  "mb-2.5 text-[12px] font-extrabold tracking-[0.7px] text-muted";
const groupClass = "mb-[22px]";

export function CreatePostForm({
  recipients,
  allChildrenPhotoConsent,
  isSubmitting,
  submitError,
  onCancel,
  onPublish,
}: CreatePostFormProps) {
  const [recipientIds, setRecipientIds] = useState<(string | "room")[]>([]);
  const [kind, setKind] = useState<PostKind>("activity");
  const [body, setBody] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [recipientError, setRecipientError] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photos, setPhotos] = useState<CompressedPhoto[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [hasTooManyPhotos, setHasTooManyPhotos] = useState(false);
  const photosRef = useRef<CompressedPhoto[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      photosRef.current.forEach((photo) =>
        URL.revokeObjectURL(photo.previewUrl),
      );
    };
  }, []);

  const isRoom = recipientIds.includes("room");
  const selectedChildren = recipients.filter((recipient) =>
    recipientIds.includes(recipient.id),
  );
  const blockedChild = isRoom
    ? null
    : (selectedChildren.find((child) => !child.photoConsent) ?? null);
  const photosBlocked = isRoom
    ? !allChildrenPhotoConsent
    : Boolean(blockedChild);
  const photoBlockedMessage = isRoom
    ? "No se pueden adjuntar fotos: hay niños del centro sin consentimiento de imagen."
    : blockedChild
      ? `${blockedChild.firstName} no tiene consentimiento para fotos.`
      : "";

  function canSelectWithoutBlockingPhotos(photoConsent: boolean) {
    return photos.length === 0 || photoConsent;
  }

  function toggleChild(child: RecipientOption) {
    if (isSubmitting) {
      return;
    }

    setSelectionError("");
    setRecipientError("");

    if (
      !recipientIds.includes(child.id) &&
      !canSelectWithoutBlockingPhotos(child.photoConsent)
    ) {
      setSelectionError("Quitá las fotos para elegir ese destinatario.");
      return;
    }

    setRecipientIds((current) => {
      const childrenOnly = current.filter((id) => id !== "room");

      if (childrenOnly.includes(child.id)) {
        return childrenOnly.filter((id) => id !== child.id);
      }

      return [...childrenOnly, child.id];
    });
  }

  function selectRoom() {
    if (isSubmitting) {
      return;
    }

    setSelectionError("");
    setRecipientError("");

    if (photos.length > 0 && !allChildrenPhotoConsent) {
      setSelectionError("Quitá las fotos para elegir ese destinatario.");
      return;
    }

    setRecipientIds(["room"]);
  }

  async function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (isSubmitting || photosBlocked) {
      return;
    }

    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith("image/"),
    );

    if (imageFiles.length === 0) {
      return;
    }

    const remaining = MAX_PHOTOS - photos.length;

    if (remaining <= 0) {
      setHasTooManyPhotos(true);
      return;
    }

    const acceptedFiles = imageFiles.slice(0, remaining);

    if (imageFiles.length > remaining) {
      setHasTooManyPhotos(true);
    }

    setPhotoError("");
    setIsProcessingPhotos(true);

    const compressed: CompressedPhoto[] = [];

    try {
      for (const file of acceptedFiles) {
        if (!isMountedRef.current) {
          break;
        }

        try {
          const blob = await compressImage(file);
          compressed.push({
            id: crypto.randomUUID(),
            previewUrl: URL.createObjectURL(blob),
            blob,
          });
        } catch (error) {
          setPhotoError(
            error instanceof Error
              ? error.message
              : IMAGE_PROCESS_ERROR_MESSAGE,
          );
        }
      }

      if (!isMountedRef.current) {
        compressed.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
        return;
      }

      if (compressed.length > 0) {
        setPhotos((current) => [...current, ...compressed]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsProcessingPhotos(false);
      }
    }
  }

  function removePhoto(id: string) {
    const photo = photos.find((item) => item.id === id);

    if (photo) {
      URL.revokeObjectURL(photo.previewUrl);
    }

    setPhotos((current) => current.filter((item) => item.id !== id));
    setHasTooManyPhotos(false);
    setPhotoError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isProcessingPhotos) {
      return;
    }

    setDescriptionError("");
    setRecipientError("");
    setSelectionError("");
    setPhotoError("");

    if (recipientIds.length === 0) {
      setRecipientError("Elegí al menos un destinatario");
      return;
    }

    if (!body.trim()) {
      setDescriptionError("Escribí una descripción");
      return;
    }

    if (photosBlocked) {
      setPhotoError(photoBlockedMessage);
      return;
    }

    void onPublish({
      recipientIds,
      kind,
      body: body.trim(),
      photos,
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="flex items-center justify-between border-b border-border px-[26px] py-5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-[15px] font-bold text-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>
        <span
          id="create-post-title"
          className="font-display text-[18px] font-semibold text-ink"
        >
          Nueva publicación
        </span>
        <button
          type="submit"
          disabled={isSubmitting || isProcessingPhotos}
          className="text-[15px] font-extrabold text-coral-deep-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Publicando…" : "Publicar"}
        </button>
      </div>

      <div className="px-[26px] py-6">
        {submitError ? (
          <p
            role="alert"
            className="mb-4 rounded-[12px] border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] font-semibold text-danger"
          >
            {submitError}
          </p>
        ) : null}

        <div
          role="group"
          aria-labelledby="post-recipient-label"
          className={groupClass}
        >
          <div id="post-recipient-label" className={labelClass}>
            PARA
          </div>
          <div className="flex flex-wrap gap-[9px]">
            {recipients.map((child) => {
              const isActive = recipientIds.includes(child.id);

              return (
                <button
                  key={child.id}
                  type="button"
                  aria-pressed={isActive}
                  disabled={isSubmitting}
                  onClick={() => toggleChild(child)}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] py-1.5 pr-3.5 pl-1.5 text-[14px] font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
                    isActive
                      ? "border-ink bg-ink text-white"
                      : "border-border bg-paper text-nav-inactive"
                  }`}
                >
                  <span
                    className="flex size-[26px] flex-none items-center justify-center rounded-full font-display text-[13px] font-semibold"
                    style={{
                      backgroundColor: child.avatarBg,
                      color: child.avatarColor,
                    }}
                  >
                    {child.fullName.charAt(0)}
                  </span>
                  {child.firstName}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={isRoom}
              disabled={isSubmitting}
              onClick={selectRoom}
              className={`cursor-pointer rounded-full border-[1.5px] px-4 py-1.5 text-[14px] font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
                isRoom
                  ? "border-ink bg-ink text-white"
                  : "border-border bg-paper text-nav-inactive"
              }`}
            >
              Toda la sala
            </button>
          </div>
          {recipients.length === 0 ? (
            <p className="mt-2.5 text-[12.5px] text-muted">
              No hay niños activos para etiquetar.
            </p>
          ) : null}
          {recipientError ? (
            <p
              role="alert"
              className="mt-2.5 text-[12.5px] font-semibold text-danger"
            >
              {recipientError}
            </p>
          ) : null}
          {selectionError ? (
            <p
              role="alert"
              className="mt-2.5 text-[12.5px] font-semibold text-danger"
            >
              {selectionError}
            </p>
          ) : null}
        </div>

        <div
          role="group"
          aria-labelledby="post-type-label"
          className={groupClass}
        >
          <div id="post-type-label" className={labelClass}>
            TIPO
          </div>
          <div className="flex flex-wrap gap-[9px]">
            {POST_TYPE_ORDER.map((type) => {
              const style = POST_TYPES[type];
              const isActive = kind === type;

              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={isActive}
                  disabled={isSubmitting}
                  onClick={() => setKind(type)}
                  className={`cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60 ${
                    isActive ? style.active : style.inactive
                  }`}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={groupClass}>
          <label htmlFor="post-description" className={`block ${labelClass}`}>
            DESCRIPCIÓN
          </label>
          <textarea
            id="post-description"
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              if (descriptionError) {
                setDescriptionError("");
              }
            }}
            disabled={isSubmitting}
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="Contá cómo le fue hoy…"
            aria-invalid={Boolean(descriptionError)}
            aria-describedby={
              descriptionError ? "post-description-error" : undefined
            }
            className="min-h-[120px] w-full resize-y rounded-[14px] border-[1.5px] border-field-border bg-white px-4 py-3.5 text-[15px] leading-[1.5] text-ink placeholder:text-field-placeholder focus:border-field-focus focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          {descriptionError && (
            <p
              id="post-description-error"
              className="mt-1.5 text-[12.5px] font-semibold text-danger"
            >
              {descriptionError}
            </p>
          )}
        </div>

        <div role="group" aria-labelledby="post-photos-label">
          <div id="post-photos-label" className={labelClass}>
            FOTOS
          </div>
          <div className="flex flex-wrap gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative size-24 overflow-hidden rounded-[14px] border border-border bg-photo-bg"
              >
                <Image
                  src={photo.previewUrl}
                  alt={`Foto ${index + 1} para la publicación`}
                  fill
                  unoptimized
                  className="object-cover"
                />
                <button
                  type="button"
                  aria-label={`Quitar foto ${index + 1}`}
                  onClick={() => removePhoto(photo.id)}
                  disabled={isSubmitting}
                  className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CloseIcon width={14} height={14} strokeWidth={2.4} />
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS ? (
              photosBlocked ? (
                <div
                  aria-disabled="true"
                  className="flex size-24 flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-photo-dashed bg-photo-bg text-[12px] text-photo-fg opacity-60"
                >
                  <PlusIcon className="text-coral-deep" width={22} height={22} />
                  Agregar
                </div>
              ) : (
                <>
                  <label
                    htmlFor="post-photos"
                    className={`flex size-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-photo-dashed bg-photo-bg text-[12px] text-photo-fg ${
                      isSubmitting || isProcessingPhotos
                        ? "pointer-events-none opacity-60"
                        : ""
                    }`}
                  >
                    <PlusIcon
                      className="text-coral-deep"
                      width={22}
                      height={22}
                    />
                    {isProcessingPhotos ? "Procesando…" : "Agregar"}
                  </label>
                  <input
                    id="post-photos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelection}
                    disabled={isSubmitting || isProcessingPhotos}
                    className="sr-only"
                  />
                </>
              )
            ) : null}
          </div>
          {photosBlocked && photoBlockedMessage ? (
            <p
              role="alert"
              className="mt-2.5 text-[12.5px] font-semibold text-danger"
            >
              {photoBlockedMessage}
            </p>
          ) : null}
          {photoError ? (
            <p
              role="alert"
              className="mt-2.5 text-[12.5px] font-semibold text-danger"
            >
              {photoError}
            </p>
          ) : null}
          {hasTooManyPhotos ? (
            <p className="mt-2.5 text-[12.5px] font-semibold text-danger">
              Podés adjuntar hasta 4 fotos
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
